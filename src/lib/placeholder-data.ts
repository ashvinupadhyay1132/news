
'use server';

import { getArticlesCollection } from './mongodb';
import { slugify } from './utils';
import { fetchArticlesFromAllSources as fetchFromRss } from './rss-service'; // Renamed to avoid conflict

// Define and export the Article interface
export interface Article {
  id: string; // This will be the unique ID derived from sourceLink/title
  title: string;
  summary: string;
  date: string; // ISO string - this should be used for sorting latest news
  source: string;
  category: string;
  imageUrl: string | null;
  link: string; // Internal app link: /category/id
  sourceLink: string; // Original article link from the RSS feed - WILL BE UNIQUE KEY
  content?: string;
  fetchedAt?: string; // ISO string, can be added by rss-service
  createdAt?: Date; // Added for MongoDB TTL
}

const FIRESTORE_STALE_THRESHOLD = 15 * 60 * 1000; // 15 minutes in milliseconds, kept for logic reference but not directly used for MongoDB fetching.

// This function will now act as a trigger to update MongoDB from RSS feeds
// and then the actual data serving will happen from MongoDB.
export async function updateArticlesFromRss(): Promise<void> {
  // console.log("[Data Service] Triggering RSS fetch to update MongoDB...");
  // fetchFromRss will handle saving/upserting to MongoDB.
  // The 'fetchOgImagesParam' and 'isForCategoriesOnly' are handled within fetchFromRss logic
  // to decide if it needs to save to DB or just provide data for categories.
  // For a general update, we fetch everything.
  await fetchFromRss(false, true, true); // isForCategoriesOnly = false, fetchOgImages = true, saveToDb = true
  // console.log("[Data Service] RSS fetch and MongoDB update process completed.");
}

// Helper function to safely format date strings
function safeFormatDateString(dateInput: any): string {
  if (!dateInput) return new Date(0).toISOString(); // Default to Epoch if null/undefined
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) {
      // console.warn(`Invalid date value encountered: ${dateInput} in safeFormatDateString. Defaulting to Epoch.`);
      return new Date(0).toISOString(); // Default to Epoch for invalid dates
    }
    return d.toISOString();
  } catch (e) {
    // console.warn(`Error parsing date value '${dateInput}' in safeFormatDateString: ${e}. Defaulting to Epoch.`);
    return new Date(0).toISOString();
  }
}

// Helper function to safely create Date objects
function safeCreateDateObject(dateInput: any): Date | undefined {
  if (!dateInput) return undefined;
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) {
      // console.warn(`Invalid date value encountered: ${dateInput} in safeCreateDateObject. Returning undefined.`);
      return undefined;
    }
    return d;
  } catch (e) {
    // console.warn(`Error parsing date value '${dateInput}' in safeCreateDateObject: ${e}. Returning undefined.`);
    return undefined;
  }
}


export async function getArticles(
  searchTerm?: string,
  currentCategory?: string,
  isForCategoriesOnly: boolean = false, 
  fetchOgImagesParam: boolean = true 
): Promise<Article[]> {
  const articlesCollection = await getArticlesCollection();

  const count = await articlesCollection.countDocuments();
  let needsRssUpdate = count === 0;

  if (count > 0 && !isForCategoriesOnly) {
    const latestArticle = await articlesCollection.findOne({}, { sort: { createdAt: -1 } }); // Sort by createdAt for staleness check
    if (latestArticle && latestArticle.createdAt) {
       const createdAtDate = safeCreateDateObject(latestArticle.createdAt);
       if (createdAtDate && (Date.now() - createdAtDate.getTime()) > FIRESTORE_STALE_THRESHOLD) {
        needsRssUpdate = true;
      }
    } else {
      needsRssUpdate = true; 
    }
  }
  
  if (needsRssUpdate && !isForCategoriesOnly) {
     // Intentionally not awaiting this to allow the API to respond faster
     updateArticlesFromRss().catch(error => console.error("[getArticles] Background RSS update failed:", error));
  }


  const query: any = {};
  if (currentCategory && currentCategory !== "All") {
    query.category = { $regex: new RegExp(`^${slugify(currentCategory)}$`, 'i') };
  }

  if (searchTerm) {
    const lowerSearchTerm = searchTerm.toLowerCase();
    query.$or = [
      { title: { $regex: lowerSearchTerm, $options: 'i' } },
      { summary: { $regex: lowerSearchTerm, $options: 'i' } },
      // { category: { $regex: lowerSearchTerm, $options: 'i' } }, // Searching category by text already handled by currentCategory
      { source: { $regex: lowerSearchTerm, $options: 'i' } },
    ];
     // If searching and a specific category is also selected, combine them with $and
    if (query.category && query.$or) {
        query.$and = [{ category: query.category }, { $or: query.$or }];
        delete query.category; // Remove top-level category as it's now in $and
        delete query.$or; // Remove top-level $or as it's now in $and
    }
  }


  const articlesFromDB = await articlesCollection.find(query)
    .sort({ date: -1 }) 
    .limit(500) 
    .toArray();

  return articlesFromDB.map(doc => ({
    ...doc,
    _id: undefined, 
    id: doc.id || (doc as any)._id?.toString(), 
    date: safeFormatDateString(doc.date),
    createdAt: safeCreateDateObject(doc.createdAt), // Ensure createdAt is a Date object or undefined
  })) as Article[];
}

export async function getArticleById(id: string): Promise<Article | undefined> {
  const articlesCollection = await getArticlesCollection();
  const articleDoc = await articlesCollection.findOne({ id: id });

  if (articleDoc) {
    return {
      ...articleDoc,
      _id: undefined,
      id: articleDoc.id || (articleDoc as any)._id?.toString(),
      date: safeFormatDateString(articleDoc.date),
      createdAt: safeCreateDateObject(articleDoc.createdAt), // Ensure createdAt is a Date object or undefined
    } as Article;
  }
  return undefined;
}

export async function getCategories(): Promise<string[]> {
  try {
    const articlesCollection = await getArticlesCollection();
    const distinctCategoriesFromDB = await articlesCollection.distinct('category') as string[];
    const uniqueDbCategories = new Set(distinctCategoriesFromDB.filter(Boolean));

    if (uniqueDbCategories.size > 0) {
      return ["All", ...Array.from(uniqueDbCategories).sort()];
    }

    // If DB has no categories, try fetching from RSS to populate/discover them
    // console.log("[getCategories] No categories in DB, attempting RSS fallback to discover categories.");
    const articlesForCategories = await fetchFromRss(true, false, true); // saveToDb is true to populate
    const newDistinctCategories = new Set(articlesForCategories.map(a => a.category).filter(Boolean));
    
    if (newDistinctCategories.size > 0) {
      return ["All", ...Array.from(newDistinctCategories).sort()];
    }
    
    return ["All"]; // No categories in DB and none from RSS fallback

  } catch (error) {
    console.error("[getCategories] Critical error occurred while fetching categories:", error);
    // If any error occurs (DB connection, distinct call, or unhandled in RSS path), 
    // return a minimal default set of categories.
    // This makes the /api/categories endpoint more resilient.
    return ["All", "General"];
  }
}
