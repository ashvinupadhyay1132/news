
'use server';

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
      const articles = await getArticles(); 
      return articles.find(article => article.id === id);
    }
  } catch (error) {
    console.error(`[Placeholder Data] Error fetching article ${id} from Firestore:`, error);
    const articles = await getArticles();
    return articles.find(article => article.id === id);
  }
}

export async function getCategories(): Promise<string[]> {
  const articles = await getArticles(); 
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

