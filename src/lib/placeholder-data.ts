
'use server';

import { getArticlesCollection } from './mongodb';
import { slugify } from './utils';
import type { Article as RssArticle } from './rss-service'; // Keep for potential future use or type reference
import { fetchArticlesFromAllSources } from './rss-service'; // For fallback category population if DB is empty

// Article interface as expected by the application components
// Dates should be ISO strings when returned to the client.
export interface Article {
  id: string;
  title: string;
  summary: string;
  date: string; // ISO string
  source: string;
  category: string;
  imageUrl: string | null;
  link: string; // Internal app link: /category/id
  sourceLink: string; // Original article link
  content?: string;
  fetchedAt?: string; // ISO string from rss-service, can be useful
}

// Helper to map MongoDB document to Article type
// Ensure date fields are converted to ISO strings.
function mapMongoDocToArticle(doc: any): Article {
  return {
    id: doc.id,
    title: doc.title,
    summary: doc.summary,
    // Ensure date is an ISO string, handle cases where it might be null or invalid
    date: doc.date ? new Date(doc.date).toISOString() : new Date(0).toISOString(),
    source: doc.source,
    category: doc.category,
    imageUrl: doc.imageUrl,
    link: doc.link,
    sourceLink: doc.sourceLink,
    content: doc.content,
    fetchedAt: doc.fetchedAt ? new Date(doc.fetchedAt).toISOString() : undefined,
  };
}

export async function getArticles(
  searchTerm?: string,
  currentCategory?: string
): Promise<Article[]> {
  try {
    const articlesCollection = await getArticlesCollection();
    const query: any = {};

    if (currentCategory && currentCategory !== "All") {
      // Attempt to match the slugified category or the direct category name
      // This assumes category in DB is the non-slugified version.
      // If categories are stored slugified, this needs adjustment.
      query.category = { $regex: new RegExp(`^${currentCategory}$`, 'i') };
    }

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      query.$or = [
        { title: { $regex: lowerSearchTerm, $options: 'i' } },
        { summary: { $regex: lowerSearchTerm, $options: 'i' } },
        { source: { $regex: lowerSearchTerm, $options: 'i' } },
      ];
    }

    const articlesFromDb = await articlesCollection
      .find(query)
      .sort({ date: -1 }) // Sort by BSON Date object
      .limit(200) // Limiting to 200 articles for performance, adjust as needed
      .toArray();

    return articlesFromDb.map(mapMongoDocToArticle);
  } catch (error) {
    console.error("[DB PlaceholderData] Error fetching articles from MongoDB:", error);
    return []; // Return empty array on error to prevent app crash
  }
}

export async function getArticleById(id: string): Promise<Article | undefined> {
  try {
    const articlesCollection = await getArticlesCollection();
    const articleDoc = await articlesCollection.findOne({ id: id });

    if (articleDoc) {
      return mapMongoDocToArticle(articleDoc);
    }
    return undefined;
  } catch (error) {
    console.error(`[DB PlaceholderData] Error fetching article by ID (${id}) from MongoDB:`, error);
    return undefined;
  }
}

export async function getCategories(): Promise<string[]> {
  try {
    const articlesCollection = await getArticlesCollection();
    const distinctCategories = await articlesCollection.distinct('category');
    
    const categories = distinctCategories.filter((category): category is string => typeof category === 'string' && category.trim() !== '');

    if (categories.length === 0) {
      // Fallback: If DB is empty, try to get categories from RSS service (for initial population idea)
      // This is a temporary measure; ideally, DB populates categories.
      console.warn("[DB PlaceholderData] No categories found in DB. Attempting to fetch from RSS for category list.");
      const rssArticlesForCategories = await fetchArticlesFromAllSources(true, false, false); // isForCategoriesOnly = true
      if (rssArticlesForCategories.length > 0) {
        const uniqueRssCategories = new Set(rssArticlesForCategories.map(a => a.category).filter(Boolean));
        const sortedRssCategories = ["All", ...Array.from(uniqueRssCategories).sort()];
        if (sortedRssCategories.length > 1) return sortedRssCategories;
      }
      return ["All", "General"]; // Ultimate fallback
    }

    return ["All", ...categories.sort()];
  } catch (error) {
    console.error("[DB PlaceholderData] Error fetching categories from MongoDB:", error);
    return ["All", "General"]; // Fallback on error
  }
}

// This function's role changes. It's no longer about updating an in-memory cache
// but can be a utility to trigger the DB population if needed for development/testing.
// The actual periodic update should be handled by a separate mechanism (e.g., cron job).
export async function updateArticlesFromRssAndSaveToDb(): Promise<void> {
  console.log("[PlaceholderData] Triggering RSS fetch to update MongoDB...");
  try {
    // Fetch all articles, with OG images, and save them to DB.
    await fetchArticlesFromAllSources(false, true, true);
    console.log("[PlaceholderData] MongoDB update process via RSS fetch completed.");
  } catch (error) {
    console.error("[PlaceholderData] Error during triggered RSS fetch and DB save:", error);
  }
}
