
"use client";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useState, type FormEvent, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface SearchBarProps {
  onSearch?: () => void;
}

const SearchBar = ({ onSearch }: SearchBarProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || "");

  useEffect(() => {
    // Sync the search term with the URL query parameter
    setSearchTerm(searchParams.get('q') || "");
  }, [searchParams]);

  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const params = new URLSearchParams(window.location.search);
    if (searchTerm.trim()) {
      params.set('q', searchTerm.trim());
    } else {
      params.delete('q');
    }
    // Reset category when performing a new search for clarity
    params.delete('category'); 
    router.push(`/?${params.toString()}`);
    
    // Callback for any parent component logic (like closing a popover)
    if (onSearch) {
      onSearch();
    }
  };

  return (
    <form onSubmit={handleSearch} className="w-full">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search articles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md bg-secondary pl-9 pr-3 py-2 text-sm focus:bg-background"
            aria-label="Search articles"
          />
        </div>
    </form>
  );
};

export default SearchBar;
