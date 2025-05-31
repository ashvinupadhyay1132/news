
import type { ParsedUrlQuery } from 'querystring';
import { fetchArticlesFromAllSources } from './rss-service';
import { slugify } from './utils';
import { adminDB } from './firebaseAdmin'; // Import Firestore admin instance
import type { Timestamp } from 'firebase-admin/firestore';


export interface Article {
  id: string;
  title: string;
  summary: string;
  date: string; // ISO string
  source: string;
  category: string;
  imageUrl: string | null; // Can be null
  link: string; // Internal app link: /category/id
  sourceLink: string; // Original article link from the RSS feed
  content?: string; // Full content, often HTML from RSS
  fetchedAt?: string; // ISO string, added when fetching/saving to Firestore
}

const FIRESTORE_STALE_THRESHOLD = 15 * 60 * 1000; // 15 minutes in milliseconds

export async function getArticles(query?: ParsedUrlQuery): Promise<Article[]> {
  let articlesFromDB: Article[] = [];
  let isDBStale = true;

  try {
    const articlesSnapshot = await adminDB.collection('articles_rss_feed')
                                       .orderBy('date', 'desc')
                                       .limit(500) // Fetch a good number for filtering
                                       .get();
    
    if (!articlesSnapshot.empty) {
      articlesFromDB = articlesSnapshot.docs.map(doc => doc.data() as Article);
      
      // Check freshness based on the 'fetchedAt' timestamp of the newest article from DB
      // If articlesFromDB is not empty and has items with fetchedAt
      if (articlesFromDB.length > 0 && articlesFromDB[0].fetchedAt) {
        const mostRecentFetchTime = new Date(articlesFromDB[0].fetchedAt).getTime();
        if ((Date.now() - mostRecentFetchTime) < FIRESTORE_STALE_THRESHOLD) {
          isDBStale = false;
          // console.log("[Placeholder Data] Using fresh data from Firestore.");
        } else {
          // console.log("[Placeholder Data] Firestore data is stale.");
        }
      } else {
         // console.log("[Placeholder Data] No 'fetchedAt' field found or DB empty, considering stale.");
      }
    } else {
      // console.log("[Placeholder Data] Firestore is empty.");
    }
  } catch (error) {
    console.error("[Placeholder Data] Error fetching articles from Firestore:", error);
    // Proceed as if DB is stale/empty
    isDBStale = true;
  }

  if (isDBStale) {
    // console.log("[Placeholder Data] Fetching live articles and updating Firestore...");
    // This function now also writes to Firestore
    const liveArticles = await fetchArticlesFromAllSources(); 
    // After fetchArticlesFromAllSources updates Firestore, we should re-fetch from DB to ensure consistency
    // or directly use liveArticles if we trust the immediate write.
    // For simplicity in this step, we'll use the liveArticles directly for this response,
    // assuming the next call will benefit from the updated DB.
    // A more robust approach would be to re-query Firestore here.
    // However, fetchArticlesFromAllSources itself returns the articles it processed and saved.
    return filterAndSearchArticles(liveArticles, query);
  }

  return filterAndSearchArticles(articlesFromDB, query);
}

export async function getArticleById(id: string): Promise<Article | undefined> {
  try {
    const doc = await adminDB.collection('articles_rss_feed').doc(id).get();
    if (doc.exists) {
      return doc.data() as Article;
    } else {
      // console.warn(`[Placeholder Data] Article with ID ${id} not found in Firestore. Fetching all to check.`);
      // Fallback: if not found, maybe it's very new and DB hasn't synced.
      // This could be slow if called often for non-existent IDs.
      const articles = await getArticles(); // This ensures DB is populated if empty/stale
      return articles.find(article => article.id === id);
    }
  } catch (error) {
    console.error(`[Placeholder Data] Error fetching article ${id} from Firestore:`, error);
    // Fallback to fetching all and finding it
    const articles = await getArticles();
    return articles.find(article => article.id === id);
  }
}

export async function getCategories(): Promise<string[]> {
  const articles = await getArticles(); // This will use Firestore-backed data
  const uniqueCategories = new Set(articles.map(a => a.category).filter(Boolean));
  return ["All", ...Array.from(uniqueCategories).sort()];
}

export function filterAndSearchArticles(
  articles: Article[],
  query?: ParsedUrlQuery
): Article[] {
  if (!query) return articles;

  let filtered = articles;
  const currentCategory = query.category as string | undefined;
  const searchTerm = query.q as string | undefined;

  if (currentCategory && currentCategory !== "All") {
    filtered = filtered.filter(
      (article) => slugify(article.category) === slugify(currentCategory)
    );
  }

  if (searchTerm) {
    const lowerSearchTerm = searchTerm.toLowerCase();
    filtered = filtered.filter(
      (article) =>
        article.title.toLowerCase().includes(lowerSearchTerm) ||
        article.summary.toLowerCase().includes(lowerSearchTerm) ||
        article.category.toLowerCase().includes(lowerSearchTerm) ||
        article.source.toLowerCase().includes(lowerSearchTerm)
    );
  }
  return filtered;
}
