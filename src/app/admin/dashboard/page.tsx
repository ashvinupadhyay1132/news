
// src/app/admin/dashboard/page.tsx
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, ExternalLink, ListChecks, FileText, PlusCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface DashboardStats {
  totalArticles: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      try {
        const response = await fetch('/api/admin/articles?countOnly=true');
        if (!response.ok) {
          throw new Error(`Failed to fetch stats: ${response.status}`);
        }
        const data = await response.json();
        setStats({ totalArticles: data.totalArticles });
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        toast({
          title: "Error",
          description: "Could not load dashboard statistics.",
          variant: "destructive",
        });
        setStats({ totalArticles: 0 }); // Fallback
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [toast]);

  return (
    <div className="space-y-8">
      <div className="pb-6 border-b">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground">Overview and management tools for NewsHunt.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Content Overview</CardTitle>
            <FileText className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <>
                <Skeleton className="h-8 w-24 mb-1" />
                <Skeleton className="h-4 w-32" />
              </>
            ) : (
              <>
                <div className="text-3xl font-bold text-primary">{stats?.totalArticles ?? 0}</div>
                <p className="text-xs text-muted-foreground">Total articles in the database</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Manage Articles</CardTitle>
            <ListChecks className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              View, add, edit, or delete articles.
            </p>
            <Button variant="outline" size="sm" asChild className="mt-2 group">
              <Link href="/admin/articles">
                Go to Articles <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Add New Article</CardTitle>
            <PlusCircle className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
             <p className="text-sm text-muted-foreground">
              Manually create a new news article. (Functionality Coming Soon)
            </p>
            <Button variant="outline" size="sm" asChild className="mt-2 group">
              <Link href="/admin/articles/new">
                Add Article <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Website Analytics</CardTitle>
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
             <p className="text-sm text-muted-foreground">
              Track visits and user engagement via Vercel Analytics.
            </p>
            <Button variant="outline" size="sm" asChild className="mt-2 group">
              <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer">
                Open Vercel Dashboard <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
