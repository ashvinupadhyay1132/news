"use client";

import { Button } from "@/components/ui/button";
import { categories } from "@/lib/placeholder-data";
import { useRouter, useSearchParams } from "next/navigation";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface CategoryFilterProps {
  currentCategory: string;
}

const CategoryFilter = ({ currentCategory }: CategoryFilterProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleCategoryChange = (category: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (category === "All") {
      params.delete('category');
    } else {
      params.set('category', category);
    }
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold mb-3 text-foreground">Filter by Category</h2>
      <ScrollArea className="w-full whitespace-nowrap rounded-md border">
        <div className="flex space-x-2 p-2">
          {categories.map((category) => (
            <Button
              key={category}
              variant={currentCategory === category ? "primary" : "outline"}
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
