
"use client";

import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useEffect, useState } from "react";
import { Skeleton } from "./ui/skeleton";
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

  let currentCategoryQuery = searchParams.get('category') || "All";
  const categoryFromPath = Array.isArray(params.category) ? params.category[0] : params.category;
  
  const activeCategory = categoryFromPath ? categories.find(c => slugify(c) === slugify(categoryFromPath)) || "All" : currentCategoryQuery;


  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/categories');
        if (!response.ok) {
          throw new Error(`API error! status: ${response.status}`);
        }
        const fetchedCategories: string[] = await response.json();
        setCategories(fetchedCategories);
      } catch (error) {
        console.error("Failed to fetch categories via API:", error);
        setCategories(["All"]); 
      }
      setIsLoading(false);
    };
    fetchCategories();
  }, []);

  const handleCategoryChange = (category: string) => {
    const newParams = new URLSearchParams(searchParams.toString());
    if (category === "All") {
      newParams.delete('category');
      router.push(`/?${newParams.toString()}`);
    } else {
      newParams.set('category', category);
      router.push(`/?${newParams.toString()}`);
    }
  };
  
  if (isLoading) {
    return (
      <div className="mb-8">
        <Skeleton className="h-6 w-40 mb-4" /> 
        <div className="flex space-x-3 p-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-28 rounded-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-4 text-foreground">Filter by Category</h2>
      <ScrollArea className="w-full whitespace-nowrap pb-3"> {/* Increased pb for scrollbar */}
        <div className="flex space-x-2 py-1">
          {categories.map((category) => (
            <Button
              key={category}
              variant={activeCategory === category ? "default" : "outline"}
              onClick={() => handleCategoryChange(category)}
              className="rounded-full px-5 py-2.5 text-sm shadow-sm hover:shadow-md transition-all duration-200 ease-in-out" 
              size="sm" 
            >
              {category}
            </Button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};

export default CategoryFilter;
