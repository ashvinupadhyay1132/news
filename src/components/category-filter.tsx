
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Skeleton } from "./ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle } from "lucide-react";

interface CategoryFilterProps {}

const CategoryFilter = ({}: CategoryFilterProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [categories, setCategories] = useState<string[]>(["All"]);
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
    router.push(`/?${newParams.toString()}`);
  };

  if (isLoading) {
    return (
      <div className="mb-8">
        <Skeleton className="h-6 w-40 mb-4" />
        <Skeleton className="h-10 w-full max-w-xs rounded-md" />
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-3 text-foreground">Filter by Category</h2>
      <Select onValueChange={handleCategoryChange} value={activeCategory} disabled={categories.length <= 1 && !!fetchError}>
        <SelectTrigger className="w-full max-w-xs text-base sm:text-sm">
          <SelectValue placeholder="Select a category" />
        </SelectTrigger>
        <SelectContent>
          {categories.map((category) => (
            <SelectItem key={category} value={category} className="text-base sm:text-sm">
              {category}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {fetchError && !isLoading && (
        <div className="flex items-center text-xs text-destructive mt-2 p-2 rounded-md border border-destructive/50 bg-destructive/10 max-w-xs">
          <AlertCircle className="h-3.5 w-3.5 mr-1.5 shrink-0" />
          <span>{fetchError} <button onClick={fetchCategories} className="ml-1 underline hover:text-destructive/80">Retry</button></span>
        </div>
      )}
    </div>
  );
};

export default CategoryFilter;
