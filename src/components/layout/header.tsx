
"use client";

import Link from 'next/link';
import { Newspaper, UserCog, LogOut, UserCircle, RefreshCw } from 'lucide-react';
import ClientSearchBar from './ClientSearchBar';
import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import LoginModal from '@/components/login-modal';

const Header = () => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isUpdatingFeed, setIsUpdatingFeed] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isLoading: isAuthLoading, logout } = useAuth();

  const handleLogoutClick = async () => {
    await logout();
    router.push('/');
  };

  const handleUpdateFeed = async () => {
    setIsUpdatingFeed(true);
    toast({
      title: 'Updating Feed...',
      description: 'Fetching latest articles from sources. This may take a moment.',
    });

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        toast({
            title: 'Network Error',
            description: 'Feed update failed. Please check your internet connection.',
            variant: 'destructive',
        });
        setIsUpdatingFeed(false);
        return;
    }

    try {
      const response = await fetch('/api/admin/update-feed', {
        method: 'POST',
      });
      const result = await response.json();

      if (response.ok && result.success) {
        if (result.newArticlesCount > 0) {
          toast({
            title: 'Feed Update Successful!',
            description: `${result.newArticlesCount} new articles added. Refreshing view...`,
          });

          const activeCategory = searchParams.get('category') || "All";
          const activeSearchTerm = searchParams.get('q') || "";
          const sessionStorageKeyBase = `articleGrid_${pathname}_${activeCategory}_${activeSearchTerm}`;
          
          if (typeof window !== "undefined") {
            sessionStorage.removeItem(`${sessionStorageKeyBase}_articles`);
            sessionStorage.removeItem(`${sessionStorageKeyBase}_page`);
            sessionStorage.removeItem(`${sessionStorageKeyBase}_hasMore`);
            console.log(`[Header UpdateFeed] Cleared session storage for key base: ${sessionStorageKeyBase}`);
          }

          const currentPathname = pathname;
          const currentSearchParams = new URLSearchParams(searchParams.toString());
          currentSearchParams.set('refreshSignal', Date.now().toString());
          router.push(`${currentPathname}?${currentSearchParams.toString()}`);

        } else {
          toast({
            title: 'Feed Already Updated',
            description: 'No new articles found.',
          });
        }
      } else {
        throw new Error(result.message || 'Failed to update feed.');
      }
    } catch (error: any) {
      let specificMessage = error.message || 'Could not update articles.';
      if (error instanceof TypeError && error.message.toLowerCase().includes('failed to fetch')) {
        specificMessage = "Network error: Could not update feed. Please check your connection and try again.";
      }
      toast({
        title: 'Feed Update Failed',
        description: specificMessage,
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingFeed(false);
    }
  };

  return (
    <>
      <header className="bg-card border-b border-border/60 shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0">
          <Link href="/" passHref legacyBehavior>
            <a className="flex items-center space-x-2.5 text-primary hover:text-primary/80 transition-colors">
              <Newspaper className="h-7 w-7" />
              <h1 className="text-3xl font-bold whitespace-nowrap">NewsHunt</h1>
            </a>
          </Link>

          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-3 sm:gap-x-4 gap-y-2 w-full sm:w-auto">
            <ClientSearchBar />
            <ModeToggle />

            <div className="flex items-center gap-x-2 md:gap-x-3">
              {isAuthLoading ? (
                 <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" disabled>
                    <UserCircle className="h-5 w-5 animate-pulse" />
                 </Button>
              ) : user ? (
                <div className="flex items-center gap-x-2 md:gap-x-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUpdateFeed}
                    disabled={isUpdatingFeed}
                    title="Update News Feed"
                    className="h-10 px-3"
                  >
                    <RefreshCw className={`h-5 w-5 ${isUpdatingFeed ? 'animate-spin' : ''} sm:mr-2`} />
                    <span className="hidden sm:inline">{isUpdatingFeed ? 'Updating...' : 'Update Feed'}</span>
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleLogoutClick} title="Logout" className="h-10 w-10 rounded-full">
                    <LogOut className="h-5 w-5" />
                  </Button>
                </div>
              ) : (
                <Button variant="outline" onClick={() => setIsLoginModalOpen(true)} title="Admin Login" className="h-10 px-3">
                  <UserCog className="mr-0 sm:mr-2 h-5 w-5" />
                  <span className="hidden sm:inline">Admin Login</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>
      <LoginModal isOpen={isLoginModalOpen} onOpenChange={setIsLoginModalOpen} />
    </>
  );
};

export default Header;
