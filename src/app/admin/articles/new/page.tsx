
// src/app/admin/articles/new/page.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

// This is a placeholder page for adding new articles.
// Full form implementation will be done in a subsequent step.

export default function AddNewArticlePage() {
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
            (Form functionality coming soon)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-8 text-center text-muted-foreground bg-muted/50 rounded-md">
            <p className="text-lg">Article creation form will be here.</p>
            <p className="text-sm">Fields will include: Title, Summary, Content, Category, Source, Image URL, etc.</p>
          </div>
           {/* 
            Placeholder for form fields:
            <Input placeholder="Article Title" />
            <Textarea placeholder="Article Summary" />
            <Textarea placeholder="Article Content (Markdown or HTML)" rows={10} />
            <Select>...</Select> // For category
            <Input placeholder="Source Name (e.g., TechCrunch)" />
            <Input placeholder="Source Link (URL to original article)" />
            <Input placeholder="Image URL (Optional)" />
            <Button type="submit" disabled>Save Article (Coming Soon)</Button>
           */}
        </CardContent>
      </Card>
    </div>
  );
}
