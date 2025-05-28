
import Link from 'next/link';
import { Newspaper, Rss } from 'lucide-react'; // Added Rss icon
import SearchBar from '@/components/search-bar';
import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button'; // Added Button for styling RSS link

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
          <Link href="/api/rss" passHref legacyBehavior>
            <a target="_blank" rel="noopener noreferrer" aria-label="RSS Feed">
              <Button variant="outline" size="icon">
                <Rss className="h-[1.2rem] w-[1.2rem]" />
              </Button>
            </a>
          </Link>
          <ModeToggle />
        </div>
      </div>
    </header>
  );
};

export default Header;
