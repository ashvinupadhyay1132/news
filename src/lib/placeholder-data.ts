
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


export async function getArticles(
  searchTerm?: string,
  currentCategory?: string,
  isForCategoriesOnly: boolean = false, // This param might be less relevant if categories are derived from DB
  fetchOgImagesParam: boolean = true // This now controls if rss-service attempts OG fetch during its DB update
): Promise<Article[]> {
  const articlesCollection = await getArticlesCollection();

  // Check if MongoDB is empty or data is considered "stale" and needs an update from RSS
  // For simplicity, we can check if the collection is empty or if the latest article is too old.
  // A more robust approach might involve a separate "last_updated" tracker.
  const count = await articlesCollection.countDocuments();
  let needsRssUpdate = count === 0;

  if (count > 0 && !isForCategoriesOnly) {
    const latestArticle = await articlesCollection.findOne({}, { sort: { date: -1 } });
    if (latestArticle && latestArticle.createdAt) {
      if ((Date.now() - new Date(latestArticle.createdAt).getTime()) > FIRESTORE_STALE_THRESHOLD) {
        // console.log("[Data Service] MongoDB data is stale. Triggering RSS update.");
        needsRssUpdate = true;
      }
    } else {
      needsRssUpdate = true; // No createdAt, assume stale
    }
  }
  
  // Trigger RSS fetch and MongoDB update if needed
  // This runs in the background and does not block the current request from using existing DB data
  if (needsRssUpdate && !isForCategoriesOnly) {
     updateArticlesFromRss().catch(error => console.error("Background RSS update failed:", error));
  }


  const query: any = {};
  if (currentCategory && currentCategory !== "All") {
    query.category = { $regex: new RegExp(`^${slugify(currentCategory)}$`, 'i') };
    // If your category in DB is not slugified, use:
    // query.category = currentCategory;
  }

  if (searchTerm) {
    const lowerSearchTerm = searchTerm.toLowerCase();
    query.$or = [
      { title: { $regex: lowerSearchTerm, $options: 'i' } },
      { summary: { $regex: lowerSearchTerm, $options: 'i' } },
      { category: { $regex: lowerSearchTerm, $options: 'i' } },
      { source: { $regex: lowerSearchTerm, $options: 'i' } },
    ];
  }

  const articlesFromDB = await articlesCollection.find(query)
    .sort({ date: -1 }) // Sort by original article date
    .limit(500) // Limit results for performance
    .toArray();

  // Map MongoDB document to Article type, ensuring all fields are present
  return articlesFromDB.map(doc => ({
    ...doc,
    _id: undefined, // Remove MongoDB's _id if it was fetched
    id: doc.id || (doc as any)._id?.toString(), // Ensure `id` is the one we use in the app
    date: typeof doc.date === 'string' ? doc.date : new Date(doc.date).toISOString(),
    createdAt: doc.createdAt ? new Date(doc.createdAt) : undefined,
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
      date: typeof articleDoc.date === 'string' ? articleDoc.date : new Date(articleDoc.date).toISOString(),
      createdAt: articleDoc.createdAt ? new Date(articleDoc.createdAt) : undefined,
    } as Article;
  }
  // Optional: Fallback to trigger an RSS update if article not found, then re-query.
  // This might be too slow for a direct response.
  // await updateArticlesFromRss();
  // const freshArticleDoc = await articlesCollection.findOne({ id: id });
  // if (freshArticleDoc) return freshArticleDoc as Article;

  return undefined;
}

export async function getCategories(): Promise<string[]> {
  const articlesCollection = await getArticlesCollection();
  
  // Efficiently get distinct categories from MongoDB
  const distinctCategories = await articlesCollection.distinct('category') as string[];
  
  const uniqueCategories = new Set(distinctCategories.filter(Boolean));
  const sortedCategories = ["All", ...Array.from(uniqueCategories).sort()];

  // If categories are sparse or empty, consider a quick RSS update check
  if (sortedCategories.length <= 1) { // Only "All"
    // console.log("[Data Service] Categories list is sparse. Triggering RSS update for categories.");
    // This specific call to fetchFromRss is for category generation, so it's lightweight.
    const articlesForCategories = await fetchFromRss(true, false, true); // isForCategoriesOnly = true, fetchOgImages = false, saveToDb = true (to populate categories)
    const newDistinctCategories = new Set(articlesForCategories.map(a => a.category).filter(Boolean));
    return ["All", ...Array.from(newDistinctCategories).sort()];
  }

  return sortedCategories;
}
