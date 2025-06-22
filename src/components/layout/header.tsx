
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Menu as MenuIcon, UserCog, LogOut, LayoutDashboard, Home, RefreshCw } from 'lucide-react';
import ClientSearchBar from './ClientSearchBar';
import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';
import { useState, useCallback, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose, SheetTrigger } from '@/components/ui/sheet';
import { Skeleton } from '../ui/skeleton';
import { cn, clearArticleCache } from '@/lib/utils';
import { Separator } from '../ui/separator';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import dynamic from 'next/dynamic';

const LoginModal = dynamic(() => import('@/components/login-modal'), {
  ssr: false, // The modal is a client-only interactive component
});


const Header = () => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const pathname = usePathname();
  const { user, isAdmin, isLoading: isAuthLoading, logout } = useAuth();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const navItems = [
    { href: '/', label: 'Home', icon: <Home className="h-5 w-5 mr-3" /> },
  ];
  
  const adminNavItem = { href: '/admin/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5 mr-3" /> };

  const closeSheet = () => setIsSheetOpen(false);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    clearArticleCache();
    // Use a short timeout to allow the refresh icon to show a spinning animation
    setTimeout(() => {
      window.location.reload();
    }, 500); 
  }, []);

  return (
    <>
      <TooltipProvider>
        <header className="bg-background/80 backdrop-blur-sm sticky top-0 z-50 border-b">
          <div className="container mx-auto px-4 py-3">
            <div className="flex justify-between items-center w-full gap-4">
              <div className="flex items-center gap-6">
                <Link href="/" className="flex items-center gap-2 text-foreground">
                  <Image
                    src="/logo.svg"
                    alt="NewsHunt Logo"
                    width={20}
                    height={20}
                    className="h-5 w-5"
                  />
                  <div className="text-base font-bold whitespace-nowrap font-mono">NewsHunt</div>
                </Link>
                {/* Nav items are now in the sheet menu for all screen sizes */}
              </div>

              <div className="flex items-center gap-x-1 sm:gap-x-2">
                <div className="hidden sm:block w-full max-w-xs">
                  <ClientSearchBar />
                </div>

                <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isRefreshing} className="h-10 w-10 rounded-full">
                        <RefreshCw className={cn("h-5 w-5", isRefreshing && "animate-spin")} />
                        <span className="sr-only">Refresh content</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Refresh Content</p>
                    </TooltipContent>
                </Tooltip>

                <ModeToggle />
                
                {/* Sheet Menu Trigger for all screen sizes */}
                <div>
                  <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-10 w-10">
                        <MenuIcon className="h-6 w-6" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-[280px] sm:w-[320px] p-0 flex flex-col">
                      <SheetHeader className="p-4 border-b">
                        <SheetTitle className="text-lg">Menu</SheetTitle>
                      </SheetHeader>
                      
                      <nav className="flex flex-col p-4 space-y-1 flex-grow">
                        {navItems.map((item) => (
                          <SheetClose asChild key={item.href}>
                            <Link
                                href={item.href}
                                className={cn(
                                  'flex items-center px-3 py-2 rounded-md text-base font-medium hover:bg-accent hover:text-accent-foreground',
                                  pathname === item.href ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'
                                )}
                                onClick={closeSheet}
                              >
                                {item.icon}
                                {item.label}
                              </Link>
                          </SheetClose>
                        ))}
                      </nav>
                      
                      <Separator />

                      <div className="p-4 space-y-2">
                        {!isClient ? (
                          <Skeleton className="h-10 w-full rounded-md" />
                        ) : user ? (
                          <>
                            {isAdmin && (
                              <SheetClose asChild>
                                <Button asChild variant="outline" className="w-full justify-start">
                                  <Link href={adminNavItem.href} onClick={closeSheet}>
                                    {adminNavItem.icon}
                                    {adminNavItem.label}
                                  </Link>
                                </Button>
                              </SheetClose>
                            )}
                            <Button variant="ghost" onClick={() => { closeSheet(); logout(); }} className="w-full justify-start">
                                <LogOut className="h-5 w-5 mr-3" />
                                Logout
                              </Button>
                          </>
                        ) : (
                          <Button variant="outline" onClick={() => { closeSheet(); setIsLoginModalOpen(true); }} className="w-full justify-start">
                            <UserCog className="h-5 w-5 mr-3" />
                            Admin Login
                          </Button>
                        )}
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              </div>
            </div>
            <div className="sm:hidden mt-3">
              <ClientSearchBar />
            </div>
          </div>
        </header>
      </TooltipProvider>
      {isClient && <LoginModal isOpen={isLoginModalOpen} onOpenChange={setIsLoginModalOpen} />}
    </>
  );
};

export default Header;
