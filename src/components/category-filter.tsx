
"use client";

import { useRouter, useSearchParams, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Skeleton } from "./ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { slugify } from "@/lib/utils";

interface CategoryFilterProps {
  // currentCategory is derived from URL, no longer passed as prop
}

const CategoryFilter = ({}: CategoryFilterProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams(); 

  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Determine the active category based on URL query parameters
  // For a Select component, we generally want the exact value string.
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
        // Ensure "All" is always an option, typically the first.
        // The API should already return "All" as the first item.
        setCategories(fetchedCategories.includes("All") ? fetchedCategories : ["All", ...fetchedCategories]);
      } catch (error) {
        console.error("Failed to fetch categories via API:", error);
        setCategories(["All"]); 
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
    // Always navigate to the homepage for category filtering
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
      <h2 className="text-lg font-semibold mb-4 text-foreground">Filter by Category</h2>
      <Select value={activeCategory} onValueChange={handleCategoryChange}>
        <SelectTrigger className="w-full max-w-xs text-base py-2.5 h-auto sm:text-sm">
          <SelectValue placeholder="Select a category" />
        </SelectTrigger>
        <SelectContent>
          {categories.map((category) => (
            <SelectItem key={category} value={category} className="text-base py-2 sm:text-sm">
              {category}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default CategoryFilter;
