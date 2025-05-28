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
  { name: "Reuters", rssUrl: "https://www.reutersagency.com/en/rss-feeds/", defaultCategory: "World News" }, // This might be a landing page, need specific feed
  // { name: "New York Times", rssUrl: "https://www.nytimes.com/rss", defaultCategory: "World News" }, // NYT RSS often requires specific section feeds
  { name: "Google News", rssUrl: "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en", defaultCategory: "General News" }, // Generic Google News
  { name: "The Guardian", rssUrl: "https://www.theguardian.com/international/rss", defaultCategory: "World News" },
  { name: "CNBC", rssUrl: "https://www.cnbc.com/id/100003114/device/rss/rss.html", defaultCategory: "Business" },
  { name: "NDTV (India)", rssUrl: "https://feeds.feedburner.com/ndtvnews-top-stories", defaultCategory: "India News" },
];

// More specific Reuters feed if the general one fails
const REUTERS_BUSINESS_UK = "http://feeds.reuters.com/reuters/UKBusinessNews"; // Example

const parser = new Parser({ explicitArray: false, ignoreAttrs: false, mergeAttrs: true });

function extractImageUrl(item: any): string {
  // Try common RSS/Media RSS tags for images
  if (item['media:group'] && item['media:group']['media:content'] && item['media:group']['media:content']['url']) {
    const mediaContent = item['media:group']['media:content'];
    if (Array.isArray(mediaContent)) {
      const imageContent = mediaContent.find(mc => mc.medium === 'image' && mc.url);
      if (imageContent) return imageContent.url;
    } else if (mediaContent.medium === 'image' && mediaContent.url) {
      return mediaContent.url;
    }
  }
  if (item['media:content'] && item['media:content']['url'] && item['media:content']['medium'] === 'image') {
    return item['media:content']['url'];
  }
   if (item['media:thumbnail'] && item['media:thumbnail']['url']) {
    return item['media:thumbnail']['url'];
  }
  if (item.enclosure && item.enclosure.url && item.enclosure.type && item.enclosure.type.startsWith('image/')) {
    return item.enclosure.url;
  }
  // Look for image in description (basic attempt)
  if (item.description && typeof item.description === 'string') {
    const imgMatch = item.description.match(/<img[^>]+src="([^">]+)"/);
    if (imgMatch && imgMatch[1]) {
      return imgMatch[1];
    }
  }
  return `https://placehold.co/600x400.png`; // Fallback placeholder
}

function normalizeDescription(description: any): string {
  if (typeof description === 'string') {
    // Strip HTML tags for a plain text summary
    return description.replace(/<[^>]+>/g, '').substring(0, 200) + '...';
  }
  if (description && typeof description._ === 'string') { // Handle CDATA
    return description._.replace(/<[^>]+>/g, '').substring(0, 200) + '...';
  }
  return 'No summary available.';
}


async function fetchAndParseRSS(source: NewsSource): Promise<Article[]> {
  try {
    const response = await fetch(source.rssUrl, { headers: { 'User-Agent': 'TrendingNewsFeedApp/1.0' }, next: { revalidate: 300 } }); // 5 min revalidation
    if (!response.ok) {
      console.error(`Failed to fetch RSS from ${source.name}: ${response.status}`);
      // Try a more specific Reuters feed if the generic one fails for Reuters
      if (source.name === "Reuters" && source.rssUrl !== REUTERS_BUSINESS_UK) {
        console.log("Trying specific Reuters Business UK feed...");
        return fetchAndParseRSS({ name: source.name, rssUrl: REUTERS_BUSINESS_UK, defaultCategory: "Business" });
      }
      return [];
    }
    const xmlText = await response.text();
    const result = await parser.parseStringPromise(xmlText);
    
    const items = getNestedValue(result, 'rss.channel.item', []);
    if (!Array.isArray(items)) {
      console.warn(`No items array found for ${source.name}`);
      return [];
    }

    return items.map((item: any, index: number) => {
      const title = getNestedValue(item, 'title', 'Untitled Article');
      const link = getNestedValue(item, 'link', '#');
      const pubDate = getNestedValue(item, 'pubDate') || getNestedValue(item, 'dc:date');
      const date = pubDate ? new Date(pubDate).toISOString() : new Date().toISOString();
      
      const guid = getNestedValue(item, 'guid._', getNestedValue(item, 'guid', link + date + index));
      const id = slugify(guid || title + date); // Ensure ID is always created

      const categoryFromFeed = getNestedValue(item, 'category', source.defaultCategory || 'General News');
      const category = Array.isArray(categoryFromFeed) ? categoryFromFeed[0] : categoryFromFeed;
      
      const imageUrl = extractImageUrl(item);
      const summary = normalizeDescription(item.description || item.summary);

      const articleLink = `/${slugify(category)}/${id}`;

      return {
        id,
        title,
        summary,
        date,
        source: source.name,
        category: typeof category === 'string' ? category : source.defaultCategory || 'General News',
        imageUrl,
        link: articleLink,
        content: getNestedValue(item, 'content:encoded', summary), // Use content:encoded if available, else summary
      };
    }).filter(article => article.title && article.link !== '#'); // Basic validation
  } catch (error) {
    console.error(`Error processing RSS feed for ${source.name} (${source.rssUrl}):`, error);
    return [];
  }
}

export async function fetchArticlesFromAllSources(): Promise<Article[]> {
  const allArticles: Article[] = [];
  for (const source of NEWS_SOURCES) {
    const articles = await fetchAndParseRSS(source);
    allArticles.push(...articles);
  }

  // Sort by date descending
  allArticles.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  // Limit to a reasonable number, e.g., latest 100 articles to prevent overload
  return allArticles.slice(0, 100);
}
