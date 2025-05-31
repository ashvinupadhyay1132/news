
'use server';

import { fetchArticlesFromAllSources } from './rss-service';
import { slugify } from './utils';
import { adminDB } from './firebaseAdmin';

// Define and export the Article interface
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

export async function getArticles(searchTerm?: string, currentCategory?: string): Promise<Article[]> {
  let articlesFromDB: Article[] = [];
  let isDBStale = true;

  try {
    const articlesSnapshot = await adminDB.collection('articles_rss_feed')
                                       .orderBy('date', 'desc')
                                       .limit(500) // Fetch a good number for filtering
                                       .get();
    
    if (!articlesSnapshot.empty) {
      articlesFromDB = articlesSnapshot.docs.map(doc => doc.data() as Article);
      
      if (articlesFromDB.length > 0 && articlesFromDB[0].fetchedAt) {
        const mostRecentFetchTime = new Date(articlesFromDB[0].fetchedAt).getTime();
        if ((Date.now() - mostRecentFetchTime) < FIRESTORE_STALE_THRESHOLD) {
          isDBStale = false;
        }
      }
    }
  } catch (error) {
    console.error("[Placeholder Data] Error fetching articles from Firestore:", error);
    isDBStale = true;
  }

  if (isDBStale) {
    // console.log("[Placeholder Data] Firestore data is stale or empty. Fetching live articles...");
    const liveArticles = await fetchArticlesFromAllSources(); 
    // fetchArticlesFromAllSources now saves to Firestore and returns the saved articles.
    // So we filter and search these live (and now stored) articles.
    return filterAndSearchArticles(liveArticles, searchTerm, currentCategory);
  }

  // console.log("[Placeholder Data] Using fresh data from Firestore.");
  return filterAndSearchArticles(articlesFromDB, searchTerm, currentCategory);
}

export async function getArticleById(id: string): Promise<Article | undefined> {
  try {
    const doc = await adminDB.collection('articles_rss_feed').doc(id).get();
    if (doc.exists) {
      return doc.data() as Article;
    } else {
      // console.warn(`[Placeholder Data] Article with ID ${id} not found in Firestore. Attempting a live fetch as a fallback.`);
      // As a fallback, refresh data and try to find it
      const articles = await getArticles(); // This will trigger a live fetch if DB was stale or empty
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
  const articles = await getArticles(); // This will use Firestore-backed data if fresh, or live data if stale
  const uniqueCategories = new Set(articles.map(a => a.category).filter(Boolean));
  return ["All", ...Array.from(uniqueCategories).sort()];
}

export async function filterAndSearchArticles(
  articles: Article[],
  searchTerm?: string,
  currentCategory?: string
): Promise<Article[]> {
  if (!searchTerm && (!currentCategory || currentCategory === "All")) {
    return articles;
  }

  let filtered = articles;

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
        (article.category && article.category.toLowerCase().includes(lowerSearchTerm)) || // check for category existence
        (article.source && article.source.toLowerCase().includes(lowerSearchTerm)) // check for source existence
    );
  }
  return filtered;
}
