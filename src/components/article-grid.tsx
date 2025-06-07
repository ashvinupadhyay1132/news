
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

  const isLoadingMoreRef = useRef(isLoadingMore);
  useEffect(() => { isLoadingMoreRef.current = isLoadingMore; }, [isLoadingMore]);

  const hasMoreRef = useRef(hasMore);
  useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);


  const fetchArticlesPage = useCallback(async (pageToFetch: number, isInitialLoad: boolean) => {
    if (isInitialLoad) {
      setIsLoadingInitial(true);
    } else {
      // Guard for loading more: use refs to ensure latest values are checked
      if (isLoadingMoreRef.current || !hasMoreRef.current) {
        console.log(`[ArticleGrid] fetchArticlesPage (more) skipped. isLoadingMore: ${isLoadingMoreRef.current}, hasMore: ${hasMoreRef.current}`);
        return;
      }
      setIsLoadingMore(true); 
    }

    console.log(`[ArticleGrid] Fetching page: ${pageToFetch}. Initial: ${isInitialLoad}. Search: "${searchTerm}", Cat: "${currentCategory}"`);
    const params = new URLSearchParams();
    if (searchTerm) params.set('q', searchTerm);
    if (currentCategory && currentCategory !== "All") params.set('category', currentCategory);
    params.set('page', pageToFetch.toString());
    params.set('limit', ARTICLES_PER_PAGE.toString());
    const apiUrl = `/api/articles?${params.toString()}`;

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`API error! status: ${response.status}, statusText: ${response.statusText || 'N/A'}`);
      }
      const data: { articles: Article[]; totalArticles: number; hasMore: boolean } = await response.json();
      console.log(`[ArticleGrid] API Response for page ${pageToFetch}:`, data);
      
      if (isInitialLoad) {
        setDisplayedArticles(data.articles || []);
      } else {
        setDisplayedArticles((prev) => [...prev, ...(data.articles || [])]);
      }
      setHasMore(data.hasMore); 
      setCurrentPage(pageToFetch);

    } catch (error: any) {
      console.error(
        `[ArticleGrid] Error fetching articles. URL: ${apiUrl}. Error Message: "${error.message}"`,
        "Full error object:", error
      );
      if (String(error.message).toLowerCase().includes('failed to fetch')) {
        console.warn(
            "[ArticleGrid] Hint: 'Failed to fetch' often means the Next.js server is not running, has crashed, or is unreachable from your browser. " +
            "Please check:\n" +
            "1. The terminal where you ran 'npm run dev' (or your server start command) for any server-side errors or crashes.\n" +
            "2. Your browser's network connection and any firewalls/proxies.\n" +
            "3. The browser's network tab for more details on the failed request to " + apiUrl
        );
      }
      // For any error, stop trying to load more for this attempt/sequence
      if (isInitialLoad) {
        setDisplayedArticles([]); // Clear articles on initial load error
      }
      setHasMore(false); 
    } finally {
      if (isInitialLoad) setIsLoadingInitial(false);
      else setIsLoadingMore(false); 
    }
  }, [currentCategory, searchTerm]); // Dependencies are stable values or refs are used internally
  
  useEffect(() => {
    console.log(`[ArticleGrid] Filters changed or component mounted. searchTerm: "${searchTerm}", currentCategory: "${currentCategory}". Resetting and fetching page 1.`);
    setDisplayedArticles([]); 
    setCurrentPage(1);        
    setHasMore(true);         
    setIsLoadingInitial(true); // Ensure loading state is true before fetch
    fetchArticlesPage(1, true); 
  }, [currentCategory, searchTerm, fetchArticlesPage]); // fetchArticlesPage is stable due to useCallback and internal refs

  useEffect(() => {
    const canLoadMore = hasMoreRef.current && !isLoadingInitial && !isLoadingMoreRef.current;
    if (entry?.isIntersecting && canLoadMore) {
      console.log(`[ArticleGrid] Intersection Observer Triggered: Attempting to fetch page ${currentPage + 1}`);
      fetchArticlesPage(currentPage + 1, false);
    }
  }, [entry, isLoadingInitial, currentPage, fetchArticlesPage]); // Add fetchArticlesPage as it's called

  const handleLoadMoreButtonClick = () => {
    // Use refs here for the guards, consistent with intersection observer
    const canLoadMore = hasMoreRef.current && !isLoadingInitial && !isLoadingMoreRef.current;
    console.log(`[ArticleGrid] Load More Button Clicked. State: canLoadMore: ${canLoadMore} (hasMore: ${hasMoreRef.current}, !isLoadingInitial: ${!isLoadingInitial}, !isLoadingMore: ${!isLoadingMoreRef.current}), currentPage: ${currentPage}`);
    if (canLoadMore) {
      console.log(`[ArticleGrid] Load More Button Action: Attempting to fetch page ${currentPage + 1}`);
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
    console.log(`[ArticleGrid] No articles found for display. Active filters - searchTerm: "${searchTerm}", currentCategory: "${currentCategory}". This might indicate an empty database, restrictive filters, or an issue fetching data. Ensure data population process has run successfully and the server is reachable.`);
    return (
      <Alert variant="default" className="mt-8">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Articles Found</AlertTitle>
        <AlertDescription>
          Sorry, we couldn't find any articles matching your criteria. Try adjusting your search or category filters.
          If this is unexpected, ensure the article database has been populated recently and that the server is running correctly and reachable.
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

