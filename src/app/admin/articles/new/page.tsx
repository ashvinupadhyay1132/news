
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { clearArticleCache } from '@/lib/utils';

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

export default function AddNewArticlePage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user, isAdmin } = useAuth();
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

  async function onSubmit(data: ArticleFormValues) {
    if (!isAdmin) {
        toast({ title: "Unauthorized", description: "You do not have permission to create articles.", variant: "destructive" });
        return;
    }
    setIsSubmitting(true);
    try {
        const response = await fetch('/api/admin/articles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Something went wrong');
        }

        clearArticleCache();

        toast({
            title: 'Article Created',
            description: `The article "${result.article.title}" has been successfully created.`,
        });
        router.push('/admin/articles');
    } catch (error) {
        toast({
            title: 'Error creating article',
            description: (error as Error).message,
            variant: 'destructive',
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-6 border-b">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Add New Article</h1>
          <p className="text-muted-foreground">Create and publish a new article manually.</p>
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
          <CardTitle>New Article Form</CardTitle>
          <CardDescription>
            Fill in the details below to add a new article.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                {isSubmitting ? 'Creating...' : 'Create Article'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
