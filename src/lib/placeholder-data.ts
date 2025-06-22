
'use server';

import { cache } from 'react';
import { unstable_noStore as noStore } from 'next/cache';
import { getArticlesCollection } from './mongodb';
import type { Article as RssArticle } from './rss-service'; // RssArticle might be an alias for ArticleInterface now
import { fetchArticlesFromAllSources, type FetchArticlesResult, type ArticleUpdateStats } from './rss-service';
import { ObjectId } from 'mongodb';


export interface Article {
  id: string; 
  _id?: ObjectId | string; 
  title: string;
  summary: string;
  date: string; 
  source: string;
  category: string;
  imageUrl: string | null;
  link: string; 
  sourceLink: string; 
  content?: string;
  fetchedAt?: string; 
  createdAt?: string; 
}

function mapMongoDocToArticle(doc: any): Article {
  let imageUrlFromDb = doc.imageUrl;
  if (typeof imageUrlFromDb === 'string') {
    const trimmedUrl = imageUrlFromDb.trim();
    if (trimmedUrl === '' || trimmedUrl.toLowerCase() === 'null' || (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://'))) {
      imageUrlFromDb = null;
    } else {
      imageUrlFromDb = trimmedUrl;
    }
  } else if (imageUrlFromDb !== null) {
    imageUrlFromDb = null;
  }

  return {
    id: doc.id || `missing-id-${doc._id?.toString() || Math.random().toString(36).substring(7)}`,
    _id: doc._id?.toString(),
    title: doc.title || "Untitled Article",
    summary: doc.summary || "No summary available.",
    date: doc.date ? new Date(doc.date).toISOString() : new Date(0).toISOString(),
    source: doc.source || "Unknown Source",
    category: doc.category || "General",
    imageUrl: imageUrlFromDb,
    link: doc.link || "/",
    sourceLink: doc.sourceLink || "#",
    content: doc.content,
    fetchedAt: doc.fetchedAt ? new Date(doc.fetchedAt).toISOString() : undefined,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : undefined,
  };
}

export async function getArticles(
  searchTerm?: string,
  currentCategory?: string,
  page: number = 1,
  limit: number = 9,
  excludeIds?: string
): Promise<{ articles: Article[]; totalArticles: number; hasMore: boolean }> {
  noStore(); // Explicitly opt out of data caching
  const mongoQuery: any = {};
  if (currentCategory && currentCategory !== "All") {
    mongoQuery.category = { $regex: new RegExp(`^${currentCategory}$`, 'i') };
  }
  if (searchTerm) {
    const lowerSearchTerm = searchTerm.toLowerCase();
    mongoQuery.$or = [
      { title: { $regex: lowerSearchTerm, $options: 'i' } },
      { summary: { $regex: lowerSearchTerm, $options: 'i' } },
      { source: { $regex: lowerSearchTerm, $options: 'i' } },
    ];
  }

  if (excludeIds) {
    const idsToExclude = excludeIds.split(',').filter(id => id.trim() !== '');
    if (idsToExclude.length > 0) {
      mongoQuery.id = { $nin: idsToExclude };
    }
  }

  try {
    const articlesCollection = await getArticlesCollection();
    const skipAmount = (page - 1) * limit;

    const articlesFromDb = await articlesCollection
      .find(mongoQuery)
      .sort({ date: -1 }) 
      .skip(skipAmount)
      .limit(limit)
      .toArray();

    const totalArticlesInQuery = await articlesCollection.countDocuments(mongoQuery);

    const mappedArticles = articlesFromDb.map(mapMongoDocToArticle);

    const hasMore = (skipAmount + mappedArticles.length) < totalArticlesInQuery;

    return {
      articles: mappedArticles,
      totalArticles: totalArticlesInQuery,
      hasMore: hasMore,
    };
  } catch (error) {
    console.error("[DB PlaceholderData] CRITICAL ERROR in getArticles fetching from MongoDB:", error);
    return { articles: [], totalArticles: 0, hasMore: false };
  }
}

export const getArticleById = cache(async (id: string): Promise<Article | undefined> => {
  try {
    const articlesCollection = await getArticlesCollection();
    let articleDoc = await articlesCollection.findOne({ id: id });
    
    if (!articleDoc && ObjectId.isValid(id)) {
        articleDoc = await articlesCollection.findOne({ _id: new ObjectId(id) });
    }

    if (articleDoc) {
      return mapMongoDocToArticle(articleDoc);
    }
    console.warn(`[DB PlaceholderData] getArticleById - Article not found for ID: ${id}`);
    return undefined;
  } catch (error) {
    console.error(`[DB PlaceholderData] Error fetching article by ID (${id}) from MongoDB:`, error);
    return undefined;
  }
});

export async function getCategories(): Promise<string[]> {
  try {
    const articlesCollection = await getArticlesCollection();
    const distinctCategories = await articlesCollection.distinct('category');
    const categories = distinctCategories.filter((category): category is string => typeof category === 'string' && category.trim() !== '');

    if (categories.length === 0) {
      const fetchResult: FetchArticlesResult = await fetchArticlesFromAllSources(true, false, false); 
      const rssArticlesForCategories = fetchResult.articles;
      if (Array.isArray(rssArticlesForCategories) && rssArticlesForCategories.length > 0 && 'category' in rssArticlesForCategories[0]) {
        const uniqueRssCategories = new Set(rssArticlesForCategories.map(a => a.category).filter(Boolean));
        const sortedRssCategories = ["All", ...Array.from(uniqueRssCategories).sort()];
        if (sortedRssCategories.length > 1) {
          return sortedRssCategories;
        }
      }
      return ["All", "General"];
    }
    const finalCategories = ["All", ...categories.sort()];
    return finalCategories;
  } catch (error) {
    console.error("[DB PlaceholderData] Error fetching categories from MongoDB:", error);
    return ["All", "General"];
  }
}

export async function updateArticlesFromRssAndSaveToDb(): Promise<ArticleUpdateStats | undefined> {
  console.log("[PlaceholderData] updateArticlesFromRssAndSaveToDb - Process STARTED.");
  try {
    const articlesCollection = await getArticlesCollection();
    const count = await articlesCollection.countDocuments();
    console.log(`[PlaceholderData] Current article count in DB before update: ${count}`);
    let articleProcessingLimit: number | undefined = undefined;

    let fetchResult: FetchArticlesResult;
    if (count === 0) {
      console.log("[PlaceholderData] Database is EMPTY. Proceeding with initial population (limit: 150 articles).");
      articleProcessingLimit = 150;
      fetchResult = await fetchArticlesFromAllSources(false, true, true, articleProcessingLimit);
    } else {
      fetchResult = await fetchArticlesFromAllSources(false, true, true);
    }
    
    console.log("[PlaceholderData] Feed update fetch/save attempt FINISHED.");

    const countAfter = await articlesCollection.countDocuments();
    console.log(`[PlaceholderData] Article count in DB after update: ${countAfter}`);
    console.log("[PlaceholderData] updateArticlesFromRssAndSaveToDb - Process COMPLETED successfully.");
    return fetchResult.stats;
  } catch (error) {
    console.error("[PlaceholderData] CRITICAL ERROR in updateArticlesFromRssAndSaveToDb:", error);
    return { newlyAddedCount: 0, processedInBatch: 0, skippedBySourceLink: 0, skippedByTitle: 0 };
  }
}
