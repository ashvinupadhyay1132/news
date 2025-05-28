
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
  { name: "BBC News", rssUrl: "https://feeds.bbci.co.uk/news/rss.xml", defaultCategory: "World News" },
  { name: "NDTV (India)", rssUrl: "https://feeds.feedburner.com/ndtvnews-top-stories", defaultCategory: "India News" },
  { name: "Google News", rssUrl: "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en", defaultCategory: "Global News" },
];

const parser = new Parser({ explicitArray: false, ignoreAttrs: false, mergeAttrs: true });

function extractImageUrl(item: any, categoryHint: string = 'news'): string | null {
  let imageUrl = null;
  // Prioritize media:content with medium="image" or type starting with "image/"
  if (item['media:group'] && item['media:group']['media:content']) {
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
  // Check media:thumbnail
  if (!imageUrl && item['media:thumbnail'] && item['media:thumbnail'].url) {
    imageUrl = item['media:thumbnail'].url;
  }
  // Check enclosure
  if (!imageUrl && item.enclosure && item.enclosure.url && item.enclosure.type && item.enclosure.type.startsWith('image/')) {
    imageUrl = item.enclosure.url;
  }
  // For Google News specific structure (less common now)
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
    return imageUrl;
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
  } else if (contentInput && contentInput['#']) { 
     text = contentInput['#'];
  }
  return text.trim();
}

function normalizeSummary(description: any, fullContent?: string): string {
  let text = normalizeContent(description);
  if (!text && fullContent) { // if description is empty, try to make summary from fullContent
    text = fullContent;
  }
  // Strip HTML tags for a plain text summary, limit length
  return text.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().substring(0, 250) + (text.length > 250 ? '...' : '');
}


async function fetchAndParseRSS(source: NewsSource): Promise<Article[]> {
  try {
    const response = await fetch(source.rssUrl, { 
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }, // Common bot user agent
      next: { revalidate: 300 } // 5 min revalidation
    });
    if (!response.ok) {
      console.error(`Failed to fetch RSS from ${source.name} (${source.rssUrl}): ${response.status} ${response.statusText}`);
      return [];
    }
    const xmlText = await response.text();
    const result = await parser.parseStringPromise(xmlText);
    
    let items = getNestedValue(result, 'rss.channel.item', []);
    if (!items || items.length === 0) { // Atom feeds
      items = getNestedValue(result, 'feed.entry', []);
    }

    if (!Array.isArray(items)) {
      // Handle case where 'items' might be a single object if only one item in feed
      items = items ? [items] : [];
    }
    
    if (items.length === 0) {
      console.warn(`No items found for ${source.name}. Feed structure might be different or empty.`);
      return [];
    }

    return items.map((item: any, index: number) => {
      const title = normalizeContent(getNestedValue(item, 'title', 'Untitled Article'));
      
      let originalLink = getNestedValue(item, 'link.href', getNestedValue(item, 'link', '#'));
      if (Array.isArray(originalLink)) { // Handle multiple link tags, prefer alternate or first
        const altLink = originalLink.find(l => l.rel === 'alternate' && l.href);
        originalLink = altLink ? altLink.href : originalLink[0]?.href;
      } else if (typeof originalLink === 'object' && originalLink?.href) { 
        originalLink = originalLink.href;
      }
      originalLink = typeof originalLink === 'string' ? originalLink : '#';


      const pubDateSource = getNestedValue(item, 'pubDate') || getNestedValue(item, 'published') || getNestedValue(item, 'updated') || getNestedValue(item, 'dc:date');
      const date = pubDateSource ? new Date(pubDateSource).toISOString() : new Date().toISOString();
      
      let guidValue = normalizeContent(getNestedValue(item, 'guid', getNestedValue(item, 'id')));
      if (typeof getNestedValue(item, 'guid') === 'object' && getNestedValue(item, 'guid').isPermaLink === 'false') { 
        guidValue = originalLink;
      }

      const idInput = (typeof guidValue === 'string' && guidValue.trim() !== '') ? guidValue : (originalLink + date + source.name + index);
      const id = slugify(idInput.substring(0,100)); // Slugify a potentially shorter string for ID

      let categoryFromFeed = getNestedValue(item, 'category', source.defaultCategory || 'General');
      if (Array.isArray(categoryFromFeed)) { // Multiple categories, pick first
          categoryFromFeed = typeof categoryFromFeed[0] === 'object' ? categoryFromFeed[0].term || categoryFromFeed[0]['#text'] || categoryFromFeed[0]._ : categoryFromFeed[0];
      } else if (typeof categoryFromFeed === 'object') { // Single category object
          categoryFromFeed = categoryFromFeed.term || categoryFromFeed['#text'] || categoryFromFeed._;
      }
      const finalCategory = typeof categoryFromFeed === 'string' ? categoryFromFeed.trim() : (source.defaultCategory || 'General');
      
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
        imageUrl: imageUrl, // Can be null
        link: internalArticleLink, 
        sourceLink: originalLink,  
        content: rawContent || summaryText, // Provide rawContent if available, else summary
      };
    }).filter(article => article.title && article.title !== 'Untitled Article' && article.sourceLink && article.sourceLink !== '#');
  } catch (error) {
    console.error(`Error processing RSS feed for ${source.name} (${source.rssUrl}):`, error);
    return [];
  }
}

export async function fetchArticlesFromAllSources(): Promise<Article[]> {
  const allArticlesPromises = NEWS_SOURCES.map(source => fetchAndParseRSS(source));
  const results = await Promise.all(allArticlesPromises);
  
  const allArticles: Article[] = results.flat();

  allArticles.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const uniqueArticlesMap = new Map<string, Article>();
  for (const article of allArticles) {
    // Use a combination of title and sourceLink for uniqueness, or just sourceLink if title is very generic
    const uniqueKey = (article.title.length > 20 ? article.title : '') + article.sourceLink;
    if (!uniqueArticlesMap.has(uniqueKey)) {
      uniqueArticlesMap.set(uniqueKey, article);
    }
  }
  
  return Array.from(uniqueArticlesMap.values()).slice(0, 100); // Limit to latest 100 unique articles
}
