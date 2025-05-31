
'use server';

import { fetchArticlesFromAllSources } from './rss-service';
import { slugify } from './utils';
import { adminDB } from './firebaseAdmin';
import type { Article } from './placeholder-data'; // Self-referential type import is fine

// Re-declaring interface here if it's not exported from a .d.ts file or shared differently
// For this case, assuming Article is defined in this file itself or properly imported if from elsewhere.
// export interface Article { ... } // Ensure Article interface is defined or imported

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
    const liveArticles = await fetchArticlesFromAllSources(); 
    return filterAndSearchArticles(liveArticles, searchTerm, currentCategory);
  }

  return filterAndSearchArticles(articlesFromDB, searchTerm, currentCategory);
}

export async function getArticleById(id: string): Promise<Article | undefined> {
  try {
    const doc = await adminDB.collection('articles_rss_feed').doc(id).get();
    if (doc.exists) {
      return doc.data() as Article;
    } else {
      // Fallback: if not found, fetch all, update Firestore, then try to find it.
      // This ensures that if the article is very new and was missed by a previous fetch,
      // or if Firestore was cleared, we attempt to get it.
      const articles = await getArticles(); // This will trigger fetchArticlesFromAllSources if DB is stale/empty
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
  // Fetch articles (this will use Firestore-backed data or refresh if stale)
  const articles = await getArticles(); 
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
        article.category.toLowerCase().includes(lowerSearchTerm) ||
        article.source.toLowerCase().includes(lowerSearchTerm)
    );
  }
  return filtered;
}

