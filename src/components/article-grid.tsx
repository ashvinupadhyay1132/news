"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Article } from "@/lib/placeholder-data";
import { placeholderArticles } from "@/lib/placeholder-data";
import ArticleCard from "./article-card";
import useIntersectionObserver from "@/hooks/use-intersection-observer";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ArticleGridProps {
  searchTerm: string;
  currentCategory: string;
}

const ARTICLES_PER_PAGE = 9;

const ArticleGrid = ({ searchTerm, currentCategory }: ArticleGridProps) => {
  const [displayedArticles, setDisplayedArticles] = useState<Article[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const entry = useIntersectionObserver(loadMoreRef, { threshold: 0.5 });

  const filterAndSearchArticles = useCallback(() => {
    let filtered = placeholderArticles;

    if (currentCategory !== "All") {
      filtered = filtered.filter(
        (article) => article.category === currentCategory
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
  }, [currentCategory, searchTerm]);
  
  const loadMoreArticles = useCallback(() => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      const allFilteredArticles = filterAndSearchArticles();
      const nextPageArticles = allFilteredArticles.slice(
        (page -1) * ARTICLES_PER_PAGE,
        page * ARTICLES_PER_PAGE
      );
      
      setDisplayedArticles((prev) => page === 1 ? nextPageArticles : [...prev, ...nextPageArticles]);
      setHasMore(allFilteredArticles.length > page * ARTICLES_PER_PAGE);
      setPage((prev) => prev + 1);
      setIsLoading(false);
    }, 500);
  }, [isLoading, hasMore, page, filterAndSearchArticles]);

  useEffect(() => {
    setPage(1);
    setDisplayedArticles([]);
    setHasMore(true);
    // Initial load or when filters change
    // Need to ensure loadMoreArticles uses the latest filter/search terms
    // This effect will trigger loadMoreArticles with new page=1 state
  }, [searchTerm, currentCategory]);

  useEffect(() => {
    // This effect is for the initial load and subsequent loads due to filter changes.
    // It ensures that when searchTerm or currentCategory changes,
    // displayedArticles is reset and the first page of new results is loaded.
    if (page === 1 && hasMore && !isLoading) {
       loadMoreArticles();
    }
  }, [page, hasMore, isLoading, loadMoreArticles]);


  useEffect(() => {
    if (entry?.isIntersecting && hasMore && !isLoading) {
      loadMoreArticles();
    }
  }, [entry, loadMoreArticles, hasMore, isLoading]);

  if (page === 1 && isLoading) { // Initial loading state
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: ARTICLES_PER_PAGE }).map((_, index) => (
          <div key={index} className="flex flex-col space-y-3">
            <Skeleton className="h-[200px] w-full rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-8 w-1/4 mt-2" />
            </div>
          </div>
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
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
      <div ref={loadMoreRef} className="h-10 flex justify-center items-center mt-8">
        {isLoading && (
           <div className="flex items-center space-x-2 text-muted-foreground">
            <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Loading more articles...</span>
          </div>
        )}
        {!hasMore && displayedArticles.length > 0 && (
          <p className="text-muted-foreground">You've reached the end!</p>
        )}
      </div>
    </>
  );
};

export default ArticleGrid;
