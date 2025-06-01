
'use server';

import { fetchArticlesFromAllSources } from './rss-service';
import { slugify } from './utils';

// Article interface without MongoDB specific fields
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
  fetchedAt?: string; // ISO string from rss-service
}

// Simple in-memory cache to avoid hitting RSS feeds too frequently on every API call
let allArticlesCache: Article[] = [];
let categoriesCache: string[] = [];
let lastFetchTimestamp: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function ensureCacheIsPopulated(forceRefresh: boolean = false): Promise<void> {
  const now = Date.now();
  if (forceRefresh || !lastFetchTimestamp || (now - lastFetchTimestamp > CACHE_TTL_MS) || allArticlesCache.length === 0) {
    // The 'saveToDb' parameter in fetchArticlesFromAllSources will effectively be false as rss-service won't save
    // We fetch full articles (isForCategoriesOnly=false, fetchOgImagesParam=true) for the cache
    const fetchedArticles = await fetchArticlesFromAllSources(false, true, false);
    
    // Ensure dates are valid ISO strings, default to epoch if not, and sort
    allArticlesCache = fetchedArticles.map(article => {
        let validatedDate = new Date(0).toISOString(); // Default to epoch
        try {
            const d = new Date(article.date);
            if (!isNaN(d.getTime())) {
                validatedDate = d.toISOString();
            } else {
                 // console.warn(`Invalid date encountered for article "${article.title}": ${article.date}. Defaulting to epoch.`);
            }
        } catch (e) {
            // console.warn(`Error parsing date for article "${article.title}": ${article.date}. Error: ${e}. Defaulting to epoch.`);
        }
        return { ...article, date: validatedDate };
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const uniqueCategories = new Set(allArticlesCache.map(a => a.category).filter(Boolean));
    categoriesCache = ["All", ...Array.from(uniqueCategories).sort()];
    lastFetchTimestamp = now;
  }
}

export async function getArticles(
  searchTerm?: string,
  currentCategory?: string
): Promise<Article[]> {
  await ensureCacheIsPopulated();
  let articlesToReturn = [...allArticlesCache];

  if (currentCategory && currentCategory !== "All") {
    articlesToReturn = articlesToReturn.filter(article =>
      slugify(article.category) === slugify(currentCategory)
    );
  }

  if (searchTerm) {
    const lowerSearchTerm = searchTerm.toLowerCase();
    articlesToReturn = articlesToReturn.filter(article =>
      (article.title && article.title.toLowerCase().includes(lowerSearchTerm)) ||
      (article.summary && article.summary.toLowerCase().includes(lowerSearchTerm)) ||
      (article.source && article.source.toLowerCase().includes(lowerSearchTerm))
    );
  }
  // Sorting is already done in ensureCacheIsPopulated
  return articlesToReturn;
}

export async function getArticleById(id: string): Promise<Article | undefined> {
  // For fetching a single article, ensure the cache is populated.
  // A more aggressive refresh (forceRefresh=true) could be used here if stale data is a concern for direct links.
  await ensureCacheIsPopulated(); 
  return allArticlesCache.find(article => article.id === id);
}

export async function getCategories(): Promise<string[]> {
  await ensureCacheIsPopulated();
  return categoriesCache.length > 1 ? categoriesCache : ["All", "General"]; // Fallback if cache is somehow empty
}

// This function can be used to explicitly trigger a cache refresh if needed by other parts of the app.
export async function updateArticlesFromRss(): Promise<void> {
  console.log("[Data Service] Triggering explicit RSS fetch to update in-memory cache...");
  await ensureCacheIsPopulated(true);
  console.log("[Data Service] In-memory cache update process completed.");
}
