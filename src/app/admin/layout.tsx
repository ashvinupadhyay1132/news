
// src/app/admin/layout.tsx
'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, isAdmin, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If auth has loaded and the user is not a logged-in admin, redirect.
    if (!isLoading && (!user || !isAdmin)) {
      router.push('/');
    }
  }, [user, isAdmin, isLoading, router]);

  if (isLoading) {
    // Show a loading skeleton while we verify the session.
    return (
      <div className="space-y-8 container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    // This state is briefly visible while the redirect is happening.
    return (
      <div className="flex flex-col min-h-screen items-center justify-center">
        <p className="text-lg text-muted-foreground">Redirecting...</p>
      </div>
    );
  }

  // If authenticated and admin, render the page content.
  // It will now use the root layout's header and footer, as there is no other UI here.
  return <>{children}</>;
}
