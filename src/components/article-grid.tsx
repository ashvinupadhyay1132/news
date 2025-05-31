
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Article } from "@/lib/placeholder-data";
import { getArticles, filterAndSearchArticles } from "@/lib/placeholder-data"; // Import getArticles and filterAndSearchArticles
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
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true); // Start with loading true
  const [isFetchingInitial, setIsFetchingInitial] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const entry = useIntersectionObserver(loadMoreRef, { threshold: 0.5 });

  const fetchAndFilterArticles = useCallback(async () => {
    setIsLoading(true);
    try {
      // Construct query for getArticles
      const query: ParsedUrlQuery = {};
      if (searchTerm) query.q = searchTerm;
      if (currentCategory && currentCategory !== "All") query.category = currentCategory;
      
      const fetchedArticles = await getArticles(query); // Pass query to fetch filtered articles
      setAllFetchedArticles(fetchedArticles); // Store all *filtered* articles based on current search/category
      setDisplayedArticles(fetchedArticles.slice(0, ARTICLES_PER_PAGE));
      setHasMore(fetchedArticles.length > ARTICLES_PER_PAGE);
      setPage(2); // Next page to load will be 2
    } catch (error) {
      console.error("Failed to fetch articles:", error);
      setAllFetchedArticles([]);
      setDisplayedArticles([]);
      setHasMore(false);
    }
    setIsLoading(false);
    setIsFetchingInitial(false);
  }, [currentCategory, searchTerm]);
  
  useEffect(() => {
    setIsFetchingInitial(true);
    fetchAndFilterArticles();
  }, [fetchAndFilterArticles]); // Rerun when searchTerm or currentCategory changes

  const loadMoreDisplayedArticles = useCallback(() => {
    if (isLoading || !hasMore || isFetchingInitial) return;
    setIsLoading(true); 
    
    // Simulate network delay for seeing the skeleton loaders
    setTimeout(() => {
      const nextPageStartIndex = (page - 1) * ARTICLES_PER_PAGE;
      const nextPageEndIndex = page * ARTICLES_PER_PAGE;
      const nextPageArticles = allFetchedArticles.slice(nextPageStartIndex, nextPageEndIndex);
      
      setDisplayedArticles((prev) => [...prev, ...nextPageArticles]);
      setHasMore(allFetchedArticles.length > nextPageEndIndex);
      setPage((prev) => prev + 1);
      setIsLoading(false);
    }, 750); // 750ms delay

  }, [isLoading, hasMore, page, allFetchedArticles, isFetchingInitial]);

  useEffect(() => {
    if (entry?.isIntersecting && hasMore && !isLoading && !isFetchingInitial) {
      loadMoreDisplayedArticles();
    }
  }, [entry, loadMoreDisplayedArticles, hasMore, isLoading, isFetchingInitial]);

  if (isFetchingInitial) { // Initial loading state for the entire grid
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: ARTICLES_PER_PAGE }).map((_, index) => (
          <ArticleCardSkeleton key={`initial-skeleton-${index}`} />
        ))}
      </div>
    );
  }
  
  if (displayedArticles.length === 0 && !isLoading) {
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
          <ArticleCard key={article.id + article.source} article={article} /> // Added source to key for more uniqueness
        ))}
      </div>
      <div ref={loadMoreRef} className="h-auto flex flex-col justify-center items-center mt-8 py-4">
        {isLoading && !isFetchingInitial && (
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
            {Array.from({ length: 3 }).map((_, index) => (
              <ArticleCardSkeleton key={`loading-skeleton-${index}`} />
            ))}
          </div>
        )}
        {!isLoading && !hasMore && displayedArticles.length > 0 && (
          <p className="text-muted-foreground mt-4">You've reached the end!</p>
        )}
      </div>
    </>
  );
};

export default ArticleGrid;
