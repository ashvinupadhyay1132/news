
"use client";

import { Button } from "@/components/ui/button";
// import { getCategories } from "@/lib/placeholder-data"; // Direct import removed
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useEffect, useState } from "react";
import { Skeleton } from "./ui/skeleton";

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
  
  function slugify(text: string): string {
    if (!text) return '';
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '')
      .replace(/--+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  }


  if (isLoading) {
    return (
      <div className="mb-8">
        <Skeleton className="h-7 w-48 mb-3" />
        <div className="flex space-x-2 p-2 border rounded-md">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold mb-3 text-foreground">Filter by Category</h2>
      <ScrollArea className="w-full whitespace-nowrap rounded-md border">
        <div className="flex space-x-2 p-2">
          {categories.map((category) => (
            <Button
              key={category}
              variant={activeCategory === category ? "default" : "outline"} // Changed "primary" to "default" for better theme adherence
              onClick={() => handleCategoryChange(category)}
              className="shrink-0"
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
