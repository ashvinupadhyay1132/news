
// src/app/admin/dashboard/page.tsx
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, ListChecks, PlusCircle, AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { clearArticleCache } from '@/lib/utils';

interface DashboardStats {
  totalArticles: number;
}

export default function AdminDashboardPage() {
  const { isAdmin, isAuthLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isUpdatingFeed, setIsUpdatingFeed] = useState(false);
  const { toast } = useToast();

  const fetchStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const response = await fetch('/api/admin/articles?countOnly=true');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Failed to fetch stats: ${response.status}` }));
        throw new Error(errorData.message);
      }
      const data = await response.json();
      setStats({ totalArticles: data.totalArticles });
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
      toast({
        title: "Error Loading Stats",
        description: (error as Error).message,
        variant: "destructive",
      });
      setStats(null);
    } finally {
      setIsLoadingStats(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!isAuthLoading) { // Only proceed when auth check is complete.
      if (isAdmin) { // If the user is confirmed to be an admin...
        fetchStats(); // ...then fetch the data.
      } else { // If not an admin (or not logged in)...
        setIsLoadingStats(false); // ...stop any loading indicators.
      }
    }
  }, [isAuthLoading, isAdmin, fetchStats]); // Dependencies ensure this runs at the right times.

  const handleUpdateFeed = async () => {
    if (!isAdmin) {
      toast({ title: "Unauthorized", description: "You do not have permission to update the feed.", variant: "destructive" });
      return;
    }
    setIsUpdatingFeed(true);
    toast({ title: "Feed update started", description: "Fetching latest articles from all RSS sources. This may take a moment." });
    try {
      const response = await fetch('/api/admin/update-feed', { method: 'POST' });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'An unknown error occurred during the feed update.');
      }
      
      clearArticleCache();

      toast({
        title: "Feed Update Complete",
        description: result.message || "The article feed has been updated."
      });

      // Refresh the stats card after the feed is updated.
      await fetchStats();

    } catch (error) {
      toast({
        title: "Feed Update Failed",
        description: (error as Error).message,
        variant: "destructive"
      });
    } finally {
      setIsUpdatingFeed(false);
    }
  };


  const showSkeletons = isAuthLoading || isLoadingStats;

  if (!isAuthLoading && !isAdmin) {
     return (
       <Card>
         <CardHeader className="flex flex-row items-center gap-4">
           <AlertTriangle className="w-8 h-8 text-destructive" />
           <CardTitle>Access Denied</CardTitle>
         </CardHeader>
         <CardContent>
           <p className="text-muted-foreground">You do not have permission to view the dashboard. Please log in with an admin account.</p>
         </CardContent>
       </Card>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="pb-6 border-b">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage your content from one central place.</p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Manage Articles</CardTitle>
            <ListChecks className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-6">
            {showSkeletons ? (
                <div className="space-y-2">
                    <Skeleton className="h-8 w-16 mb-1" />
                    <Skeleton className="h-4 w-48" />
                </div>
            ) : (
                <>
                <div className="text-2xl font-bold">{stats?.totalArticles ?? 'N/A'}</div>
                <p className="text-xs text-muted-foreground">Total articles in the database</p>
                </>
            )}
          </CardContent>
           <CardFooter>
             <Button variant="outline" size="sm" asChild className="group mt-2">
                <Link href="/admin/articles">
                    Go to Articles <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
            </Button>
           </CardFooter>
        </Card>
        
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Add New Article</CardTitle>
            <PlusCircle className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-6">
            <CardDescription className="mb-4">
              Manually create and publish a new news article to your site.
            </CardDescription>
          </CardContent>
           <CardFooter>
                <Button variant="outline" size="sm" asChild className="group">
                <Link href="/admin/articles/new">
                    Add Article <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
            </Button>
           </CardFooter>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-medium">Update Content Feed</CardTitle>
                <RefreshCw className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pt-6">
                <CardDescription className="mb-4">
                Fetch the latest articles from all configured RSS sources. This may take a moment and will update your homepage.
                </CardDescription>
            </CardContent>
            <CardFooter>
                <Button onClick={handleUpdateFeed} disabled={isUpdatingFeed || isLoadingStats || !isAdmin}>
                    {isUpdatingFeed && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isUpdatingFeed ? 'Updating Feed...' : 'Run Feed Update'}
                </Button>
            </CardFooter>
        </Card>
      </div>
    </div>
  );
}
