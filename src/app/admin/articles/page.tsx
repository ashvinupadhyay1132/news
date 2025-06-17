
// src/app/admin/articles/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Article } from '@/lib/placeholder-data';
import ArticlesTable from '@/components/admin/articles-table';
import { Button } from '@/components/ui/button';
import { PlusCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

const ARTICLES_PER_PAGE = 15;

export default function ManageArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchAdminArticles = useCallback(async (page: number) => {
    setIsLoading(true);
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
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAdminArticles(1);
  }, [fetchAdminArticles]);

  const handleDeleteArticle = async (articleId: string) => {
    try {
      const response = await fetch(`/api/admin/articles/${articleId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to delete article" }));
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }
      setArticles(prev => prev.filter(art => art.id !== articleId));
      // Re-fetch to update total count and potentially adjust pagination
      fetchAdminArticles(articles.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage);
    } catch (error) {
      console.error("Error deleting article:", error);
      throw error; 
    }
  };
  
  const handleRefresh = () => {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Manage Articles</h1>
          <p className="text-muted-foreground">View, edit, or delete articles. Add new ones as needed.</p>
        </div>
        <div className="flex space-x-2">
            <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing || isLoading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button asChild>
                <Link href="/admin/articles/new">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add New Article
                </Link>
            </Button>
        </div>
      </div>

      {/* Placeholder for potential search/filter bar */}
      {/* <div className="py-4"> <Input placeholder="Search articles..." /> </div> */}

      <ArticlesTable articles={articles} isLoading={isLoading} onDelete={handleDeleteArticle} />

      {totalPages > 1 && (
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
