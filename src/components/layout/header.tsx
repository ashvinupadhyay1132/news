
"use client";

import Link from 'next/link';
import { Newspaper, UserCog, LogOut, Cloudy, Menu as MenuIcon } from 'lucide-react';
import ClientSearchBar from './ClientSearchBar';
import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import LoginModal from '@/components/login-modal';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose, SheetTrigger } from '@/components/ui/sheet';
import { Skeleton } from '../ui/skeleton';

const NavLink = ({ href, children, onClick }: { href: string; children: React.ReactNode; onClick?: () => void }) => (
  <Button variant="ghost" asChild className="text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-2" onClick={onClick}>
    <Link href={href}>{children}</Link>
  </Button>
);

const Header = () => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isUpdatingFeed, setIsUpdatingFeed] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isLoading: isAuthLoading, logout } = useAuth();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);


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

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About Us' },
    { href: '/contact', label: 'Contact Us' },
  ];

  return (
    <>
      <header className="bg-card border-b border-border/60 shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-col gap-3">

            {/* Line 1: Logo, Nav (Desktop), Theme, Auth Buttons, Mobile Menu */}
            <div className="flex justify-between items-center w-full">
              {/* Logo */}
              <Link href="/" passHref legacyBehavior>
                <a className="flex items-center space-x-2.5 text-primary hover:text-primary/80 transition-colors">
                  <Newspaper className="h-7 w-7" />
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold whitespace-nowrap">NewsHunt</h1>
                </a>
              </Link>

              {/* Desktop Navigation (Centered for md and up) */}
              <nav className="hidden md:flex items-center gap-1 lg:gap-2 flex-grow justify-center">
                {navItems.map((item) => (
                  <NavLink key={item.href} href={item.href}>
                    {item.label}
                  </NavLink>
                ))}
              </nav>

              {/* Right Aligned Group: Theme, Auth, Mobile Menu Trigger */}
              <div className="flex items-center gap-x-1 sm:gap-x-2 md:gap-x-3">
                <ModeToggle />
                
                {(!hasMounted || isAuthLoading) ? (
                   <Skeleton className="h-10 rounded-md w-10 md:w-36" />
                ) : user ? (
                  <Button 
                    variant="outline" 
                    onClick={handleLogoutClick} 
                    title="Logout" 
                    className="h-10 w-10 p-0 md:w-auto md:px-3"
                  >
                    <LogOut className="h-5 w-5 md:mr-2" />
                    <span className="hidden md:inline">Logout</span>
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    onClick={() => setIsLoginModalOpen(true)} 
                    title="Admin Login" 
                    className="h-10 w-10 p-0 md:w-auto md:px-3"
                  >
                    <UserCog className="h-5 w-5 md:mr-2" />
                    <span className="hidden md:inline">Admin Login</span>
                  </Button>
                )}
                
                {/* Mobile Menu Trigger (Right side) */}
                <div className="md:hidden">
                  <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-10 w-10">
                        <MenuIcon className="h-6 w-6" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-[280px] sm:w-[320px] p-0">
                      <SheetHeader className="p-4 border-b">
                        <SheetTitle className="flex items-center gap-2 text-lg">
                          <Newspaper className="h-6 w-6 text-primary" />
                          NewsHunt Menu
                        </SheetTitle>
                      </SheetHeader>
                      <nav className="flex flex-col p-4 space-y-2">
                        {navItems.map((item) => (
                          <SheetClose asChild key={item.href}>
                             <Link
                                href={item.href}
                                className={`block px-3 py-2 rounded-md text-base font-medium hover:bg-accent hover:text-accent-foreground ${pathname === item.href ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}`}
                              >
                                {item.label}
                              </Link>
                          </SheetClose>
                        ))}
                      </nav>
                    </SheetContent>
                  </Sheet>
                </div>
              </div>
            </div>

            {/* Line 2: Search Bar and Update Feed Button */}
            <div className="flex flex-row items-center gap-3 w-full">
              <div className="flex-grow"> 
                <ClientSearchBar />
              </div>
              {hasMounted && user && (
                <div className="flex-shrink-0"> 
                  <Button
                    variant="outline"
                    onClick={handleUpdateFeed}
                    disabled={isUpdatingFeed}
                    title="Update News Feed"
                    className="h-10 px-3" 
                  >
                    <Cloudy className={`h-5 w-5 ${isUpdatingFeed ? 'animate-spin' : ''} mr-2`} /> 
                    <span>{isUpdatingFeed ? 'Updating...' : 'Update Feed'}</span>
                  </Button>
                </div>
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
