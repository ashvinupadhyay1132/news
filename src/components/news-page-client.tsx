
"use client";

import ArticleGrid from "@/components/article-grid";
import CategoryFilter from "@/components/category-filter";
import { useSearchParams } from "next/navigation";
import TopStory from "@/components/top-story";
import type { Article } from "@/lib/placeholder-data";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

interface NewsPageClientProps {
  initialTopStories: Article[];
  initialTopStoryIds: string;
}

export default function NewsPageClient({
  initialTopStories,
  initialTopStoryIds,
}: NewsPageClientProps) {
  const searchParams = useSearchParams();

  const searchTerm = searchParams.get("q") || "";
  const currentCategory = searchParams.get("category") || "All";

  const showTopStory = !searchTerm && currentCategory === "All";

  const topStories = showTopStory ? initialTopStories : [];
  const topStoryIds = showTopStory ? initialTopStoryIds : "";

  return (
    <div className="space-y-12">
      {showTopStory && (
        <div className="-mx-4 -mt-8 md:mx-0 md:mt-0">
          {topStories.length > 0 ? (
            <TopStory articles={topStories} />
          ) : (
            <Skeleton className="relative w-full aspect-[3/4] md:aspect-[16/9] overflow-hidden md:rounded-lg" />
          )}
        </div>
      )}

      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-foreground tracking-tight">
          Latest Posts
        </h2>
        <CategoryFilter />
        <Separator />
        <ArticleGrid
          searchTerm={searchTerm}
          currentCategory={currentCategory}
          excludeIds={topStoryIds}
        />
      </div>
    </div>
  );
}
