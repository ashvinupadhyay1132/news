
"use client";

import ArticleGrid from "@/components/article-grid";
import CategoryFilter from "@/components/category-filter";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import PageLoading from "./loading";
import { Button } from "@/components/ui/button";

function NewsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const searchTerm = searchParams.get('q') || "";
  const currentCategory = searchParams.get('category') || "All";

  const handleViewAllNews = () => {
    router.push('/');
  };

  const areFiltersActive = searchTerm || currentCategory !== "All";

  let pageTitle = "Latest Articles";
  if (searchTerm) {
    pageTitle = `Search results for "${searchTerm}"`;
  } else if (currentCategory !== "All") {
    // Check if currentCategory already ends with " News" (case-insensitive)
    if (currentCategory.toLowerCase().endsWith(" news")) {
      pageTitle = currentCategory;
    } else {
      pageTitle = `${currentCategory} News`;
    }
  }

  return (
    <div className="space-y-8">
      <CategoryFilter />
      <div>
        <h2 className="text-2xl font-bold mb-6 text-foreground">
          {pageTitle}
        </h2>
        <ArticleGrid searchTerm={searchTerm} currentCategory={currentCategory} />

        {/* Conditionally show the 'View All News' button if filters are active */}
        {areFiltersActive && (
          <div className="mt-12 py-8 text-center border-t border-border">
            <h3 className="text-xl font-semibold mb-4 text-foreground">
              Finished with this view?
            </h3>
            <p className="text-muted-foreground mb-6">
              You're viewing a filtered set of articles.
            </p>
            <Button
              onClick={handleViewAllNews}
              size="lg"
              variant="default"
              className="shadow-md hover:shadow-lg transition-shadow"
            >
              View All Latest News
            </Button>
          </div>
        )}
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
