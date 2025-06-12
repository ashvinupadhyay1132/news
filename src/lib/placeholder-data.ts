
'use server';

import { getArticlesCollection } from './mongodb';
import type { Article as RssArticle } from './rss-service'; 
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
  let imageUrlFromDb = doc.imageUrl;
  if (typeof imageUrlFromDb === 'string') {
    const trimmedUrl = imageUrlFromDb.trim();
    if (trimmedUrl === '' || trimmedUrl.toLowerCase() === 'null' || (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://'))) {
      imageUrlFromDb = null;
    } else {
      imageUrlFromDb = trimmedUrl; // Use the trimmed valid URL
    }
  } else if (imageUrlFromDb !== null) { // If it's not a string and not already null (e.g. undefined, number)
    imageUrlFromDb = null;
  }

  return {
    id: doc.id || `missing-id-${Math.random().toString(36).substring(7)}`,
    title: doc.title || "Untitled Article",
    summary: doc.summary || "No summary available.",
    date: doc.date ? new Date(doc.date).toISOString() : new Date(0).toISOString(),
    source: doc.source || "Unknown Source",
    category: doc.category || "General",
    imageUrl: imageUrlFromDb,
    link: doc.link || "/",
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
  // console.log(`[DB PlaceholderData] getArticles - MongoDB Query: ${JSON.stringify(mongoQuery)}, Page: ${page}, Limit: ${limit}`);

  try {
    const articlesCollection = await getArticlesCollection();
    
    const skipAmount = (page - 1) * limit;

    const articlesFromDb = await articlesCollection
      .find(mongoQuery)
      .sort({ date: -1 }) 
      .skip(skipAmount)
      .limit(limit)
      .toArray();
    
    const totalArticlesInQuery = await articlesCollection.countDocuments(mongoQuery);
    
    const mappedArticles = articlesFromDb.map(mapMongoDocToArticle);
    
    const hasMore = (skipAmount + mappedArticles.length) < totalArticlesInQuery;
    // console.log(`[DB PlaceholderData] getArticles - Mapped ${mappedArticles.length} articles. Total in query: ${totalArticlesInQuery}. HasMore: ${hasMore}. First mapped title (if any): ${mappedArticles[0]?.title.substring(0,50)}`);
    
    return {
      articles: mappedArticles,
      totalArticles: totalArticlesInQuery,
      hasMore: hasMore,
    };
  } catch (error) {
    console.error("[DB PlaceholderData] CRITICAL ERROR in getArticles fetching from MongoDB:", error);
    return { articles: [], totalArticles: 0, hasMore: false }; 
  }
}

export async function getArticleById(id: string): Promise<Article | undefined> {
  // console.log(`[DB PlaceholderData] getArticleById - Fetching article with ID: ${id}`);
  try {
    const articlesCollection = await getArticlesCollection();
    const articleDoc = await articlesCollection.findOne({ id: id });

    if (articleDoc) {
      // console.log(`[DB PlaceholderData] getArticleById - Found article: ${articleDoc.title}`);
      return mapMongoDocToArticle(articleDoc);
    }
    console.warn(`[DB PlaceholderData] getArticleById - Article not found for ID: ${id}`);
    return undefined;
  } catch (error) {
    console.error(`[DB PlaceholderData] Error fetching article by ID (${id}) from MongoDB:`, error);
    return undefined;
  }
}

export async function getCategories(): Promise<string[]> {
  // console.log("[DB PlaceholderData] getCategories - Fetching categories.");
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
        if (sortedRssCategories.length > 1) {
          // console.log(`[DB PlaceholderData] Categories fetched from RSS: ${sortedRssCategories.join(', ')}`);
          return sortedRssCategories;
        }
      }
      console.log("[DB PlaceholderData] No categories from DB or RSS. Returning default.");
      return ["All", "General"]; 
    }
    const finalCategories = ["All", ...categories.sort()];
    // console.log(`[DB PlaceholderData] Categories fetched from DB: ${finalCategories.join(', ')}`);
    return finalCategories;
  } catch (error) {
    console.error("[DB PlaceholderData] Error fetching categories from MongoDB:", error);
    // console.log("[DB PlaceholderData] Returning default categories due to error.");
    return ["All", "General"]; 
  }
}

export async function updateArticlesFromRssAndSaveToDb(): Promise<void> {
  console.log("[PlaceholderData] updateArticlesFromRssAndSaveToDb - Process STARTED.");
  try {
    const articlesCollection = await getArticlesCollection();
    const count = await articlesCollection.countDocuments();
    let articleProcessingLimit: number | undefined = undefined;

    if (count === 0) {
      console.log("[PlaceholderData] Database is EMPTY. Proceeding with initial population (limit: 150 articles).");
      articleProcessingLimit = 150;
      await fetchArticlesFromAllSources(false, true, true, articleProcessingLimit);
      console.log("[PlaceholderData] Initial population fetch/save attempt FINISHED.");
    } else {
      // console.log(`[PlaceholderData] Database has ${count} articles. Proceeding with regular update (default processing cap applies in rss-service).`);
      await fetchArticlesFromAllSources(false, true, true); 
      // console.log("[PlaceholderData] Regular update fetch/save attempt FINISHED.");
    }
    console.log("[PlaceholderData] updateArticlesFromRssAndSaveToDb - Process COMPLETED successfully.");
  } catch (error) {
    console.error("[PlaceholderData] CRITICAL ERROR in updateArticlesFromRssAndSaveToDb:", error);
  }
}
