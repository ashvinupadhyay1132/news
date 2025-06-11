
'use server';

import { getArticlesCollection } from './mongodb';
// import type { Article as RssArticle } from './rss-service'; // Unused import removed
import { fetchArticlesFromAllSources } from './rss-service'; 

export interface Article {
  id: string;
  title: string;
  summary: string;
  date: string; // ISO string
  source: string;
  category: string;
  imageUrl: string | null;
  link: string; 
  sourceLink: string; 
  content?: string;
  fetchedAt?: string; // ISO string
}

function mapMongoDocToArticle(doc: any): Article {
  if (!doc) {
    console.warn("[DB PlaceholderData] mapMongoDocToArticle received a null/undefined document.");
    return {
      id: `invalid-doc-${Date.now()}`,
      title: "Error: Article data missing",
      summary: "Could not load article details.",
      date: new Date().toISOString(),
      source: "Unknown",
      category: "General",
      imageUrl: null,
      link: "/",
      sourceLink: "#",
      content: "Article content is unavailable due to an error.",
      fetchedAt: new Date().toISOString(),
    };
  }

  let imageUrlFromDb = doc.imageUrl;
  if (typeof imageUrlFromDb === 'string') {
    const trimmedUrl = imageUrlFromDb.trim();
    if (trimmedUrl === '' || trimmedUrl.toLowerCase() === 'null' || (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://'))) {
      imageUrlFromDb = null;
    } else {
      imageUrlFromDb = trimmedUrl;
    }
  } else if (imageUrlFromDb !== null) {
    imageUrlFromDb = null;
  }

  const articleLink = doc.link && typeof doc.link === 'string' && doc.link.startsWith('/') ? doc.link : `/${doc.category ? doc.category.toLowerCase().replace(/\s+/g, '-') : 'general'}/${doc.id || 'unknown-id'}`;

  return {
    id: doc.id || `missing-id-${Math.random().toString(36).substring(7)}`,
    title: doc.title || "Untitled Article",
    summary: doc.summary || "No summary available.",
    date: doc.date ? new Date(doc.date).toISOString() : new Date(0).toISOString(),
    source: doc.source || "Unknown Source",
    category: doc.category || "General",
    imageUrl: imageUrlFromDb,
    link: articleLink,
    sourceLink: doc.sourceLink || "#",
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
  const mongoQuery: any = {};
  if (currentCategory && currentCategory !== "All") {
    mongoQuery.category = { $regex: new RegExp(`^${currentCategory}$`, 'i') };
  }
  if (searchTerm) {
    const lowerSearchTerm = searchTerm.toLowerCase();
    mongoQuery.$or = [
      { title: { $regex: lowerSearchTerm, $options: 'i' } },
      { summary: { $regex: lowerSearchTerm, $options: 'i' } },
      { source: { $regex: lowerSearchTerm, $options: 'i' } },
    ];
  }
  // console.log(`[DB PlaceholderData getArticles] Effective MongoDB Query: ${JSON.stringify(mongoQuery)} for page ${page}, limit ${limit}`);

  try {
    const articlesCollection = await getArticlesCollection();
    
    const skipAmount = (page - 1) * limit;

    const articlesFromDb = await articlesCollection
      .find(mongoQuery)
      .sort({ date: -1, _id: -1 }) // Ensure stable sort by date (latest first), then by _id (latest first) for tie-breaking
      .skip(skipAmount)
      .limit(limit)
      .toArray();
    
    const totalArticlesInQuery = await articlesCollection.countDocuments(mongoQuery);
    
    const mappedArticles = articlesFromDb.map(mapMongoDocToArticle);
    
    const hasMore = (skipAmount + mappedArticles.length) < totalArticlesInQuery;
    // console.log(`[DB PlaceholderData getArticles] Found ${articlesFromDb.length} articles from DB. Dates of first 3: ${mappedArticles.slice(0,3).map(a => a.date).join(', ')}. Total in query: ${totalArticlesInQuery}. HasMore: ${hasMore}.`);
    
    return {
      articles: mappedArticles,
      totalArticles: totalArticlesInQuery,
      hasMore: hasMore,
    };
  } catch (error) {
    console.error("[DB PlaceholderData getArticles] CRITICAL ERROR fetching from MongoDB:", error);
    return { articles: [], totalArticles: 0, hasMore: false }; 
  }
}

export async function getArticleById(articleId: string): Promise<Article | undefined> {
  // console.log(`[DB PlaceholderData] getArticleById - Attempting to fetch article with ID: "${articleId}"`);
  if (!articleId || typeof articleId !== 'string' || articleId.trim() === '') {
    console.error(`[DB PlaceholderData] getArticleById - Invalid ID provided: "${articleId}"`);
    return undefined;
  }
  try {
    const articlesCollection = await getArticlesCollection();
    // console.log(`[DB PlaceholderData] getArticleById - MongoDB findOne query: { id: "${articleId}" }`);
    const articleDoc = await articlesCollection.findOne({ id: articleId });

    if (articleDoc) {
      // console.log(`[DB PlaceholderData] getArticleById - Found document for ID "${articleId}"`);
      return mapMongoDocToArticle(articleDoc);
    }
    // console.warn(`[DB PlaceholderData] getArticleById - Article document NOT FOUND in DB for ID: "${articleId}"`);
    return undefined;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[DB PlaceholderData] CRITICAL ERROR fetching article by ID ("${articleId}") from MongoDB: ${errorMessage}`);
    return undefined;
  }
}

export async function getCategories(): Promise<string[]> {
  const defaultCategories = ["All", "General", "Technology", "Sports", "Business & Finance", "Entertainment", "World News", "India News"];
  try {
    const articlesCollection = await getArticlesCollection();
    const distinctCategories = await articlesCollection.distinct('category');
    const categories = distinctCategories.filter((category): category is string => typeof category === 'string' && category.trim() !== '');

    if (categories.length === 0) {
      // console.log("[DB PlaceholderData getCategories] No categories found in DB, attempting RSS fallback.");
      try {
        const rssArticlesForCategories = await fetchArticlesFromAllSources(true, false, false);
        if (rssArticlesForCategories.length > 0) {
          const uniqueRssCategories = new Set(rssArticlesForCategories.map(a => a.category).filter(Boolean));
          const sortedRssCategories = ["All", ...Array.from(uniqueRssCategories).filter(cat => cat !== "All").sort()];
          if (sortedRssCategories.length > 1) { // Make sure there's more than just "All"
            // console.log("[DB PlaceholderData getCategories] Successfully fetched categories from RSS fallback.");
            return sortedRssCategories;
          }
        }
        // console.warn("[DB PlaceholderData getCategories] RSS fallback yielded no categories, returning defaults.");
      } catch (rssError) {
        console.error("[DB PlaceholderData getCategories] Error during RSS fallback for categories:", rssError);
      }
      return defaultCategories;
    }
    // console.log(`[DB PlaceholderData getCategories] Found ${categories.length} distinct categories from DB.`);
    return ["All", ...categories.sort()];
  } catch (error) {
    console.error("[DB PlaceholderData getCategories] CRITICAL Error fetching categories via MongoDB distinct query:", error);
    return defaultCategories;
  }
}


export async function updateArticlesFromRssAndSaveToDb(): Promise<void> {
  console.log("[PlaceholderData updateArticlesFromRssAndSaveToDb] Process STARTED.");
  try {
    const articlesCollection = await getArticlesCollection();
    const count = await articlesCollection.countDocuments();
    console.log(`[PlaceholderData updateArticlesFromRssAndSaveToDb] Current article count in DB: ${count}`);

    let articleProcessingLimit: number | undefined = undefined;

    if (count === 0) {
      console.log("[PlaceholderData updateArticlesFromRssAndSaveToDb] Database is EMPTY. Proceeding with initial population (limit: 150 articles).");
      articleProcessingLimit = 150;
      await fetchArticlesFromAllSources(false, true, true, articleProcessingLimit);
    } else {
      console.log("[PlaceholderData updateArticlesFromRssAndSaveToDb] Database is NOT empty. Proceeding with regular update (default cap in fetchArticlesFromAllSources applies).");
      await fetchArticlesFromAllSources(false, true, true);
    }
    console.log("[PlaceholderData updateArticlesFromRssAndSaveToDb] Process COMPLETED successfully.");
  } catch (error) {
    console.error("[PlaceholderData updateArticlesFromRssAndSaveToDb] CRITICAL ERROR:", error);
  }
}
