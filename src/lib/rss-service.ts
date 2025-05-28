
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
  { name: "Bing News (via RSSHub)", rssUrl: "https://rsshub.app/bing/news", defaultCategory: "Global News" },
  { name: "The Guardian - World", rssUrl: "https://www.theguardian.com/international/rss", defaultCategory: "World News" },
  { name: "The Guardian - Business", rssUrl: "https://www.theguardian.com/uk/business/rss", defaultCategory: "Business" },
  { name: "Flipboard - Tech", rssUrl: "https://flipboard.com/@flipboard/tech.rss", defaultCategory: "Technology" },
  { name: "Reddit - World News", rssUrl: "https://www.reddit.com/r/worldnews/.rss", defaultCategory: "World News" },
];

const parser = new Parser({ explicitArray: false, ignoreAttrs: false, mergeAttrs: true });

function extractImageUrl(item: any, categoryHint: string = 'news'): string | null {
  let imageUrl = null;

  // Reddit specific: media:thumbnail
  if (item['media:thumbnail'] && item['media:thumbnail'].url) {
    imageUrl = item['media:thumbnail'].url;
  }

  // Prioritize media:content with medium="image" or type starting with "image/"
  if (!imageUrl && item['media:group'] && item['media:group']['media:content']) {
    const mediaContents = Array.isArray(item['media:group']['media:content']) ? item['media:group']['media:content'] : [item['media:group']['media:content']];
    for (const content of mediaContents) {
      if (content.url && (content.medium === 'image' || (content.type && content.type.startsWith('image/')))) {
        imageUrl = content.url;
        break;
      }
    }
  }
  if (!imageUrl && item['media:content']) {
    const mediaContents = Array.isArray(item['media:content']) ? item['media:content'] : [item['media:content']];
    for (const content of mediaContents) {
       if (content.url && (content.medium === 'image' || (content.type && content.type.startsWith('image/')))) {
        imageUrl = content.url;
        break;
       }
    }
  }
  // Check media:thumbnail again (general case, if not caught by Reddit specific)
  if (!imageUrl && item['media:thumbnail'] && item['media:thumbnail'].url) {
    imageUrl = item['media:thumbnail'].url;
  }
  // Check enclosure
  if (!imageUrl && item.enclosure && item.enclosure.url && item.enclosure.type && item.enclosure.type.startsWith('image/')) {
    imageUrl = item.enclosure.url;
  }
  // For Google News specific structure (less common now with current feeds)
  if (!imageUrl && item['g-img'] && item['g-img'].img && item['g-img'].img.src) {
    imageUrl = item['g-img'].img.src;
  }
  // Look for image in description (basic attempt, might be unreliable)
  if (!imageUrl && item.description && typeof item.description === 'string') {
    const imgMatch = item.description.match(/<img[^>]+src="([^">]+)"/);
    if (imgMatch && imgMatch[1]) {
      imageUrl = imgMatch[1];
    }
  }
   // Look for image in content (Reddit often has it here)
  if (!imageUrl && item.content && typeof item.content === 'string') {
    const imgMatch = item.content.match(/<img[^>]+src="([^">]+)"/);
    if (imgMatch && imgMatch[1]) {
      imageUrl = imgMatch[1];
    }
  }
  if (!imageUrl && item.content && item.content._ && typeof item.content._ === 'string') { // For Reddit's content casing
    const imgMatch = item.content._.match(/<img[^>]+src="([^">]+)"/);
    if (imgMatch && imgMatch[1]) {
      imageUrl = imgMatch[1];
    }
  }


  // If an image URL is found, ensure it's a full URL
  if (imageUrl && typeof imageUrl === 'string') {
    if (imageUrl.startsWith('//')) {
      return `https:${imageUrl}`;
    }
    if (imageUrl.startsWith('/')) { // Relative URL, less ideal for cross-source aggregation
        // We can't resolve this without knowing the base URL of the original item's site.
        // Best to return null and let placeholder be used.
        return null;
    }
    return imageUrl.trim(); // Trim any whitespace
  }

  return null; // Return null if no valid image found, placeholder will be used by component
}

function normalizeContent(contentInput: any): string {
  let text = '';
  if (typeof contentInput === 'string') {
    text = contentInput;
  } else if (contentInput && typeof contentInput._ === 'string') {
    text = contentInput._;
  } else if (contentInput && contentInput['#name'] === '__cdata') {
    text = contentInput['#text'];
  } else if (contentInput && contentInput['#text']) {
    text = contentInput['#text'];
  } else if (contentInput && contentInput['#']) {
     text = contentInput['#'];
  }
  // Handle Reddit's HTML content if it's wrapped in an object
  else if (typeof contentInput === 'object' && contentInput.hasOwnProperty('_')) {
    text = String(contentInput._);
  }
  return text.trim();
}

function normalizeSummary(description: any, fullContent?: string): string {
  let text = normalizeContent(description);
  if (!text && fullContent) { // if description is empty, try to make summary from fullContent
    text = fullContent;
  }
  // Strip HTML tags for a plain text summary, limit length
  const plainText = text.replace(/<[^>]+>/g, '').replace(/\[link\]|\[comments\]/gi, '').replace(/\s+/g, ' ').trim(); // Remove reddit specific tags
  return plainText.substring(0, 250) + (plainText.length > 250 ? '...' : '');
}


async function fetchAndParseRSS(source: NewsSource): Promise<Article[]> {
  try {
    const response = await fetch(source.rssUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' },
      next: { revalidate: 300 } // 5 min revalidation
    });
    if (!response.ok) {
      console.error(`Failed to fetch RSS from ${source.name} (${source.rssUrl}): ${response.status} ${response.statusText}`);
      return [];
    }
    const xmlText = await response.text();
    const result = await parser.parseStringPromise(xmlText);

    let items = getNestedValue(result, 'rss.channel.item', []);
    if (!items || (Array.isArray(items) && items.length === 0)) { // Atom feeds or empty array
      items = getNestedValue(result, 'feed.entry', []); // Common for Atom, used by Reddit
    }

    if (!Array.isArray(items)) {
      items = items ? [items] : []; // Handle single item case
    }

    if (items.length === 0) {
      console.warn(`No items found for ${source.name}. Feed structure might be different or empty. Parsed result:`, JSON.stringify(result, null, 2).substring(0, 500));
      return [];
    }

    return items.map((item: any, index: number) => {
      const title = normalizeContent(getNestedValue(item, 'title', 'Untitled Article'));

      let originalLink = getNestedValue(item, 'link.href', getNestedValue(item, 'link', '#'));
      if (Array.isArray(originalLink)) {
        const altLink = originalLink.find(l => typeof l === 'object' && l.rel === 'alternate' && l.href);
        const firstLink = originalLink.find(l => typeof l === 'string' || (typeof l === 'object' && l.href));
        originalLink = altLink ? altLink.href : (typeof firstLink === 'object' ? firstLink.href : firstLink);
      } else if (typeof originalLink === 'object' && originalLink?.href) {
        originalLink = originalLink.href;
      }
      originalLink = typeof originalLink === 'string' ? originalLink.trim() : '#';
      // For Reddit, sometimes the link is in a content string: "submitted by ... <a href="[URL]">...</a>"
      if (originalLink === '#' && item.content && item.content._) {
          const linkMatch = item.content._.match(/<a href="([^"]+)">\[link\]<\/a>/);
          if (linkMatch && linkMatch[1]) {
              originalLink = linkMatch[1];
          }
      }


      const pubDateSource = getNestedValue(item, 'pubDate') || getNestedValue(item, 'published') || getNestedValue(item, 'updated') || getNestedValue(item, 'dc:date');
      const date = pubDateSource ? new Date(pubDateSource).toISOString() : new Date().toISOString();

      let guidValue = normalizeContent(getNestedValue(item, 'guid', getNestedValue(item, 'id')));
      if (typeof getNestedValue(item, 'guid') === 'object' && getNestedValue(item, 'guid').isPermaLink === 'false') {
        guidValue = originalLink;
      } else if (typeof getNestedValue(item, 'id') === 'object' || (typeof getNestedValue(item, 'id') === 'string' && getNestedValue(item, 'id').startsWith('tag:'))) { // For Atom feeds where id is an object or a tag URI
        guidValue = normalizeContent(getNestedValue(item, 'id'));
      }

      const idInput = (typeof guidValue === 'string' && guidValue.trim() !== '' && guidValue.trim() !== '#') ? guidValue : (originalLink + date + source.name + index);
      const id = slugify(idInput.substring(0,100));

      let categoryFromFeed = getNestedValue(item, 'category', source.defaultCategory || 'General');
      if (Array.isArray(categoryFromFeed)) {
          const firstCat = categoryFromFeed[0];
          if (typeof firstCat === 'object') {
            categoryFromFeed = firstCat.term || firstCat._ || firstCat['#text'] || firstCat.label;
          } else {
            categoryFromFeed = firstCat;
          }
      } else if (typeof categoryFromFeed === 'object') {
          categoryFromFeed = categoryFromFeed.term || categoryFromFeed._ || categoryFromFeed['#text'] || categoryFromFeed.label;
      }
      const finalCategory = typeof categoryFromFeed === 'string' ? categoryFromFeed.trim() : (source.defaultCategory || 'General');

      const imageUrl = extractImageUrl(item, finalCategory);

      const rawContent = normalizeContent(getNestedValue(item, 'content:encoded') || getNestedValue(item, 'content') || getNestedValue(item, 'description') || getNestedValue(item, 'summary'));
      const summaryText = normalizeSummary(getNestedValue(item, 'description') || getNestedValue(item, 'summary') || (item.content && item.content._), rawContent);


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

  // De-duplicate articles based on title and source link (more robust)
  const uniqueArticlesMap = new Map<string, Article>();
  for (const article of allArticles) {
    // Normalize title for better deduplication (lowercase, first 50 chars)
    const normalizedTitleKey = article.title.toLowerCase().substring(0, 50).trim();
    // Normalize source link (remove query params and trailing slash for better matching)
    let normalizedLinkKey = article.sourceLink;
    try {
      const url = new URL(article.sourceLink);
      normalizedLinkKey = `${url.hostname}${url.pathname}`.replace(/\/$/, ''); // remove trailing slash
    } catch (e) {
      // if not a valid URL, use as is
    }

    const uniqueKey = `${normalizedTitleKey}|${normalizedLinkKey}`;
    if (!uniqueArticlesMap.has(uniqueKey)) {
      uniqueArticlesMap.set(uniqueKey, article);
    }
  }
  allArticles = Array.from(uniqueArticlesMap.values());

  // Sort by date (newest first)
  allArticles.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());


  return allArticles.slice(0, 100); // Limit to 100 most recent unique articles
}
