
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Article } from "@/lib/placeholder-data";
import ArticleCard from "./article-card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";

interface ArticleGridProps {
  searchTerm: string;
  currentCategory: string;
  excludeIds?: string;
}

const ARTICLES_PER_PAGE = 9;

const ArticleCardSkeleton = () => (
  <div className="flex flex-col space-y-3">
    <Skeleton className="h-48 w-full rounded-md" />
    <Skeleton className="h-4 w-1/3" />
    <Skeleton className="h-6 w-full" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-3/4" />
  </div>
);

const ArticleGrid = ({ searchTerm, currentCategory, excludeIds }: ArticleGridProps) => {
  const [displayedArticles, setDisplayedArticles] = useState<Article[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const pathname = usePathname(); 
  const requestCounterRef = useRef(0); 

  const getSessionStorageKeyBase = useCallback(() => {
    return `articleGrid_${pathname}_${currentCategory}_${searchTerm}_${excludeIds || 'no-exclude'}`;
  }, [pathname, currentCategory, searchTerm, excludeIds]);

  const fetchArticlesPage = useCallback(async (pageToFetch: number, isInitialLoad: boolean) => {
    const currentRequestId = ++requestCounterRef.current;
    
    if (isInitialLoad) {
      setIsLoadingInitial(true);
      setError(null); // Clear previous errors on new initial load
    } else {
      setIsLoadingMore(true);
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError("Network connection is unavailable. Please check your internet connection and try again.");
      if (isInitialLoad) setIsLoadingInitial(false); else setIsLoadingMore(false);
      if (isInitialLoad && currentRequestId === requestCounterRef.current) {
          setDisplayedArticles([]);
      }
      return;
    }

    const params = new URLSearchParams();
    if (searchTerm) params.set('q', searchTerm);
    if (currentCategory && currentCategory !== "All") params.set('category', currentCategory);
    if (excludeIds) params.set('excludeIds', excludeIds);
    params.set('page', pageToFetch.toString());
    params.set('limit', ARTICLES_PER_PAGE.toString());
    const apiUrl = `/api/articles?${params.toString()}`;

    try {
      const response = await fetch(apiUrl); 
      
      if (currentRequestId !== requestCounterRef.current) {
        if (isInitialLoad) setIsLoadingInitial(false); else setIsLoadingMore(false);
        return; 
      }

      if (!response.ok) {
        let errorDetails = `Status: ${response.status}. StatusText: ${response.statusText || 'N/A'}. URL: ${apiUrl}`;
        let errorBodyText = "";
        try {
          errorBodyText = await response.text(); 
          errorDetails += ` Body: ${errorBodyText.substring(0, 500)}`; 
        } catch (bodyError) {
          errorDetails += " Could not read error response body.";
        }
        console.error(`[ArticleGrid] API Error: ${errorDetails}`);
        throw new Error(`API error! ${errorDetails}`);
      }
      
      const data: { articles: Article[]; totalArticles: number; hasMore: boolean } = await response.json();
      
      const storageKeyBase = getSessionStorageKeyBase();
      const articlesStorageKey = `${storageKeyBase}_articles`;
      const pageStorageKey = `${storageKeyBase}_page`;
      const hasMoreStorageKey = `${storageKeyBase}_hasMore`;

      setDisplayedArticles((prevArticles) => {
        const articlesToUpdate = isInitialLoad ? [] : prevArticles;
        const existingIds = new Set(articlesToUpdate.map(a => a.id));
        const newUniqueArticles = (data.articles || []).filter(
          (article) => article && article.id && !existingIds.has(article.id)
        );
        const updatedArticles = [...articlesToUpdate, ...newUniqueArticles];
        
        if (typeof window !== "undefined") {
          sessionStorage.setItem(articlesStorageKey, JSON.stringify(updatedArticles));
        }
        return updatedArticles;
      });
      setHasMore(data.hasMore);
      setCurrentPage(pageToFetch);
      setError(null); 

      if (typeof window !== "undefined") {
        sessionStorage.setItem(pageStorageKey, JSON.stringify(pageToFetch));
        sessionStorage.setItem(hasMoreStorageKey, JSON.stringify(data.hasMore));
      }

    } catch (fetchError: any) {
       if (currentRequestId !== requestCounterRef.current) {
        return; 
      }
      let specificMessage = `Failed to fetch articles. Error: ${fetchError.message || 'Unknown fetch error'}.`;
      if (fetchError instanceof TypeError && fetchError.message.toLowerCase().includes('failed to fetch')) {
        specificMessage = "Could not connect to the server to fetch articles. Please check your internet connection or try again later.";
      }
      console.error(`[ArticleGrid] Fetch Error: ${specificMessage}`, fetchError.stack ? fetchError.stack : fetchError);
      setError(specificMessage); 

      if (isInitialLoad) {
        setDisplayedArticles([]); 
      }
    } finally {
       if (currentRequestId !== requestCounterRef.current) {
        return;
      }
      if (isInitialLoad) {
        setIsLoadingInitial(false);
      } else {
        setIsLoadingMore(false);
      }
    }
  }, [currentCategory, searchTerm, getSessionStorageKeyBase, excludeIds]);

  useEffect(() => {
    const storageKeyBase = getSessionStorageKeyBase();
    const articlesStorageKey = `${storageKeyBase}_articles`;
    const pageStorageKey = `${storageKeyBase}_page`;
    const hasMoreStorageKey = `${storageKeyBase}_hasMore`;
    
    requestCounterRef.current++; 
    
    if (typeof window !== "undefined") {
      try {
        const storedArticlesJSON = sessionStorage.getItem(articlesStorageKey);
        const storedPageJSON = sessionStorage.getItem(pageStorageKey);
        const storedHasMoreJSON = sessionStorage.getItem(hasMoreStorageKey);

        if (storedArticlesJSON && storedPageJSON && storedHasMoreJSON) {
          const storedArticles = JSON.parse(storedArticlesJSON);
          const storedPage = JSON.parse(storedPageJSON);
          const storedHasMore = JSON.parse(storedHasMoreJSON);

          if (Array.isArray(storedArticles) && storedArticles.length >= 0 && typeof storedPage === 'number' && typeof storedHasMore === 'boolean') {
            setDisplayedArticles(storedArticles);
            setCurrentPage(storedPage);
            setHasMore(storedHasMore);
            setIsLoadingInitial(false);
            setError(null);
            return; 
          } else {
            sessionStorage.removeItem(articlesStorageKey);
            sessionStorage.removeItem(pageStorageKey);
            sessionStorage.removeItem(hasMoreStorageKey);
          }
        }
      } catch (e) {
        console.error("[ArticleGrid] Error reading from session storage:", e);
        sessionStorage.removeItem(articlesStorageKey);
        sessionStorage.removeItem(pageStorageKey);
        sessionStorage.removeItem(hasMoreStorageKey);
      }
    }

    setDisplayedArticles([]); 
    setCurrentPage(1);      
    setHasMore(true);       
    setError(null);         
    fetchArticlesPage(1, true); 
  }, [currentCategory, searchTerm, pathname, fetchArticlesPage, getSessionStorageKeyBase, excludeIds]); 


  const handleLoadMoreButtonClick = () => {
    const canLoadMore = hasMore && !isLoadingInitial && !isLoadingMore;
    if (canLoadMore) {
      fetchArticlesPage(currentPage + 1, false);
    }
  };

  if (isLoadingInitial && displayedArticles.length === 0 && !error) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {Array.from({ length: ARTICLES_PER_PAGE }).map((_, index) => (
          <ArticleCardSkeleton key={`initial-load-skeleton-${index}`} />
        ))}
      </div>
    );
  }
  
  if (error && displayedArticles.length === 0) {
    return (
      <Alert variant="destructive" className="mt-8">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Articles</AlertTitle>
        <AlertDescription>
          {error}
          <br />
          Please ensure your internet connection is stable and try again.
          <Button onClick={() => { setError(null); fetchArticlesPage(1, true); }} variant="outline" size="sm" className="mt-4">
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (displayedArticles.length === 0 && !isLoadingInitial && !isLoadingMore && !error) {
    return (
      <Alert variant="default" className="mt-8">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Articles Found</AlertTitle>
        <AlertDescription>
          Sorry, we couldn't find any articles matching your criteria. Try adjusting your search or category filters.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
        {displayedArticles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>

      <div className="h-auto flex flex-col justify-center items-center mt-12 py-4 min-h-[50px]">
        {isLoadingMore && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
            {Array.from({ length: 3 }).map((_, index) => (
              <ArticleCardSkeleton key={`loading-more-skeleton-${index}`} />
            ))}
          </div>
        )}
        {hasMore && !isLoadingInitial && displayedArticles.length > 0 && !isLoadingMore && !error && (
          <Button onClick={handleLoadMoreButtonClick} variant="secondary" size="lg" disabled={isLoadingMore}>
            Load More
          </Button>
        )}
        {!hasMore && displayedArticles.length > 0 && !isLoadingMore && !error && (
          <p className="text-muted-foreground mt-4">You've reached the end!</p>
        )}
         {error && displayedArticles.length > 0 && ( 
            <div className="mt-4 text-center">
                <p className="text-destructive text-sm mb-2">{error}</p>
                <Button onClick={() => { setError(null); handleLoadMoreButtonClick(); }} variant="outline" size="sm" disabled={isLoadingMore}>
                    Retry Loading More
                </Button>
            </div>
        )}
      </div>
    </>
  );
};

export default ArticleGrid;
