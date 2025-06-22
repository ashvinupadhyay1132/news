
"use client";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useState, type FormEvent, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const SearchBar = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || "");

  useEffect(() => {
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
    // Reset category when performing a new search
    params.delete('category'); 
    router.push(`/?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSearch} className="relative w-full">
      <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Search"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full rounded-full bg-secondary pl-10 pr-4 py-2 text-base focus:bg-background"
        aria-label="Search articles"
      />
    </form>
  );
};

export default SearchBar;
