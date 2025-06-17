// src/app/admin/layout.tsx
'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LayoutDashboard, LogOut, Home, ListOrdered } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
} from '@/components/ui/sidebar';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, isAdmin, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      router.push('/');
    }
  }, [user, isAdmin, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background">
        <div className="w-64 bg-muted/60 p-4 border-r hidden md:flex flex-col gap-4">
          <div className="flex items-center justify-center h-16">
            <Skeleton className="h-8 w-32" />
          </div>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <div className="mt-auto">
            <Skeleton className="h-10 w-full mt-2" />
            <Skeleton className="h-10 w-full mt-2" />
          </div>
        </div>
        <div className="flex-1 flex flex-col">
          <header className="bg-card border-b shadow-sm h-16 flex items-center px-6">
            <Skeleton className="h-8 w-8 md:hidden" /> 
            <div className="flex-1">
                 {/* Placeholder for potential future header content like breadcrumbs */}
            </div>
            <Skeleton className="h-8 w-24" />
          </header>
          <main className="flex-grow p-4 sm:p-6 lg:p-8 bg-muted/40">
            <Skeleton className="h-12 w-1/2 mb-6" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </main>
          <footer className="py-4 text-center text-xs text-muted-foreground border-t bg-card">
            <Skeleton className="h-4 w-1/3 mx-auto" />
          </footer>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center">
        <p className="text-lg text-muted-foreground">Redirecting...</p>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar collapsible="icon" className="border-r">
          <SidebarHeader className="p-4 flex justify-center items-center h-16 border-b">
            <Link href="/admin/dashboard" className="flex items-center gap-2 text-lg font-semibold text-primary">
              <LayoutDashboard className="h-6 w-6" />
              <span className="group-data-[collapsible=icon]:hidden">Admin</span>
            </Link>
          </SidebarHeader>
          <SidebarContent className="flex-grow p-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === '/admin/dashboard'}
                  tooltip="Dashboard"
                  className="justify-start"
                >
                  <Link href="/admin/dashboard">
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === '/admin/articles'}
                  tooltip="Manage Articles"
                  className="justify-start"
                >
                  <Link href="/admin/articles">
                    <ListOrdered />
                    <span>Articles</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-2 border-t">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="View Main Site" className="justify-start">
                  <Link href="/">
                    <Home />
                    <span>View Site</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={logout} tooltip="Logout" className="justify-start">
                  <LogOut />
                  <span>Logout</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          <header className="bg-card border-b shadow-sm sticky top-0 z-40 h-16 flex items-center px-6 gap-4">
            <SidebarTrigger className="md:hidden" /> {/* Only show trigger on mobile */}
            <div className="flex-1">
              {/* Future use: Dynamic page title or breadcrumbs */}
              <h2 className="text-xl font-semibold">
                {pathname.includes('/articles') ? 'Manage Articles' : pathname.includes('/dashboard') ? 'Dashboard' : 'Admin'}
              </h2>
            </div>
            <div className="flex items-center gap-4">
              {/* Future use: User avatar, settings, notifications */}
            </div>
          </header>

          <main className="flex-grow p-4 sm:p-6 lg:p-8 bg-muted/40 overflow-y-auto">
            {children}
          </main>

          <footer className="py-4 text-center text-xs text-muted-foreground border-t bg-card">
            &copy; {new Date().getFullYear()} NewsHunt Admin Panel
          </footer>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
