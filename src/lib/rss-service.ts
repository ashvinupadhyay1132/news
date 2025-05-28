
// @ts-nocheck
// Disabling TypeScript checks for this file due to the dynamic nature of RSS feed structures
// and the use of xml2js which can lead to complex type definitions.
'use server';

import { Parser } from 'xml2js';
import type { Article } from './placeholder-data';
import { slugify, getNestedValue } from './utils';

interface NewsSource {
  name: string;
  rssUrl: string;
  defaultCategory?: string;
}

const NEWS_SOURCES: NewsSource[] = [
  { name: "RSSHub - Bing News", rssUrl: "https://rsshub.app/bing/news", defaultCategory: "Global News" },
  { name: "The Guardian - World", rssUrl: "https://www.theguardian.com/international/rss", defaultCategory: "World News" },
  { name: "The Guardian - Business", rssUrl: "https://www.theguardian.com/uk/business/rss", defaultCategory: "Business" },
  { name: "Flipboard - Tech", rssUrl: "https://flipboard.com/@flipboard/tech.rss", defaultCategory: "Technology" },
  { name: "Reddit - World News", rssUrl: "https://www.reddit.com/r/worldnews/.rss", defaultCategory: "World News" },
];

const parser = new Parser({ explicitArray: false, ignoreAttrs: false, mergeAttrs: true });

function extractImageUrl(item: any, categoryHint: string = 'news'): string | null {
  let imageUrl = null;

  // Priority 1: media:group containing media:content (often more structured)
  if (item['media:group'] && item['media:group']['media:content']) {
    const mediaContents = Array.isArray(item['media:group']['media:content'])
      ? item['media:group']['media:content']
      : [item['media:group']['media:content']];
    for (const content of mediaContents) {
      if (content && content.url && (content.medium === 'image' || (content.type && String(content.type).startsWith('image/')))) {
        imageUrl = content.url;
        break;
      }
    }
  }

  // Priority 2: Direct media:content (common in many feeds, including The Guardian)
  if (!imageUrl && item['media:content']) {
    const mediaContents = Array.isArray(item['media:content']) ? item['media:content'] : [item['media:content']];
    for (const content of mediaContents) {
      if (content && content.url && (content.medium === 'image' || (content.type && String(content.type).startsWith('image/')))) {
        imageUrl = content.url;
        break;
      }
    }
  }

  // Priority 3: media:thumbnail (often a fallback or primary in feeds like Reddit)
  if (!imageUrl && item['media:thumbnail'] && item['media:thumbnail'].url) {
    imageUrl = item['media:thumbnail'].url;
  }

  // Priority 4: Enclosure (standard RSS way for media)
  if (!imageUrl && item.enclosure && item.enclosure.url && item.enclosure.type && String(item.enclosure.type).startsWith('image/')) {
    imageUrl = item.enclosure.url;
  }

  // Priority 5: Google News specific (less common with current feeds but good to have)
  if (!imageUrl && item['g-img'] && item['g-img'].img && item['g-img'].img.src) {
    imageUrl = item['g-img'].img.src;
  }

  // Last Resort: Look for image in HTML content (description or content field)
  // This is less reliable and more prone to errors.
  if (!imageUrl) {
    const contentFields = [
      getNestedValue(item, 'description'),
      getNestedValue(item, 'content'),
      getNestedValue(item, 'content._') // For Reddit's content casing
    ];
    for (const field of contentFields) {
      if (field && typeof field === 'string') {
        const imgMatch = field.match(/<img[^>]+src="([^">]+)"/);
        if (imgMatch && imgMatch[1]) {
          imageUrl = imgMatch[1];
          break;
        }
      }
    }
  }

  // Clean up and validate the extracted URL
  if (imageUrl && typeof imageUrl === 'string') {
    imageUrl = imageUrl.trim();
    if (imageUrl.startsWith('//')) {
      return `https:${imageUrl}`;
    }
    if (imageUrl.startsWith('/')) { // Relative URL, can't be resolved reliably across different sources
      return null;
    }
    // Basic check for common image extensions if no other type info was present
    if (!imageUrl.match(/\.(jpeg|jpg|gif|png|webp)(\?|$)/i)) {
        // If it doesn't look like an image URL and wasn't confirmed by type/medium, be cautious
        // However, some CDNs have URLs without extensions. For now, we'll allow if extracted by a specific tag.
    }
    return imageUrl;
  }

  return null; // Return null if no valid image found
}

function normalizeContent(contentInput: any): string {
  let text = '';
  if (typeof contentInput === 'string') {
    text = contentInput;
  } else if (contentInput && typeof contentInput._ === 'string') { // XML character content for elements with attributes
    text = contentInput._;
  } else if (contentInput && contentInput['#name'] === '__cdata' && contentInput['#text']) { // CDATA
     text = contentInput['#text'];
  } else if (contentInput && contentInput['#text']) { // Text node from xml2js
     text = contentInput['#text'];
  } else if (contentInput && contentInput['#']) { // Another possible text node structure
     text = contentInput['#'];
  } else if (Array.isArray(contentInput)) { // Handle cases where parsing results in an array of text segments
    text = contentInput.map(segment => normalizeContent(segment)).join(' ');
  } else if (typeof contentInput === 'object' && contentInput !== null) {
    // If it's an object, it might be a complex structure, try to get a string representation or a specific field
    // This part might need more specific handling based on observed feed structures
    text = String(getNestedValue(contentInput, 'content', getNestedValue(contentInput, 'description', '')));
  }
  return text.trim();
}

function normalizeSummary(descriptionInput: any, fullContentInput?: any): string {
  let text = '';
  const descriptionText = normalizeContent(descriptionInput);
  const fullContentText = normalizeContent(fullContentInput);

  if (descriptionText) {
    text = descriptionText;
  } else if (fullContentText) { // if description is empty, try to make summary from fullContent
    text = fullContentText;
  }
  
  // Strip HTML tags for a plain text summary, limit length
  const plainText = text.replace(/<[^>]+>/g, '').replace(/\[link\]|\[comments\]/gi, '').replace(/\s+/g, ' ').trim();
  if (!plainText && fullContentText) { // If stripping HTML from description resulted in empty, try full content
      const plainFullContent = fullContentText.replace(/<[^>]+>/g, '').replace(/\[link\]|\[comments\]/gi, '').replace(/\s+/g, ' ').trim();
      return plainFullContent.substring(0, 250) + (plainFullContent.length > 250 ? '...' : '');
  }
  return plainText.substring(0, 250) + (plainText.length > 250 ? '...' : '');
}


async function fetchAndParseRSS(source: NewsSource): Promise<Article[]> {
  try {
    const response = await fetch(source.rssUrl, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/rss+xml,application/xml' 
      },
      next: { revalidate: 300 } // 5 min revalidation
    });

    if (!response.ok) {
      console.error(`Failed to fetch RSS from ${source.name} (${source.rssUrl}): ${response.status} ${response.statusText}`);
      const errorBody = await response.text().catch(() => "Could not read error body");
      console.error("Error body:", errorBody.substring(0, 500));
      return [];
    }
    const xmlText = await response.text();
    const result = await parser.parseStringPromise(xmlText);

    let items = getNestedValue(result, 'rss.channel.item', []);
    if (!items || (Array.isArray(items) && items.length === 0)) {
      items = getNestedValue(result, 'feed.entry', []); // Common for Atom (e.g., Reddit)
    }
     if (!items || (Array.isArray(items) && items.length === 0)) { // For feeds that might have items directly under 'rdf:RDF' then 'item'
      items = getNestedValue(result, 'rdf:RDF.item', []);
    }


    if (!Array.isArray(items)) {
      items = items ? [items] : [];
    }

    if (items.length === 0) {
      console.warn(`No items found for ${source.name} (${source.rssUrl}). Feed structure might be different or empty. Parsed root keys:`, Object.keys(result || {}).join(', '));
      return [];
    }

    return items.map((item: any, index: number) => {
      const title = normalizeContent(getNestedValue(item, 'title', 'Untitled Article'));

      // Link extraction refinement
      let originalLink = '#';
      const linkField = getNestedValue(item, 'link');
      if (typeof linkField === 'string') {
        originalLink = linkField;
      } else if (typeof linkField === 'object' && linkField?.href) { // Atom link object
        originalLink = linkField.href;
      } else if (Array.isArray(linkField)) { // Array of link objects (Atom)
        const alternateLink = linkField.find(l => typeof l === 'object' && l.rel === 'alternate' && l.href);
        originalLink = alternateLink ? alternateLink.href : ( (typeof linkField[0] === 'object' && linkField[0]?.href) || (typeof linkField[0] === 'string' ? linkField[0] : '#') );
      }
      
      // Reddit specific link extraction from content
      if ((originalLink === '#' || source.name.includes("Reddit")) && item.content && (item.content._ || typeof item.content === 'string')) {
          const contentStr = item.content._ || item.content;
          const linkMatch = String(contentStr).match(/<a href="([^"]+)">\[link\]<\/a>/);
          if (linkMatch && linkMatch[1]) {
              originalLink = linkMatch[1];
          } else {
             const otherLinkMatch = String(contentStr).match(/<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/); // More general <a> tag
             if(otherLinkMatch && otherLinkMatch[2]) originalLink = otherLinkMatch[2];
          }
      }
      originalLink = typeof originalLink === 'string' ? originalLink.trim() : '#';


      const pubDateSource = getNestedValue(item, 'pubDate') || getNestedValue(item, 'published') || getNestedValue(item, 'updated') || getNestedValue(item, 'dc:date');
      const date = pubDateSource ? new Date(normalizeContent(pubDateSource)).toISOString() : new Date().toISOString();

      let guidValue = normalizeContent(getNestedValue(item, 'guid', getNestedValue(item, 'id')));
      if (typeof getNestedValue(item, 'guid') === 'object' && getNestedValue(item, 'guid').isPermaLink === 'false') {
        guidValue = originalLink; // Use link if GUID is not permalink
      } else if (typeof getNestedValue(item, 'id') === 'string' && getNestedValue(item, 'id').startsWith('tag:')) { // Atom IDs are often tag URIs
         guidValue = normalizeContent(getNestedValue(item, 'id'));
      } else if (guidValue === originalLink && originalLink.includes("reddit.com")) { // Reddit GUIDs can be just the link
         guidValue = normalizeContent(getNestedValue(item, 'id')) || originalLink; // Prefer atom id for reddit
      }


      const idInput = (typeof guidValue === 'string' && guidValue.trim() !== '' && guidValue.trim() !== '#') ? guidValue : (originalLink + source.name + index);
      const id = slugify(idInput.substring(0, Math.min(idInput.length, 75))); // Shorter, more robust IDs

      let categoryFromFeed = getNestedValue(item, 'category', source.defaultCategory || 'General');
      if (Array.isArray(categoryFromFeed)) {
          categoryFromFeed = categoryFromFeed.map(cat => {
            if (typeof cat === 'object') return cat.term || cat._ || cat['#text'] || cat.label;
            return cat;
          }).filter(Boolean).join(', ') || source.defaultCategory || 'General';
      } else if (typeof categoryFromFeed === 'object') {
          categoryFromFeed = categoryFromFeed.term || categoryFromFeed._ || categoryFromFeed['#text'] || categoryFromFeed.label;
      }
      const finalCategory = typeof categoryFromFeed === 'string' ? categoryFromFeed.trim().split(',')[0].trim() : (source.defaultCategory || 'General'); // Take first category if multiple

      const imageUrl = extractImageUrl(item, finalCategory);

      const rawContent = normalizeContent(getNestedValue(item, 'content:encoded') || getNestedValue(item, 'content') || getNestedValue(item, 'description') || getNestedValue(item, 'summary'));
      const summaryText = normalizeSummary(getNestedValue(item, 'description') || getNestedValue(item, 'summary'), rawContent);

      const internalArticleLink = `/${slugify(finalCategory)}/${id}`;

      return {
        id,
        title,
        summary: summaryText,
        date,
        source: source.name,
        category: finalCategory,
        imageUrl: imageUrl,
        link: internalArticleLink,
        sourceLink: originalLink,
        content: rawContent || summaryText,
      };
    }).filter(article => article.title && article.title !== 'Untitled Article' && !article.title.includes("reddit.com Store") && article.sourceLink && article.sourceLink !== '#');
  } catch (error) {
    console.error(`Error processing RSS feed for ${source.name} (${source.rssUrl}):`, error);
    return [];
  }
}

export async function fetchArticlesFromAllSources(): Promise<Article[]> {
  const allArticlesPromises = NEWS_SOURCES.map(source => fetchAndParseRSS(source));
  const results = await Promise.all(allArticlesPromises);

  let allArticles: Article[] = results.flat();

  // De-duplicate articles
  const uniqueArticlesMap = new Map<string, Article>();
  for (const article of allArticles) {
    let normalizedTitleKey = article.title.toLowerCase().replace(/\s+/g, ' ').substring(0, 80).trim();
    let normalizedLinkKey = article.sourceLink;
    try {
      const url = new URL(article.sourceLink);
      normalizedLinkKey = `${url.hostname}${url.pathname}`.replace(/\/$/, '').toLowerCase();
    } catch (e) {/* use as is if not valid URL */}

    const uniqueKey = `${normalizedTitleKey}|${normalizedLinkKey}`;
    
    if (!uniqueArticlesMap.has(uniqueKey) || 
        (uniqueArticlesMap.has(uniqueKey) && (article.content?.length || 0) > (uniqueArticlesMap.get(uniqueKey)?.content?.length || 0))) {
      // Prefer article with more content if a duplicate is found
      uniqueArticlesMap.set(uniqueKey, article);
    }
  }
  allArticles = Array.from(uniqueArticlesMap.values());

  allArticles.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return allArticles.slice(0, 100); // Limit to 100 most recent unique articles
}
