
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Article } from "@/lib/placeholder-data";
import { getArticles } from "@/lib/placeholder-data"; 
import ArticleCard from "./article-card";
import useIntersectionObserver from "@/hooks/use-intersection-observer";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { ParsedUrlQuery } from 'querystring';


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
  const [allFetchedArticles, setAllFetchedArticles] = useState<Article[]>([]);
  const [displayedArticles, setDisplayedArticles] = useState<Article[]>([]);
  const [page, setPage] = useState(1); // Next page to fetch for pagination
  const [hasMore, setHasMore] = useState(true);
  
  // isLoadingDataForFilter is true when fetching for a new category/search (initial or subsequent)
  const [isLoadingDataForFilter, setIsLoadingDataForFilter] = useState(true); 
  // isFetchingMoreItems is true only when loading more items via infinite scroll for the current filter
  const [isFetchingMoreItems, setIsFetchingMoreItems] = useState(false); 

  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const entry = useIntersectionObserver(loadMoreRef, { threshold: 0.5 });

  // Fetches articles when the filter (category/search) changes or on initial load
  const fetchArticlesForCurrentFilter = useCallback(async () => {
    setIsLoadingDataForFilter(true); 
    try {
      const query: ParsedUrlQuery = {};
      if (searchTerm) query.q = searchTerm;
      if (currentCategory && currentCategory !== "All") query.category = currentCategory;
      
      const fetchedArticles = await getArticles(query);
      setAllFetchedArticles(fetchedArticles);
      setDisplayedArticles(fetchedArticles.slice(0, ARTICLES_PER_PAGE));
      setHasMore(fetchedArticles.length > ARTICLES_PER_PAGE);
      setPage(2); // Reset to page 2 for the next set of items to load
    } catch (error) {
      console.error("Failed to fetch articles:", error);
      setAllFetchedArticles([]);
      setDisplayedArticles([]);
      setHasMore(false);
    }
    setIsLoadingDataForFilter(false);
  }, [currentCategory, searchTerm]);
  
  useEffect(() => {
    fetchArticlesForCurrentFilter();
  }, [fetchArticlesForCurrentFilter]); // Re-run when currentCategory or searchTerm changes

  // Loads more articles for the current filter (infinite scroll)
  const loadMoreDisplayedArticles = useCallback(() => {
    // Prevent loading more if already fetching more, or if a new filter is being loaded, or no more articles
    if (isFetchingMoreItems || isLoadingDataForFilter || !hasMore) return;
    
    setIsFetchingMoreItems(true); 
    
    // Simulate network delay for seeing the skeleton loaders
    setTimeout(() => {
      const nextPageStartIndex = (page - 1) * ARTICLES_PER_PAGE;
      const nextPageEndIndex = page * ARTICLES_PER_PAGE;
      const nextPageArticles = allFetchedArticles.slice(nextPageStartIndex, nextPageEndIndex);
      
      setDisplayedArticles((prev) => [...prev, ...nextPageArticles]);
      setHasMore(allFetchedArticles.length > nextPageEndIndex);
      setPage((prev) => prev + 1);
      setIsFetchingMoreItems(false);
    }, 750);

  }, [isFetchingMoreItems, isLoadingDataForFilter, hasMore, page, allFetchedArticles]);

  useEffect(() => {
    if (entry?.isIntersecting && hasMore && !isFetchingMoreItems && !isLoadingDataForFilter) {
      loadMoreDisplayedArticles();
    }
  }, [entry, loadMoreDisplayedArticles, hasMore, isFetchingMoreItems, isLoadingDataForFilter]);

  // Show full grid skeleton if loading data for a new filter (initial or subsequent filter change)
  if (isLoadingDataForFilter) { 
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: ARTICLES_PER_PAGE }).map((_, index) => (
          <ArticleCardSkeleton key={`filter-load-skeleton-${index}`} />
        ))}
      </div>
    );
  }
  
  // If not loading and no articles are found for the current filter
  if (displayedArticles.length === 0 && !isLoadingDataForFilter) {
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
        {displayedArticles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
      <div ref={loadMoreRef} className="h-auto flex flex-col justify-center items-center mt-8 py-4">
        {/* Show 3 skeletons only when fetching more items for infinite scroll */}
        {isFetchingMoreItems && (
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
            {Array.from({ length: 3 }).map((_, index) => (
              <ArticleCardSkeleton key={`loading-more-skeleton-${index}`} />
            ))}
          </div>
        )}
        {/* Show "end" message only if not loading more, not loading new filter, no more articles, and some articles were displayed */}
        {!isFetchingMoreItems && !isLoadingDataForFilter && !hasMore && displayedArticles.length > 0 && (
          <p className="text-muted-foreground mt-4">You've reached the end!</p>
        )}
      </div>
    </>
  );
};

export default ArticleGrid;
