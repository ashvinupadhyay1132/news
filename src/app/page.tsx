
"use client";

import ArticleGrid from "@/components/article-grid";
import CategoryFilter from "@/components/category-filter";
import { useSearchParams, useRouter } from "next/navigation"; // Added useRouter
import { Suspense } from "react";
import PageLoading from "./loading";
import { Button } from "@/components/ui/button"; // Added Button import

function NewsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter(); // Initialize router
  const searchTerm = searchParams.get('q') || "";
  const currentCategory = searchParams.get('category') || "All";

  const handleViewAllNews = () => {
    // Navigate to the base URL, effectively clearing category and search query params
    // and making the ArticleGrid show all news.
    router.push('/');
  };

  return (
    <div className="space-y-8">
      <CategoryFilter />
      <div>
        <h2 className="text-2xl font-bold mb-6 text-foreground">
          {searchTerm ? `Search results for "${searchTerm}"` :
           currentCategory !== "All" ? `${currentCategory} News` : "Latest Articles"}
        </h2>
        <ArticleGrid searchTerm={searchTerm} currentCategory={currentCategory} />

        {/* Button to reset to 'All News' view - always visible after the grid */}
        <div className="mt-12 py-8 text-center border-t border-border"> {/* Added padding, border-top for separation */}
          <h3 className="text-xl font-semibold mb-4 text-foreground">Want to see more?</h3>
          <Button
            onClick={handleViewAllNews}
            size="lg"
            variant="default" 
            className="shadow-md hover:shadow-lg transition-shadow"
          >
            View All Latest News
          </Button>
        </div>
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
