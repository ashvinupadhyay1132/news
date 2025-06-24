
// src/app/admin/articles/edit/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import type { Article } from '@/lib/placeholder-data';
import { clearArticleCache } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Loader2, AlertTriangle } from 'lucide-react';

const articleFormSchema = z.object({
  title: z.string().min(10, { message: "Title must be at least 10 characters long." }).max(200, { message: "Title cannot be longer than 200 characters." }),
  summary: z.string().min(20, { message: "Summary must be at least 20 characters long." }).max(500, { message: "Summary cannot be longer than 500 characters." }),
  content: z.string().optional(),
  category: z.string().optional(),
  source: z.string().optional(),
  sourceLink: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  imageUrl: z.string().url({ message: "Please enter a valid URL for the image." }).optional().or(z.literal('')),
});

type ArticleFormValues = z.infer<typeof articleFormSchema>;

export default function EditArticlePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  
  const articleId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ArticleFormValues>({
    resolver: zodResolver(articleFormSchema),
    defaultValues: {
      title: '',
      summary: '',
      content: '',
      category: '',
      source: '',
      sourceLink: '',
      imageUrl: '',
    },
  });

  useEffect(() => {
    if (!articleId) return;

    const fetchArticle = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Use the public API to fetch initial article data
        const response = await fetch(`/api/articles/${articleId}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to fetch article data.');
        }
        const data: Article = await response.json();
        setArticle(data);
        // Pre-fill form with fetched data
        form.reset({
            title: data.title,
            summary: data.summary,
            content: data.content || '',
            category: data.category || '',
            source: data.source || '',
            sourceLink: data.sourceLink || '',
            imageUrl: data.imageUrl || '',
        });
      } catch (err) {
        setError((err as Error).message);
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchArticle();
  }, [articleId, form]);

  async function onSubmit(data: ArticleFormValues) {
    if (!isAdmin) {
        toast({ title: "Unauthorized", description: "You do not have permission to update articles.", variant: "destructive" });
        return;
    }
    setIsSubmitting(true);
    try {
        const response = await fetch(`/api/admin/articles/${articleId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Something went wrong');
        }

        clearArticleCache();

        toast({
            title: 'Article Updated',
            description: `The article "${result.article.title}" has been successfully updated.`,
        });
        router.push('/admin/articles');
    } catch (err) {
        toast({
            title: 'Error updating article',
            description: (err as Error).message,
            variant: 'destructive',
        });
    } finally {
        setIsSubmitting(false);
    }
  }
  
  const renderFormSkeleton = () => (
    <div className="space-y-8">
        {Array.from({length: 4}).map((_, i) => (
             <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
             </div>
        ))}
         <Skeleton className="h-10 w-32" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-6 border-b">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Edit Article</h1>
          <p className="text-muted-foreground">Modify the details of an existing article.</p>
        </div>
         <Button variant="outline" asChild>
          <Link href="/admin/articles">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Articles
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Article Form</CardTitle>
          <CardDescription>
            Update the details for the article below.
          </CardDescription>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                renderFormSkeleton()
            ) : error ? (
                <div className="flex flex-col items-center justify-center p-8 text-center text-destructive bg-destructive/10 rounded-md">
                    <AlertTriangle className="h-8 w-8 mb-2" />
                    <p className="text-lg font-semibold">Error Loading Article</p>
                    <p>{error}</p>
                </div>
            ) : (
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                            <Input placeholder="Enter the article title" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="summary"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Summary</FormLabel>
                            <FormControl>
                            <Textarea placeholder="A brief summary of the article" {...field} rows={4} />
                            </FormControl>
                            <FormDescription>This will be shown on the article cards.</FormDescription>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="content"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Content (Optional)</FormLabel>
                            <FormControl>
                            <Textarea placeholder="The full content of the article (HTML allowed)" {...field} rows={10} />
                            </FormControl>
                            <FormDescription>Full article content. If empty, the summary will be used.</FormDescription>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Category (Optional)</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., Technology" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="source"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Source Name (Optional)</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., TechCrunch" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <FormField
                        control={form.control}
                        name="sourceLink"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Source Link (Optional)</FormLabel>
                            <FormControl>
                                <Input placeholder="https://example.com/original-article" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="imageUrl"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Image URL (Optional)</FormLabel>
                            <FormControl>
                                <Input placeholder="https://example.com/image.jpg" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    </div>
                    <Button type="submit" disabled={isSubmitting || !isAdmin}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isSubmitting ? 'Updating...' : 'Update Article'}
                    </Button>
                    </form>
                </Form>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
