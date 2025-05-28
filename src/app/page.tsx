"use client"; 

import ArticleGrid from "@/components/article-grid";
import CategoryFilter from "@/components/category-filter";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import PageLoading from "./loading"; 

function NewsPageContent() {
  const searchParams = useSearchParams();
  const searchTerm = searchParams.get('q') || "";
  const currentCategory = searchParams.get('category') || "All";

  // The actual data fetching and primary filtering (if done server-side via getArticles)
  // now happens within ArticleGrid and CategoryFilter (for categories list).
  // This component mainly orchestrates the UI based on search params.

  return (
    <div className="space-y-8">
      <CategoryFilter /> 
      <div>
        <h2 className="text-2xl font-bold mb-6 text-foreground">
          {searchTerm ? `Search results for "${searchTerm}"` : 
           currentCategory !== "All" ? `${currentCategory} News` : "Latest Articles"}
        </h2>
        <ArticleGrid searchTerm={searchTerm} currentCategory={currentCategory} />
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    // Suspense key helps re-trigger when searchParams change for NewsPageContent
    // if NewsPageContent itself were doing top-level data fetching.
    // However, data fetching is now deeper in ArticleGrid/CategoryFilter with their own loading states.
    // The main PageLoading is for the initial shell.
    <Suspense fallback={<PageLoading />}>
      <NewsPageContent />
    </Suspense>
  );
}
