
import { Suspense } from "react";
import PageLoading from "./loading";
import { getArticles } from "@/lib/placeholder-data";
import type { Article } from "@/lib/placeholder-data";
import NewsPageClient from "@/components/news-page-client";

export default async function HomePage() {
  const { articles: fetchedArticles } = await getArticles(
    undefined,
    undefined,
    1,
    50
  );

  const allowedCategories = new Set([
    "Sports",
    "World News",
    "Top News",
    "Politics",
    "Business & Finance",
  ]);
  const topStories = fetchedArticles
    .filter(
      (article: Article) =>
        article.imageUrl &&
        !article.imageUrl.includes("placehold.co") &&
        allowedCategories.has(article.category)
    )
    .slice(0, 7);

  const topStoryIds = topStories.map((story) => story.id).join(",");

  return (
    <Suspense fallback={<PageLoading />}>
      <NewsPageClient
        initialTopStories={topStories}
        initialTopStoryIds={topStoryIds}
      />
    </Suspense>
  );
}
