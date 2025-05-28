
import Link from 'next/link';
import { Newspaper } from 'lucide-react'; // Rss import removed
import SearchBar from '@/components/search-bar';
import { ModeToggle } from '@/components/mode-toggle';
// Button import from '@/components/ui/button' removed as it was specifically for the RSS link style

const Header = () => {
  return (
    <header className="bg-card border-b border-border shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center">
        <Link href="/" className="flex items-center space-x-2 mb-4 sm:mb-0">
          <Newspaper className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-primary whitespace-nowrap">TrendingNewsFeed.in</h1>
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
