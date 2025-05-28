import type { ParsedUrlQuery } from 'querystring';
import { fetchArticlesFromAllSources } from './rss-service';
import { slugify } from './utils';

export interface Article {
  id: string;
  title: string;
  summary: string;
  date: string;
  source: string;
  category: string;
  imageUrl: string;
  link: string;
  content?: string; // Full content, often HTML from RSS
}

let cachedArticles: Article[] | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getArticles(query?: ParsedUrlQuery): Promise<Article[]> {
  const now = Date.now();
  if (cachedArticles && (now - lastFetchTime < CACHE_DURATION)) {
    // console.log("Serving articles from cache");
    return filterAndSearchArticles(cachedArticles, query);
  }
  // console.log("Fetching fresh articles");
  const freshArticles = await fetchArticlesFromAllSources();
  cachedArticles = freshArticles;
  lastFetchTime = now;
  return filterAndSearchArticles(freshArticles, query);
}

export async function getArticleById(id: string): Promise<Article | undefined> {
  // Ensure cache is populated if empty or stale, but don't pass query here
  const articles = await getArticles(); 
  return articles.find(article => article.id === id);
}

export async function getCategories(): Promise<string[]> {
  // Ensure cache is populated
  const articles = await getArticles(); 
  const uniqueCategories = new Set(articles.map(a => a.category).filter(Boolean)); // Filter out undefined/null categories
  return ["All", ...Array.from(uniqueCategories).sort()];
}

// Helper for filtering and searching, can be used by getArticles or client-side
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
