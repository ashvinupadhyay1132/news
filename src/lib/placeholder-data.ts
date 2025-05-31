
'use server';

import { fetchArticlesFromAllSources } from './rss-service';
import { slugify } from './utils';

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
  fetchedAt?: string; // ISO string, can be added by rss-service
}

export async function getArticles(searchTerm?: string, currentCategory?: string): Promise<Article[]> {
  // console.log("[Placeholder Data] Fetching live articles as DB is removed.");
  const liveArticles = await fetchArticlesFromAllSources();
  return filterAndSearchArticles(liveArticles, searchTerm, currentCategory);
}

export async function getArticleById(id: string): Promise<Article | undefined> {
  // console.log(`[Placeholder Data] Fetching all articles to find ID: ${id} (DB removed).`);
  const articles = await getArticles(); // This will fetch all live articles
  return articles.find(article => article.id === id);
}

export async function getCategories(): Promise<string[]> {
  const articles = await getArticles(); // This will fetch all live articles
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
        (article.category && article.category.toLowerCase().includes(lowerSearchTerm)) ||
        (article.source && article.source.toLowerCase().includes(lowerSearchTerm))
    );
  }
  return filtered;
}
