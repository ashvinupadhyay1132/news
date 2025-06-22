
// src/app/admin/articles/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Article } from '@/lib/placeholder-data';
import ArticlesTable from '@/components/admin/articles-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, RefreshCw, AlertTriangle, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { clearArticleCache } from '@/lib/utils';

const ARTICLES_PER_PAGE = 15;

export default function ManageArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();
  const { isAdmin, isAuthLoading } = useAuth();

  const fetchAdminArticles = useCallback(async (page: number, showLoading = true) => {
    if (showLoading) {
      setIsLoading(true);
    }
    try {
      const response = await fetch(`/api/admin/articles?page=${page}&limit=${ARTICLES_PER_PAGE}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to fetch articles" }));
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }
      const data = await response.json();
      setArticles(data.articles || []);
      setTotalPages(Math.ceil((data.totalArticles || 0) / ARTICLES_PER_PAGE));
      setCurrentPage(page);
    } catch (error) {
      console.error("Failed to fetch admin articles:", error);
      toast({
        title: "Error Loading Articles",
        description: (error as Error).message || "Could not load articles for admin view.",
        variant: "destructive",
      });
      setArticles([]);
      setTotalPages(1);
    } finally {
      if (showLoading) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [toast]);

  useEffect(() => {
    if (!isAuthLoading) { // Only proceed when auth check is complete.
      if (isAdmin) { // If the user is confirmed to be an admin...
        fetchAdminArticles(1); // ...then fetch the data.
      } else { // If not an admin...
        setIsLoading(false); // ...stop any loading indicators.
      }
    }
  }, [isAuthLoading, isAdmin, fetchAdminArticles]); // Dependencies ensure this runs at the right times.


  const handleDeleteArticle = async (articleId: string) => {
    if (!isAdmin) {
        toast({ title: "Action Disabled", description: "You do not have permission to delete articles.", variant: "destructive" });
        return;
    }
    
    // Store original list to check if we need to go to previous page
    const originalArticles = [...articles];
    // Optimistically remove the article to provide immediate feedback
    setArticles(prevArticles => prevArticles.filter(article => article.id !== articleId));

    try {
      const response = await fetch(`/api/admin/articles/${articleId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to delete article" }));
        // On API failure, revert the optimistic update and throw error
        setArticles(originalArticles);
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }
      clearArticleCache();
      toast({ title: "Success", description: "Article has been deleted." });
      
      // Sync data silently in the background
      const pageToFetch = originalArticles.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
      fetchAdminArticles(pageToFetch, false); // `false` prevents loading flicker

    } catch (error) {
      console.error("Error deleting article:", error);
      toast({ title: "Deletion Failed", description: (error as Error).message, variant: "destructive" });
      // Revert on fetch errors or if API call failed
      setArticles(originalArticles);
    }
  };
  
  const handleRefresh = () => {
    if (!isAdmin) return;
    setIsRefreshing(true);
    fetchAdminArticles(currentPage);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      fetchAdminArticles(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      fetchAdminArticles(currentPage + 1);
    }
  };

  const showSkeletons = isLoading || isAuthLoading;
  const showAccessDenied = !isAuthLoading && !isAdmin;

  if (showAccessDenied) {
    return (
       <Card>
         <CardHeader className="flex flex-row items-center gap-4">
           <AlertTriangle className="w-8 h-8 text-destructive" />
           <CardTitle>Access Denied</CardTitle>
         </CardHeader>
         <CardContent>
           <p className="text-muted-foreground">You do not have permission to manage articles. Please log in with an admin account.</p>
         </CardContent>
       </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-6 border-b">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Manage Articles</h1>
          <p className="text-muted-foreground">View, edit, or delete articles. Add new ones as needed.</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/dashboard">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
      
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
        <div className="w-full sm:w-auto sm:flex-grow">
          <Input placeholder="Search articles... (Feature coming soon)" disabled className="max-w-xs" />
        </div>
        {showSkeletons ? (
            <div className="flex space-x-2 flex-shrink-0">
                <Skeleton className="h-10 w-28" />
                <Skeleton className="h-10 w-36" />
            </div>
        ) : (
             <div className="flex space-x-2 flex-shrink-0">
                <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing || isLoading || !isAdmin}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    {isRefreshing ? 'Refreshing...' : 'Refresh Articles'}
                </Button>
                <Button asChild disabled={!isAdmin}>
                    <Link href="/admin/articles/new">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add New Article
                    </Link>
                </Button>
            </div>
        )}
      </div>
      
      {showSkeletons ? (
        <div className="space-y-2">
            <div className="rounded-md border">
            <Skeleton className="h-12 w-full rounded-t-md" />
            {Array.from({ length: Math.floor(ARTICLES_PER_PAGE / 2) }).fill(0).map((_, i) => (
                <div key={`skel-row-${i}`} className="flex items-center p-4 border-b">
                    <Skeleton className="h-5 flex-grow mr-4" />
                    <Skeleton className="h-5 w-24 mr-4" />
                    <Skeleton className="h-5 w-24 mr-4" />
                    <Skeleton className="h-5 w-32" />
                </div>
            ))}
            </div>
        </div>
      ) : (
        <ArticlesTable articles={articles} isLoading={isLoading} onDelete={handleDeleteArticle} />
      )}

      {totalPages > 1 && !showSkeletons && isAdmin && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousPage}
            disabled={currentPage === 1 || isLoading}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={currentPage === totalPages || isLoading}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
