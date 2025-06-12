
'use server';

import { getArticlesCollection } from './mongodb';
<<<<<<< Updated upstream
// import type { Article as RssArticle } from './rss-service'; // Unused import removed
import { fetchArticlesFromAllSources } from './rss-service'; 
=======
import { fetchArticlesFromAllSources } from './rss-service';
import { slugify } from '@/lib/utils';
>>>>>>> Stashed changes

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

interface ArticleLinkForSitemap {
  link: string;
  lastModified: string;
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
<<<<<<< Updated upstream
      link: "/",
=======
      link: "/", // Fallback link
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
  const articleLink = doc.link && typeof doc.link === 'string' && doc.link.startsWith('/') ? doc.link : `/${doc.category ? doc.category.toLowerCase().replace(/\s+/g, '-') : 'general'}/${doc.id || 'unknown-id'}`;
=======
  let internalLink = doc.link;
  // Ensure article.link is always root-relative and uses the slugified category if not already valid
  if (!internalLink || typeof internalLink !== 'string' || !internalLink.startsWith('/') || internalLink === '/') {
    const categorySlug = doc.category ? slugify(doc.category) : 'general';
    const articleId = doc.id || `unknown-id-${Math.random().toString(36).substring(7)}`;
    internalLink = `/${categorySlug}/${articleId}`;
  }

>>>>>>> Stashed changes

  return {
    id: doc.id || `missing-id-${Math.random().toString(36).substring(7)}`,
    title: doc.title || "Untitled Article",
    summary: doc.summary || "No summary available.",
    date: doc.date ? new Date(doc.date).toISOString() : new Date(0).toISOString(),
    source: doc.source || "Unknown Source",
    category: doc.category || "General",
    imageUrl: imageUrlFromDb,
<<<<<<< Updated upstream
    link: articleLink,
=======
    link: internalLink,
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
      .sort({ date: -1, _id: -1 }) // Ensure stable sort by date (latest first), then by _id (latest first) for tie-breaking
=======
      .sort({ date: -1, _id: -1 }) // Sort by date (latest first), then by _id for tie-breaking
>>>>>>> Stashed changes
      .skip(skipAmount)
      .limit(limit)
      .toArray();

    const totalArticlesInQuery = await articlesCollection.countDocuments(mongoQuery);

    const mappedArticles = articlesFromDb.map(mapMongoDocToArticle);

    const hasMore = (skipAmount + mappedArticles.length) < totalArticlesInQuery;
<<<<<<< Updated upstream
    // console.log(`[DB PlaceholderData getArticles] Found ${articlesFromDb.length} articles from DB. Dates of first 3: ${mappedArticles.slice(0,3).map(a => a.date).join(', ')}. Total in query: ${totalArticlesInQuery}. HasMore: ${hasMore}.`);
    
=======
    // const firstThreeDates = mappedArticles.slice(0,3).map(a => a.date);
    // console.log(`[DB PlaceholderData getArticles] Found ${articlesFromDb.length} articles from DB. Dates of first 3: ${firstThreeDates.join(', ')}. Total in query: ${totalArticlesInQuery}. HasMore: ${hasMore}.`);

>>>>>>> Stashed changes
    return {
      articles: mappedArticles,
      totalArticles: totalArticlesInQuery,
      hasMore: hasMore,
    };
  } catch (error) {
    console.error("[DB PlaceholderData getArticles] CRITICAL ERROR fetching from MongoDB:", error);
<<<<<<< Updated upstream
    return { articles: [], totalArticles: 0, hasMore: false }; 
=======
    return { articles: [], totalArticles: 0, hasMore: false };
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
=======
export async function getAllArticlesForSitemap(): Promise<ArticleLinkForSitemap[]> {
  // console.log("[DB PlaceholderData] getAllArticlesForSitemap - Fetching all article links and dates for sitemap.");
  try {
    const articlesCollection = await getArticlesCollection();
    const articles = await articlesCollection
      .find({}, { projection: { link: 1, date: 1, _id: 0, category: 1, id: 1 } }) // Include category and id for link reconstruction
      .sort({ date: -1 })
      .toArray();

    // console.log(`[DB PlaceholderData] getAllArticlesForSitemap - Found ${articles.length} articles for sitemap.`);
    return articles.map(doc => {
      let articleLink = doc.link;
      if (!articleLink || typeof articleLink !== 'string' || !articleLink.startsWith('/') || articleLink === '/') {
        const categorySlug = doc.category ? slugify(doc.category) : 'general';
        const articleId = doc.id || `unknown-id-${Math.random().toString(36).substring(7)}`;
        articleLink = `/${categorySlug}/${articleId}`;
      }
      return {
        link: articleLink,
        lastModified: doc.date ? new Date(doc.date).toISOString() : new Date().toISOString(),
      };
    });
  } catch (error) {
    console.error("[DB PlaceholderData] CRITICAL ERROR in getAllArticlesForSitemap:", error);
    return [];
  }
}

>>>>>>> Stashed changes

export async function updateArticlesFromRssAndSaveToDb(): Promise<void> {
  console.log("[PlaceholderData updateArticlesFromRssAndSaveToDb] Process STARTED.");
  try {
    const articlesCollection = await getArticlesCollection();
    const count = await articlesCollection.countDocuments();
<<<<<<< Updated upstream
    console.log(`[PlaceholderData updateArticlesFromRssAndSaveToDb] Current article count in DB: ${count}`);
=======
    // console.log(`[PlaceholderData] updateArticlesFromRssAndSaveToDb - Current article count in DB: ${count}`);
>>>>>>> Stashed changes

    let articleProcessingLimit: number | undefined = undefined;

    if (count === 0) {
      console.log("[PlaceholderData updateArticlesFromRssAndSaveToDb] Database is EMPTY. Proceeding with initial population (limit: 150 articles).");
      articleProcessingLimit = 150;
      await fetchArticlesFromAllSources(false, true, true, articleProcessingLimit);
<<<<<<< Updated upstream
    } else {
      console.log("[PlaceholderData updateArticlesFromRssAndSaveToDb] Database is NOT empty. Proceeding with regular update (default cap in fetchArticlesFromAllSources applies).");
      await fetchArticlesFromAllSources(false, true, true);
=======
      // console.log("[PlaceholderData] Initial population fetch/save attempt FINISHED.");
    } else {
      // console.log(`[PlaceholderData] Database has ${count} articles. Proceeding with regular update (default processing cap applies in rss-service).`);
      await fetchArticlesFromAllSources(false, true, true);
      // console.log("[PlaceholderData] Regular update fetch/save attempt FINISHED.");
>>>>>>> Stashed changes
    }
    console.log("[PlaceholderData updateArticlesFromRssAndSaveToDb] Process COMPLETED successfully.");
  } catch (error) {
    console.error("[PlaceholderData updateArticlesFromRssAndSaveToDb] CRITICAL ERROR:", error);
  }
}


    