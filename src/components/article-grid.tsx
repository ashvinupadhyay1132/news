
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Article } from "@/lib/placeholder-data";
import ArticleCard from "./article-card";
import useIntersectionObserver from "@/hooks/use-intersection-observer";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";


interface ArticleGridProps {
  searchTerm: string;
  currentCategory: string;
}

const ARTICLES_PER_PAGE = 9;

const ArticleCardSkeleton = () => (
  <div className="flex flex-col space-y-3 p-4 border rounded-lg bg-card">
    <Skeleton className="h-48 w-full rounded-md" />
    <Skeleton className="h-4 w-20 mt-2" />
    <Skeleton className="h-6 w-full" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-3/4" />
    <div className="flex justify-between items-center pt-2 mt-auto">
      <div className="space-y-1">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-9 w-24" />
    </div>
  </div>
);


const ArticleGrid = ({ searchTerm, currentCategory }: ArticleGridProps) => {
  const [displayedArticles, setDisplayedArticles] = useState<Article[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const [isLoadingInitial, setIsLoadingInitial] = useState(true); 
  const [isLoadingMore, setIsLoadingMore] = useState(false); 

  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const entry = useIntersectionObserver(loadMoreRef, { threshold: 0.1 });

  const fetchArticlesPage = useCallback(async (pageToFetch: number, isInitialLoad: boolean) => {
    if (isInitialLoad) {
      setIsLoadingInitial(true);
    } else {
      if (isLoadingMore || !hasMore) return;
      setIsLoadingMore(true);
    }

    const params = new URLSearchParams();
    if (searchTerm) params.set('q', searchTerm);
    if (currentCategory && currentCategory !== "All") params.set('category', currentCategory);
    params.set('page', pageToFetch.toString());
    params.set('limit', ARTICLES_PER_PAGE.toString());
    const apiUrl = `/api/articles?${params.toString()}`;

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`API error! status: ${response.status}, statusText: ${response.statusText}`);
      }
      const data: { articles: Article[]; totalArticles: number; hasMore: boolean } = await response.json();

      if (isInitialLoad) {
        setDisplayedArticles(data.articles || []);
      } else {
        setDisplayedArticles((prev) => [...prev, ...(data.articles || [])]);
      }
      setHasMore(data.hasMore);
      setCurrentPage(pageToFetch);

    } catch (error: any) {
      console.error(
        `[ArticleGrid] Error fetching articles. URL: ${apiUrl}. Error Message:`,
        error.message,
        "Full error object:", error
      );
      if (error.message.toLowerCase().includes('failed to fetch')) {
        console.warn("[ArticleGrid] Hint: This 'Failed to fetch' error often indicates the server is not running, is unreachable, or there's a network issue. Please check your Next.js server status and your network connection. Also, check the browser's network tab for more details on the failed request.");
      }
      if (isInitialLoad) {
        setDisplayedArticles([]);
      }
      setHasMore(false);
    } finally {
      if (isInitialLoad) setIsLoadingInitial(false);
      else setIsLoadingMore(false);
    }
  }, [currentCategory, searchTerm, isLoadingMore, hasMore]); 
  
  useEffect(() => {
    setDisplayedArticles([]);
    setCurrentPage(1);
    setHasMore(true);
    fetchArticlesPage(1, true);
  }, [currentCategory, searchTerm, fetchArticlesPage]);

  useEffect(() => {
    if (entry?.isIntersecting && hasMore && !isLoadingInitial && !isLoadingMore) {
      fetchArticlesPage(currentPage + 1, false);
    }
  }, [entry, hasMore, isLoadingInitial, isLoadingMore, currentPage, fetchArticlesPage]);

  const handleLoadMoreButtonClick = () => {
    if (hasMore && !isLoadingInitial && !isLoadingMore) {
      fetchArticlesPage(currentPage + 1, false);
    }
  };

  if (isLoadingInitial) { 
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: ARTICLES_PER_PAGE }).map((_, index) => (
          <ArticleCardSkeleton key={`initial-load-skeleton-${index}`} />
        ))}
      </div>
    );
  }
  
  if (displayedArticles.length === 0 && !isLoadingInitial) {
    console.log(`[ArticleGrid] No articles found for display. Active filters - searchTerm: "${searchTerm}", currentCategory: "${currentCategory}". This might indicate an empty database, restrictive filters, or an issue fetching data. Ensure /api/admin/update-articles has been run successfully to populate the database.`);
    return (
      <Alert variant="default" className="mt-8">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Articles Found</AlertTitle>
        <AlertDescription>
          Sorry, we couldn't find any articles matching your criteria. Try adjusting your search or category filters.
          If this is unexpected, ensure the article database has been populated recently (e.g., by triggering the update process).
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
        {displayedArticles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
      
      <div ref={loadMoreRef} className="h-auto flex flex-col justify-center items-center mt-8 py-4 min-h-[50px]">
        {isLoadingMore && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
            {Array.from({ length: 3 }).map((_, index) => (
              <ArticleCardSkeleton key={`loading-more-skeleton-${index}`} />
            ))}
          </div>
        )}
        {hasMore && !isLoadingMore && displayedArticles.length > 0 && (
           <Button onClick={handleLoadMoreButtonClick} disabled={isLoadingMore}>
            {isLoadingMore ? "Loading More..." : "View More Articles"}
          </Button>
        )}
        {!hasMore && displayedArticles.length > 0 && !isLoadingMore && (
          <p className="text-muted-foreground mt-4">You've reached the end!</p>
        )}
      </div>
    </>
  );
};

export default ArticleGrid;
