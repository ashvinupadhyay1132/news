
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Article } from "@/lib/placeholder-data";
import ArticleCard from "./article-card";
import useIntersectionObserver from "@/hooks/use-intersection-observer";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation"; // Import usePathname

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

  const displayedArticlesRef = useRef(displayedArticles);
  useEffect(() => { displayedArticlesRef.current = displayedArticles; }, [displayedArticles]);

  const currentPageRef = useRef(currentPage);
  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);

  const pathname = usePathname();


  const fetchArticlesPage = useCallback(async (pageToFetch: number, isInitialLoad: boolean) => {
    if (isInitialLoad) {
      // This will be set by the main effect now
    } else {
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
      if (isInitialLoad) {
        setDisplayedArticles([]); 
      }
      setHasMore(false); 
    } finally {
      if (isInitialLoad) setIsLoadingInitial(false);
      else setIsLoadingMore(false); 
    }
  }, [currentCategory, searchTerm]); 
  
  useEffect(() => {
    const storageKey = `articleGridState::${pathname}::${currentCategory}::${searchTerm}`;
    let restoredState = null;

    if (typeof window !== 'undefined') {
      const storedItem = sessionStorage.getItem(storageKey);
      if (storedItem) {
        try {
          restoredState = JSON.parse(storedItem);
          // Important: Consume the state so it's not reused on a normal filter change or refresh
          sessionStorage.removeItem(storageKey); 
        } catch (e) {
          console.error("[ArticleGrid] Error parsing stored state:", e);
          sessionStorage.removeItem(storageKey); // Clear corrupted item
        }
      }
    }

    if (restoredState) {
      console.log(`[ArticleGrid] Restoring state for key ${storageKey}:`, { 
        articleCount: restoredState.articles?.length, 
        currentPage: restoredState.currentPage, 
        hasMore: restoredState.hasMore, 
        scrollY: restoredState.scrollY 
      });
      setDisplayedArticles(restoredState.articles || []);
      setCurrentPage(restoredState.currentPage || 1);
      setHasMore(restoredState.hasMore === undefined ? true : restoredState.hasMore);
      setIsLoadingInitial(false); // We've restored, not an initial load from API

      // Defer scroll restoration until after React has rendered the restored articles
      setTimeout(() => {
        if (typeof window !== 'undefined' && restoredState && restoredState.scrollY !== undefined) {
          console.log(`[ArticleGrid] Attempting to scroll to ${restoredState.scrollY}`);
          window.scrollTo(0, restoredState.scrollY);
        }
      }, 0); // setTimeout with 0 delay pushes to end of event queue

    } else {
      console.log(`[ArticleGrid] No restored state for ${storageKey} (or filters changed). Resetting and fetching page 1.`);
      setDisplayedArticles([]); 
      setCurrentPage(1);        
      setHasMore(true);         
      setIsLoadingInitial(true); 
      fetchArticlesPage(1, true); 
    }

    // Cleanup function to save state
    return () => {
      if (typeof window !== 'undefined' && displayedArticlesRef.current.length > 0) {
        // Use refs to get the latest state values for saving
        const stateToSave = {
          articles: displayedArticlesRef.current,
          currentPage: currentPageRef.current,
          hasMore: hasMoreRef.current,
          scrollY: window.scrollY,
        };
        console.log(`[ArticleGrid] Saving state for key ${storageKey} on cleanup/unmount:`, { 
            articleCount: stateToSave.articles?.length, 
            currentPage: stateToSave.currentPage,
            hasMore: stateToSave.hasMore,
            scrollY: stateToSave.scrollY 
        });
        try {
            sessionStorage.setItem(storageKey, JSON.stringify(stateToSave));
        } catch (e) {
            console.error("[ArticleGrid] Error saving state to sessionStorage (possibly full):", e);
        }
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCategory, searchTerm, pathname, fetchArticlesPage]); // fetchArticlesPage is stable

  useEffect(() => {
    const canLoadMore = hasMoreRef.current && !isLoadingInitial && !isLoadingMoreRef.current;
    if (entry?.isIntersecting && canLoadMore) {
      console.log(`[ArticleGrid] Intersection Observer Triggered: Attempting to fetch page ${currentPageRef.current + 1}`);
      fetchArticlesPage(currentPageRef.current + 1, false);
    }
  }, [entry, isLoadingInitial, fetchArticlesPage]);

  const handleLoadMoreButtonClick = () => {
    const canLoadMore = hasMoreRef.current && !isLoadingInitial && !isLoadingMoreRef.current;
    console.log(`[ArticleGrid] Load More Button Clicked. State: canLoadMore: ${canLoadMore}, currentPage: ${currentPageRef.current}`);
    if (canLoadMore) {
      console.log(`[ArticleGrid] Load More Button Action: Attempting to fetch page ${currentPageRef.current + 1}`);
      fetchArticlesPage(currentPageRef.current + 1, false);
    }
  };

  if (isLoadingInitial && displayedArticles.length === 0) { 
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: ARTICLES_PER_PAGE }).map((_, index) => (
          <ArticleCardSkeleton key={`initial-load-skeleton-${index}`} />
        ))}
      </div>
    );
  }
  
  if (displayedArticles.length === 0 && !isLoadingInitial) { 
    console.log(`[ArticleGrid] No articles found for display. Active filters - searchTerm: "${searchTerm}", currentCategory: "${currentCategory}".`);
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
