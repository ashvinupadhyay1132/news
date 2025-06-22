
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Skeleton } from "./ui/skeleton";
import { Button } from "./ui/button";
import { AlertCircle } from "lucide-react";

interface CategoryFilterProps {}

const CategoryFilter = ({}: CategoryFilterProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const activeCategory = searchParams.get('category') || "All";

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setFetchError("Network unavailable. Could not load categories.");
      setIsLoading(false);
      setCategories(["All"]); // Fallback
      return;
    }

    try {
      const response = await fetch('/api/categories');
      if (!response.ok) {
        const errorBody = await response.text().catch(() => "Could not read error response body.");
        console.error(`[CategoryFilter] API error! Status: ${response.status}. Body: ${errorBody.substring(0, 500)}`);
        throw new Error(`API error! status: ${response.status}`);
      }
      const fetchedCategories: string[] = await response.json();
      const uniqueCategories = new Set(fetchedCategories.filter(cat => typeof cat === 'string' && cat.trim() !== ''));
      setCategories(["All", ...Array.from(uniqueCategories).filter(cat => cat !== "All").sort()]);
    } catch (error: any) {
      console.error("Failed to fetch categories via API:", error);
      let specificMessage = "Could not load categories. Please try again.";
      if (error instanceof TypeError && (error as TypeError).message.toLowerCase().includes('failed to fetch')) {
        specificMessage = "Network error: Could not load categories.";
      }
      setFetchError(specificMessage);
      setCategories(["All"]); // Fallback
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleCategoryChange = (categoryValue: string) => {
    const newParams = new URLSearchParams(searchParams.toString());
    if (categoryValue === "All") {
      newParams.delete('category');
    } else {
      newParams.set('category', categoryValue);
    }
    newParams.delete('page');
    // Preserve search query if it exists
    const currentQuery = searchParams.get('q');
    if (currentQuery) {
      newParams.set('q', currentQuery);
    }
    router.push(`/?${newParams.toString()}`);
  };

  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-24 rounded-md" />
        ))}
      </div>
    );
  }
  
  if (fetchError) {
     return (
        <div className="flex items-center text-sm text-destructive p-2 rounded-md border border-destructive/50 bg-destructive/10">
          <AlertCircle className="h-4 w-4 mr-2 shrink-0" />
          <span>{fetchError} <button onClick={fetchCategories} className="ml-1 underline hover:text-destructive/80">Retry</button></span>
        </div>
      );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => (
        <Button
          key={category}
          variant={activeCategory === category ? 'default' : 'secondary'}
          onClick={() => handleCategoryChange(category)}
          className="rounded-full px-4"
        >
          {category}
        </Button>
      ))}
    </div>
  );
};

export default CategoryFilter;
