
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Skeleton } from "./ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CategoryFilterProps {}

const CategoryFilter = ({}: CategoryFilterProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const activeCategory = searchParams.get('category') || "All";

  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/categories');
        if (!response.ok) {
          throw new Error(`API error! status: ${response.status}`);
        }
        const fetchedCategories: string[] = await response.json();
        // Ensure "All" is always the first option and present
        const uniqueCategories = new Set(fetchedCategories.filter(cat => typeof cat === 'string' && cat.trim() !== ''));
        setCategories(["All", ...Array.from(uniqueCategories).filter(cat => cat !== "All").sort()]);
      } catch (error) {
        console.error("Failed to fetch categories via API:", error);
        setCategories(["All"]); // Fallback
      }
      setIsLoading(false);
    };
    fetchCategories();
  }, []);

  const handleCategoryChange = (categoryValue: string) => {
    const newParams = new URLSearchParams(searchParams.toString());
    if (categoryValue === "All") {
      newParams.delete('category');
    } else {
      newParams.set('category', categoryValue);
    }
    // Reset page to 1 when category changes
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
      <Select onValueChange={handleCategoryChange} value={activeCategory}>
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
    </div>
  );
};

export default CategoryFilter;
