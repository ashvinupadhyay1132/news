
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
  defaultCategory?: string; // Optional: if feed items don't have categories
}

// Refined list of NEWS_SOURCES
const NEWS_SOURCES: NewsSource[] = [
  { name: "BBC News", rssUrl: "https://feeds.bbci.co.uk/news/rss.xml", defaultCategory: "World News" },
  { name: "NDTV (India)", rssUrl: "https://feeds.feedburner.com/ndtvnews-top-stories", defaultCategory: "India News" },
  { name: "Google News", rssUrl: "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en", defaultCategory: "Global News" },
  // Removed other feeds to focus on these three for reliability and coverage
];

const parser = new Parser({ explicitArray: false, ignoreAttrs: false, mergeAttrs: true });

function extractImageUrl(item: any, categoryHint: string = 'news'): string {
  // Try various common RSS/Media RSS tags for images.
  // Prioritize media:content with medium="image"
  if (item['media:group'] && item['media:group']['media:content']) {
    const mediaContents = Array.isArray(item['media:group']['media:content']) ? item['media:group']['media:content'] : [item['media:group']['media:content']];
    for (const content of mediaContents) {
      if (content.url && (content.medium === 'image' || (content.type && content.type.startsWith('image/')))) return content.url;
    }
  }
  if (item['media:content']) {
    const mediaContents = Array.isArray(item['media:content']) ? item['media:content'] : [item['media:content']];
    for (const content of mediaContents) {
       if (content.url && (content.medium === 'image' || (content.type && content.type.startsWith('image/')))) return content.url;
    }
  }
  if (item['media:thumbnail'] && item['media:thumbnail'].url) {
    return item['media:thumbnail'].url;
  }
  if (item.enclosure && item.enclosure.url && item.enclosure.type && item.enclosure.type.startsWith('image/')) {
    return item.enclosure.url;
  }
  // For Google News specific structure, if still used by some items (often they use media:content now)
  if (item['g-img'] && item['g-img'].img && item['g-img'].img.src) {
    return item['g-img'].img.src;
  }
  // Look for image in description (basic attempt, might be unreliable)
  if (item.description && typeof item.description === 'string') {
    const imgMatch = item.description.match(/<img[^>]+src="([^">]+)"/);
    if (imgMatch && imgMatch[1]) {
      return imgMatch[1];
    }
  }
  // Fallback placeholder with data-ai-hint
  const hint = slugify(categoryHint) || "news article";
  return `https://placehold.co/600x400.png`; 
}

function normalizeDescription(description: any): string {
  let text = 'No summary available.';
  if (typeof description === 'string') {
    text = description;
  } else if (description && typeof description._ === 'string') { // Handle CDATA
    text = description._;
  } else if (description && description['#name'] === '__cdata') { // Check for xml2js cdata structure
    text = description['#text'];
  } else if (description && description['#']) { // Another CDATA pattern
     text = description['#'];
  }
  
  // Strip HTML tags for a plain text summary, limit length
  return text.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().substring(0, 250) + (text.length > 250 ? '...' : '');
}


async function fetchAndParseRSS(source: NewsSource): Promise<Article[]> {
  try {
    const response = await fetch(source.rssUrl, { 
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' },
      next: { revalidate: 300 } // 5 min revalidation
    });
    if (!response.ok) {
      console.error(`Failed to fetch RSS from ${source.name} (${source.rssUrl}): ${response.status} ${response.statusText}`);
      return [];
    }
    const xmlText = await response.text();
    const result = await parser.parseStringPromise(xmlText);
    
    let items = getNestedValue(result, 'rss.channel.item', []);
    // Atom feeds have a different structure
    if (!items || items.length === 0) {
      items = getNestedValue(result, 'feed.entry', []);
    }


    if (!Array.isArray(items)) {
      console.warn(`No items array found for ${source.name}, or items is not an array. Feed structure might be different.`);
      return [];
    }

    return items.map((item: any, index: number) => {
      const title = getNestedValue(item, 'title._', getNestedValue(item, 'title', 'Untitled Article')).trim();
      
      let originalLink = getNestedValue(item, 'link.href', getNestedValue(item, 'link', '#'));
      if (typeof originalLink !== 'string' && Array.isArray(originalLink)) { // Handle multiple link tags, prefer alternate
        const altLink = originalLink.find(l => l.rel === 'alternate');
        originalLink = altLink ? altLink.href : originalLink[0].href;
      } else if (typeof originalLink !== 'string' && originalLink?.href) { // Handle link object
        originalLink = originalLink.href;
      }


      const pubDateSource = getNestedValue(item, 'pubDate') || getNestedValue(item, 'published') || getNestedValue(item, 'updated') || getNestedValue(item, 'dc:date');
      const date = pubDateSource ? new Date(pubDateSource).toISOString() : new Date().toISOString();
      
      let guidValue = getNestedValue(item, 'guid._', getNestedValue(item, 'guid', getNestedValue(item, 'id')));
      if (typeof guidValue === 'object' && guidValue.isPermaLink === 'false') { // If guid is not a permalink, prefer the actual link
        guidValue = originalLink;
      } else if (typeof guidValue === 'object' && guidValue._) {
        guidValue = guidValue._;
      }

      const idInput = (typeof guidValue === 'string' && guidValue.trim() !== '') ? guidValue : (originalLink + date + source.name + index);
      const id = slugify(idInput);

      let categoryFromFeed = getNestedValue(item, 'category', source.defaultCategory || 'General News');
      if (typeof categoryFromFeed === 'object' && categoryFromFeed.term) { // Atom feed category
        categoryFromFeed = categoryFromFeed.term;
      }
      const category = Array.isArray(categoryFromFeed) ? categoryFromFeed[0] : categoryFromFeed;
      const finalCategory = typeof category === 'string' ? category.trim() : (source.defaultCategory || 'General News');
      
      const imageUrl = extractImageUrl(item, finalCategory);
      
      // For content, try content:encoded, then description, then summary
      let fullContent = getNestedValue(item, 'content:encoded') || getNestedValue(item, 'description') || getNestedValue(item, 'summary') || getNestedValue(item, 'content._') || getNestedValue(item, 'content.#text');
      if(typeof fullContent !== 'string' && fullContent && fullContent._) fullContent = fullContent._; // handle CDATA
      if(typeof fullContent !== 'string' && fullContent && fullContent['#text']) fullContent = fullContent['#text']; // handle another CDATA variant

      const summary = normalizeDescription(fullContent || item.description || item.summary || getNestedValue(item, 'content'));


      const internalArticleLink = `/${slugify(finalCategory)}/${id}`;

      return {
        id,
        title,
        summary,
        date,
        source: source.name,
        category: finalCategory,
        imageUrl,
        link: internalArticleLink, 
        sourceLink: originalLink,  
        content: typeof fullContent === 'string' ? fullContent : summary,
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
  
  const uniqueArticles = allArticles.reduce((acc, current) => {
    const x = acc.find(item => item.title === current.title && item.sourceLink === current.sourceLink);
    if (!x) {
      return acc.concat([current]);
    } else {
      return acc;
    }
  }, [] as Article[]);
  
  return uniqueArticles.slice(0, 100); // Limit to latest 100 unique articles
}
