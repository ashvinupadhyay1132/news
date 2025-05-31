
'use server';

import { fetchArticlesFromAllSources } from './rss-service';
import { slugify } from './utils';

// Define and export the Article interface
export interface Article {
  id: string;
  title: string;
  summary:string;
  date: string; // ISO string
  source: string;
  category: string;
  imageUrl: string | null; // Can be null
  link: string; // Internal app link: /category/id
  sourceLink: string; // Original article link from the RSS feed
  content?: string; // Full content, often HTML from RSS
  fetchedAt?: string; // ISO string, can be added by rss-service
}

export async function getArticles(
  searchTerm?: string,
  currentCategory?: string,
  isForCategoriesOnly: boolean = false,
  fetchOgImagesParam: boolean = true // Default changed back to true
): Promise<Article[]> {
  const liveArticles = await fetchArticlesFromAllSources(isForCategoriesOnly, fetchOgImagesParam);
  return filterAndSearchArticles(liveArticles, searchTerm, currentCategory);
}

export async function getArticleById(id: string): Promise<Article | undefined> {
  // When fetching a single article, always get the full version with OG images
  const articles = await getArticles(undefined, undefined, false, true); 
  return articles.find(article => article.id === id);
}

export async function getCategories(): Promise<string[]> {
  // Use lightweight mode for categories; OG images are not needed here.
  const articles = await getArticles(undefined, undefined, true, false); 
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
        (article.summary && article.summary !== "For category generation" && article.summary.toLowerCase().includes(lowerSearchTerm)) ||
        (article.category && article.category.toLowerCase().includes(lowerSearchTerm)) ||
        (article.source && article.source.toLowerCase().includes(lowerSearchTerm))
    );
  }
  return filtered;
}

