
"use client";

import dynamic from 'next/dynamic';
import { Skeleton } from "@/components/ui/skeleton";

const SearchBarFallback = () => (
  <div className="flex w-full max-w-sm items-center space-x-2" aria-label="Loading search bar">
    <Skeleton className="h-10 flex-grow rounded-md" />
    <Skeleton className="h-10 w-10 rounded-md" />
  </div>
);

// Dynamically import SearchBar only on the client-side
const SearchBar = dynamic(() => import('@/components/search-bar'), {
  ssr: false, // Disable server-side rendering for this component
  loading: () => <SearchBarFallback />, // Show a skeleton while loading
});

export default function ClientSearchBar() {
  return <SearchBar />;
}
