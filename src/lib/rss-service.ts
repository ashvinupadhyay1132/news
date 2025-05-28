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

const NEWS_SOURCES: NewsSource[] = [
  { name: "BBC News", rssUrl: "https://feeds.bbci.co.uk/news/rss.xml", defaultCategory: "World News" },
  { name: "CNN", rssUrl: "https://rss.cnn.com/rss/edition.rss", defaultCategory: "World News" },
  { name: "Reuters", rssUrl: "http://feeds.reuters.com/reuters/UKBusinessNews", defaultCategory: "Business" }, // Using a more specific feed
  // { name: "New York Times", rssUrl: "https://www.nytimes.com/rss", defaultCategory: "World News" }, // NYT RSS often requires specific section feeds or auth
  { name: "Google News", rssUrl: "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en", defaultCategory: "General News" },
  { name: "The Guardian", rssUrl: "https://www.theguardian.com/international/rss", defaultCategory: "World News" },
  { name: "CNBC", rssUrl: "https://www.cnbc.com/id/100003114/device/rss/rss.html", defaultCategory: "Business" },
  { name: "NDTV (India)", rssUrl: "https://feeds.feedburner.com/ndtvnews-top-stories", defaultCategory: "India News" },
];

const parser = new Parser({ explicitArray: false, ignoreAttrs: false, mergeAttrs: true });

function extractImageUrl(item: any): string {
  // This function tries various common RSS/Media RSS tags for images.
  // Feed structures vary greatly, so this might need adjustments per source if images are consistently missing.
  // Prioritize media:content with medium="image"
  if (item['media:group'] && item['media:group']['media:content']) {
    const mediaContents = Array.isArray(item['media:group']['media:content']) ? item['media:group']['media:content'] : [item['media:group']['media:content']];
    for (const content of mediaContents) {
      if (content.medium === 'image' && content.url) return content.url;
    }
  }
  if (item['media:content']) {
    const mediaContents = Array.isArray(item['media:content']) ? item['media:content'] : [item['media:content']];
    for (const content of mediaContents) {
      if (content.medium === 'image' && content.url) return content.url;
    }
  }
  if (item['media:thumbnail'] && item['media:thumbnail']['url']) {
    return item['media:thumbnail']['url'];
  }
  if (item.enclosure && item.enclosure.url && item.enclosure.type && item.enclosure.type.startsWith('image/')) {
    return item.enclosure.url;
  }
  // For specific sources like Google News, check for 'g-img > img > src'
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
  return `https://placehold.co/600x400.png`; // Fallback placeholder
}

function normalizeDescription(description: any): string {
  let text = 'No summary available.';
  if (typeof description === 'string') {
    text = description;
  } else if (description && typeof description._ === 'string') { // Handle CDATA
    text = description._;
  } else if (description && description['#']) { // Another CDATA pattern
    text = description['#'];
  }
  // Strip HTML tags for a plain text summary, limit length
  return text.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().substring(0, 250) + (text.length > 250 ? '...' : '');
}


async function fetchAndParseRSS(source: NewsSource): Promise<Article[]> {
  try {
    const response = await fetch(source.rssUrl, { 
      headers: { 'User-Agent': 'TrendingNewsFeedApp/1.0 (Mozilla/5.0 compatible)' }, // More common User-Agent
      next: { revalidate: 300 } // 5 min revalidation
    });
    if (!response.ok) {
      console.error(`Failed to fetch RSS from ${source.name} (${source.rssUrl}): ${response.status}`);
      return [];
    }
    const xmlText = await response.text();
    const result = await parser.parseStringPromise(xmlText);
    
    const items = getNestedValue(result, 'rss.channel.item', []);
    if (!Array.isArray(items)) {
      console.warn(`No items array found for ${source.name}, or items is not an array. Feed structure might be different.`);
      return [];
    }

    return items.map((item: any, index: number) => {
      const title = getNestedValue(item, 'title', 'Untitled Article').trim();
      const originalLink = getNestedValue(item, 'link', '#');
      const pubDate = getNestedValue(item, 'pubDate') || getNestedValue(item, 'dc:date') || getNestedValue(item, 'published');
      const date = pubDate ? new Date(pubDate).toISOString() : new Date().toISOString();
      
      // Use GUID for ID if available and it's a string. Otherwise, combine originalLink and date for uniqueness.
      let guidValue = getNestedValue(item, 'guid');
      if (typeof guidValue === 'object' && guidValue._) guidValue = guidValue._; // Common pattern for guid
      const idInput = (typeof guidValue === 'string' && guidValue.trim() !== '') ? guidValue : (originalLink + date + source.name + index);
      const id = slugify(idInput);

      const categoryFromFeed = getNestedValue(item, 'category', source.defaultCategory || 'General News');
      const category = Array.isArray(categoryFromFeed) ? categoryFromFeed[0] : categoryFromFeed;
      const finalCategory = typeof category === 'string' ? category.trim() : (source.defaultCategory || 'General News');
      
      const imageUrl = extractImageUrl(item);
      const summary = normalizeDescription(item.description || item.summary || getNestedValue(item, 'content'));
      const fullContent = getNestedValue(item, 'content:encoded') || getNestedValue(item, 'content') || summary;

      // Internal link for the app's article page
      const internalArticleLink = `/${slugify(finalCategory)}/${id}`;

      return {
        id,
        title,
        summary,
        date,
        source: source.name,
        category: finalCategory,
        imageUrl,
        link: internalArticleLink, // This is the internal app link
        sourceLink: originalLink,  // This is the link to the original article on the source's website
        content: typeof fullContent === 'string' ? fullContent : summary,
      };
    }).filter(article => article.title && article.title !== 'Untitled Article' && article.sourceLink !== '#'); // Basic validation
  } catch (error) {
    console.error(`Error processing RSS feed for ${source.name} (${source.rssUrl}):`, error);
    return [];
  }
}

export async function fetchArticlesFromAllSources(): Promise<Article[]> {
  const allArticlesPromises = NEWS_SOURCES.map(source => fetchAndParseRSS(source));
  const results = await Promise.all(allArticlesPromises);
  
  const allArticles: Article[] = results.flat();

  // Sort by date descending
  allArticles.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  // Remove duplicates based on a combination of title and sourceLink (if very similar times)
  const uniqueArticles = allArticles.reduce((acc, current) => {
    const x = acc.find(item => item.title === current.title && item.sourceLink === current.sourceLink);
    if (!x) {
      return acc.concat([current]);
    } else {
      return acc;
    }
  }, [] as Article[]);
  
  // Limit to a reasonable number, e.g., latest 100 articles to prevent overload
  return uniqueArticles.slice(0, 150);
}
