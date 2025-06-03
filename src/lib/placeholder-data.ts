
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
  currentCategory?: string,
  page: number = 1,
  limit: number = 9
): Promise<{ articles: Article[]; totalArticles: number; hasMore: boolean }> {
  try {
    const articlesCollection = await getArticlesCollection();
    const query: any = {};

    if (currentCategory && currentCategory !== "All") {
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

    const skipAmount = (page - 1) * limit;

    const articlesFromDb = await articlesCollection
      .find(query)
      .sort({ date: -1 }) // Sort by BSON Date object
      .skip(skipAmount)
      .limit(limit)
      .toArray();

    const totalArticlesInQuery = await articlesCollection.countDocuments(query);
    const mappedArticles = articlesFromDb.map(mapMongoDocToArticle);
    
    return {
      articles: mappedArticles,
      totalArticles: totalArticlesInQuery,
      hasMore: (skipAmount + mappedArticles.length) < totalArticlesInQuery,
    };
  } catch (error) {
    console.error("[DB PlaceholderData] Error fetching articles from MongoDB:", error);
    return { articles: [], totalArticles: 0, hasMore: false }; 
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
      console.warn("[DB PlaceholderData] No categories found in DB. Attempting to fetch from RSS for category list.");
      const rssArticlesForCategories = await fetchArticlesFromAllSources(true, false, false); 
      if (rssArticlesForCategories.length > 0) {
        const uniqueRssCategories = new Set(rssArticlesForCategories.map(a => a.category).filter(Boolean));
        const sortedRssCategories = ["All", ...Array.from(uniqueRssCategories).sort()];
        if (sortedRssCategories.length > 1) return sortedRssCategories;
      }
      return ["All", "General"]; 
    }

    return ["All", ...categories.sort()];
  } catch (error) {
    console.error("[DB PlaceholderData] Error fetching categories from MongoDB:", error);
    return ["All", "General"]; 
  }
}

export async function updateArticlesFromRssAndSaveToDb(): Promise<void> {
  console.log("[PlaceholderData] Triggering RSS fetch to update MongoDB...");
  try {
    // Fetch all articles, with OG images, and save them to DB.
    // fetchArticlesFromAllSources(isForCategoriesOnly, fetchOgImages, saveToDb)
    await fetchArticlesFromAllSources(false, true, true); 
    console.log("[PlaceholderData] MongoDB update process via RSS fetch completed.");
  } catch (error) {
    console.error("[PlaceholderData] Error during triggered RSS fetch and DB save:", error);
  }
}
