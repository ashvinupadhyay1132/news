
"use client";

import ArticleGrid from "@/components/article-grid";
import CategoryFilter from "@/components/category-filter";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import PageLoading from "./loading";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function NewsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const searchTerm = searchParams.get('q') || "";
  const currentCategory = searchParams.get('category') || "All";
  const refreshSignal = searchParams.get('refreshSignal'); 

  const [isRefreshingButtonDisabled, setIsRefreshingButtonDisabled] = useState(false);
  const [pageTitle, setPageTitle] = useState("Latest Articles");
  const [refreshKey, setRefreshKey] = useState(0); 

  useEffect(() => {
    let title = "Latest Articles";
    if (searchTerm) {
      title = `Search results for "${searchTerm}"`;
    } else if (currentCategory !== "All") {
      if (currentCategory.toLowerCase().endsWith(" news")) {
        title = currentCategory;
      } else {
        title = `${currentCategory} News`;
      }
    }
    setPageTitle(title);
  }, [searchTerm, currentCategory]);

  useEffect(() => {
    if (refreshSignal) { 
      setRefreshKey(prevKey => prevKey + 1);
    }
  }, [refreshSignal]); 


  const handleViewAllNews = () => {
    router.push('/');
  };

  const handleRefreshView = async () => {
    setIsRefreshingButtonDisabled(true);
    toast({
      title: 'Checking for new articles...',
      description: 'This may take a moment.',
    });

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        toast({
            title: 'Network Error',
            description: 'Feed update check failed. Please check your internet connection.',
            variant: 'destructive',
        });
        setIsRefreshingButtonDisabled(false);
        return;
    }

    try {
      const response = await fetch('/api/admin/update-feed', {
        method: 'POST',
      });
      const result = await response.json();

      if (response.ok && result.success) {
        if (result.newArticlesCount > 0) {
          toast({
            title: 'Update Successful!',
            description: `${result.newArticlesCount} new articles added. Refreshing view...`,
          });

          // Clear session storage for the current view to force ArticleGrid to fetch new data
          if (typeof window !== "undefined") {
            const sessionStorageKeyBase = `articleGrid_${pathname}_${currentCategory}_${searchTerm}`;
            sessionStorage.removeItem(`${sessionStorageKeyBase}_articles`);
            sessionStorage.removeItem(`${sessionStorageKeyBase}_page`);
            sessionStorage.removeItem(`${sessionStorageKeyBase}_hasMore`);
            console.log(`[Page Refresh] Cleared session storage for key base: ${sessionStorageKeyBase} due to new articles.`);
          }
          setRefreshKey(prevKey => prevKey + 1); // Trigger ArticleGrid re-render
        } else {
          toast({
            title: 'Feed Already Updated',
            description: 'No new articles found in this check.',
          });
        }
      } else {
        throw new Error(result.message || 'Failed to check for feed updates.');
      }
    } catch (error: any) {
      let specificMessage = error.message || 'Could not check for new articles.';
       if (error instanceof TypeError && error.message.toLowerCase().includes('failed to fetch')) {
        specificMessage = "Network error: Could not check for feed updates. Please check your connection and try again.";
      }
      toast({
        title: 'Update Check Failed',
        description: specificMessage,
        variant: 'destructive',
      });
    } finally {
      setIsRefreshingButtonDisabled(false);
    }
  };


  const areFiltersActive = searchTerm || currentCategory !== "All";

  return (
    <div className="space-y-8">
      <CategoryFilter />
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            {pageTitle}
          </h2>
          <Button
            onClick={handleRefreshView}
            variant="outline"
            disabled={isRefreshingButtonDisabled}
            className="h-10 px-4 self-end sm:self-center" // Changed self-start to self-end
            title="Refresh View"
          >
            <RefreshCcw className={`mr-2 h-5 w-5 ${isRefreshingButtonDisabled ? 'animate-spin' : ''}`} />
            <span> 
              {isRefreshingButtonDisabled ? 'Checking...' : 'Refresh'}
            </span>
          </Button>
        </div>
        <ArticleGrid key={refreshKey} searchTerm={searchTerm} currentCategory={currentCategory} />

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
