"use client"; // This page uses client-side hooks for search params

import ArticleGrid from "@/components/article-grid";
import CategoryFilter from "@/components/category-filter";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import PageLoading from "./loading"; // Import the loading component

function NewsPageContent() {
  const searchParams = useSearchParams();
  const searchTerm = searchParams.get('q') || "";
  const currentCategory = searchParams.get('category') || "All";

  return (
    <div className="space-y-8">
      <CategoryFilter currentCategory={currentCategory} />
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
    <Suspense fallback={<PageLoading />}>
      <NewsPageContent />
    </Suspense>
  );
}
