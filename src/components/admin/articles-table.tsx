
// src/components/admin/articles-table.tsx
'use client';

import type { Article } from '@/lib/placeholder-data';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit3, Eye } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import Link from 'next/link';
import { Skeleton } from '../ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ArticlesTableProps {
  articles: Article[];
  isLoading: boolean;
  onDelete: (articleId: string) => Promise<void>;
}

export default function ArticlesTable({ articles, isLoading, onDelete }: ArticlesTableProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleDeleteConfirm = async (articleId: string) => {
    setIsDeleting(articleId);
    try {
      await onDelete(articleId);
      toast({
        title: "Article Deleted",
        description: "The article has been successfully deleted.",
      });
    } catch (error) {
      toast({
        title: "Error Deleting Article",
        description: (error as Error).message || "Could not delete the article.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return 'Invalid Date';
    }
  };

  if (isLoading) {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        {Array(5).fill(null).map((_, i) => <TableHead key={i}><Skeleton className="h-5 w-20" /></TableHead>)}
                        <TableHead className="text-right w-[180px]"><Skeleton className="h-5 w-20 ml-auto" /></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {Array(10).fill(null).map((_, i) => ( // Increased skeleton rows
                        <TableRow key={`skel-${i}`}>
                            <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell className="text-right">
                                <div className="flex gap-2 justify-end">
                                    <Skeleton className="h-8 w-8 rounded" />
                                    <Skeleton className="h-8 w-8 rounded" />
                                    <Skeleton className="h-8 w-8 rounded" />
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
  }

  if (!articles || articles.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No articles found. Try refreshing or adding new articles.</p>;
  }

  return (
    <TooltipProvider>
      <div className="rounded-md border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[35%]">Title</TableHead>
              <TableHead className="w-[15%]">Category</TableHead>
              <TableHead className="w-[15%]">Source</TableHead>
              <TableHead className="w-[15%]">Published Date</TableHead>
              <TableHead className="w-[15%]">Fetched At</TableHead>
              <TableHead className="text-right w-[100px] sm:w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {articles.map((article) => (
              <TableRow key={article.id}>
                <TableCell className="font-medium max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link href={article.link} target="_blank" rel="noopener noreferrer" className="hover:underline line-clamp-2" title={article.title}>
                          {article.title}
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" align="start">
                      <p className="max-w-md">{article.title}</p>
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="whitespace-nowrap">{article.category}</Badge>
                </TableCell>
                <TableCell className="truncate">{article.source}</TableCell>
                <TableCell className="whitespace-nowrap">{formatDate(article.date)}</TableCell>
                <TableCell className="whitespace-nowrap">{formatDate(article.fetchedAt)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                           <Link href={article.link} target="_blank" rel="noopener noreferrer">
                              <Eye className="h-4 w-4" />
                           </Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>View Article</p></TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <Link href={`/admin/articles/edit/${article.id}`}>
                            <Edit3 className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Edit Article (Soon)</p></TooltipContent>
                    </Tooltip>

                    <Tooltip>
                       <TooltipTrigger asChild>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive/90" disabled={isDeleting === article.id}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the
                                article &quot;{article.title}&quot; from the database.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel disabled={isDeleting === article.id}>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteConfirm(article.id)}
                                disabled={isDeleting === article.id}
                                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                              >
                                {isDeleting === article.id ? 'Deleting...' : 'Yes, delete article'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TooltipTrigger>
                      <TooltipContent><p>Delete Article</p></TooltipContent>
                    </Tooltip>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
