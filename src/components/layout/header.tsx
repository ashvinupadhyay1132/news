
import Link from 'next/link';
import { Newspaper } from 'lucide-react';
import SearchBar from '@/components/search-bar';
import { ModeToggle } from '@/components/mode-toggle';

const Header = () => {
  return (
    <header className="bg-card border-b border-border/60 shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-5 flex flex-col sm:flex-row justify-between items-center">
        <Link href="/" className="flex items-center space-x-2.5 mb-4 sm:mb-0">
          <Newspaper className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold text-primary whitespace-nowrap">TrendingNewsFeed.in</h1>
        </Link>
        <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto">
          <SearchBar />
          <ModeToggle />
        </div>
      </div>
    </header>
  );
};

export default Header;
