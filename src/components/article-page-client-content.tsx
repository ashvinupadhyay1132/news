
"use client";

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import type { Article } from '@/lib/placeholder-data'; // Ensure this type import is correct
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CalendarDays, NewspaperIcon, Share2, ExternalLink, AlertCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { generateAiHintFromTitle } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function ArticlePageClientContent() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const articleIdParam = Array.isArray(params.id) ? params.id[0] : params.id;
  const placeholderImageSrcForComponent = `https://placehold.co/1200x675.png`; 

  const fetchArticle = useCallback(async () => {
    if (!articleIdParam) {
      console.warn("[ArticlePageClientContent] articleIdParam is not available for fetch.");
      setLoading(false);
      setFetchError("Article ID is missing in the URL.");
      return;
    }

    setLoading(true);
    setFetchError(null);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setFetchError("Network connection is unavailable. Please check your internet connection and try again.");
      setLoading(false);
      setArticle(null);
      return;
    }

    try {
      const response = await fetch(`/api/articles/${articleIdParam as string}`);
      if (!response.ok) {
        const errorBody = await response.text().catch(() => "Could not read error response body.");
        let errorMessage = `API error! Status: ${response.status}. ID: "${articleIdParam}". Details: ${errorBody.substring(0, 300)}`;
        if (response.status === 404) {
            errorMessage = `Article with ID "${articleIdParam}" not found. It may have been moved or deleted.`;
        }
        console.error(`[ArticlePageClientContent] ${errorMessage}`);
        setFetchError(errorMessage);
        setArticle(null);
      } else {
        const fetchedArticle: Article = await response.json();
        setArticle(fetchedArticle || null);
        if (!fetchedArticle) {
          const notFoundMsg = `Article with ID "${articleIdParam}" not found (API returned null/undefined).`;
          console.warn(`[ArticlePageClientContent] ${notFoundMsg}`);
          setFetchError(notFoundMsg);
        }
      }
    } catch (error: any) {
      let specificMessage = `Error fetching article ID "${articleIdParam}": ${error.message || 'Unknown fetch error'}`;
      if (error instanceof TypeError && error.message.toLowerCase().includes('failed to fetch')) {
        specificMessage = `Could not connect to the server to fetch the article. Please check your internet connection or try again later.`;
      }
      console.error(`[ArticlePageClientContent] ${specificMessage}`, error.stack ? error.stack : error);
      setFetchError(specificMessage);
      setArticle(null);
    } finally {
      setLoading(false);
    }
  }, [articleIdParam]);


  useEffect(() => {
    fetchArticle();
  }, [fetchArticle]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
        <Skeleton className="h-10 w-32 mb-8" />
        <Skeleton className="h-6 w-24 mb-4" />
        <Skeleton className="h-12 sm:h-16 w-full mb-4" />
        <Skeleton className="h-5 w-3/4 mb-6" />
        <Skeleton className="h-64 sm:h-80 md:h-96 w-full mb-8 rounded-lg aspect-video bg-muted/50" />
        <div className="space-y-3">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-5/6" />
          <Skeleton className="h-5 w-full mt-4" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-3/4" />
        </div>
        <div className="mt-10 pt-6 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
          <Skeleton className="h-10 w-full sm:w-60" /> 
          <Skeleton className="h-10 w-full sm:w-32" /> 
        </div>
      </div>
    );
  }

  if (fetchError || !article) { 
    return (
      <div className="text-center py-12 max-w-2xl mx-auto">
        <NewspaperIcon className="mx-auto h-16 w-16 text-muted-foreground mb-6" />
        <h1 className="text-3xl font-semibold mb-4">Article Not Found</h1>
        <Alert variant="destructive" className="mb-8 text-left">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Article</AlertTitle>
            <AlertDescription>
                {fetchError || `The article you are looking for (ID: ${articleIdParam || "Unknown"}) does not exist or may have been moved.`}
                <br/>
                Please ensure your internet connection is stable or try refreshing the page.
            </AlertDescription>
        </Alert>
        <div className="flex justify-center gap-4">
            <Button 
              onClick={() => {
                if (typeof window !== "undefined" && window.history.length > 1) {
                  router.back();
                } else {
                  router.push('/');
                }
              }} 
              className="group flex items-center text-sm"
            >
              <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" /> Go back
            </Button>
            <Button onClick={fetchArticle} variant="outline" className="text-sm">
              Retry Loading
            </Button>
        </div>
      </div>
    );
  }

  const formattedDate = article.date ? new Date(article.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }) : 'Date not available';

  const handleShare = (platform: 'twitter' | 'facebook' | 'linkedin' | 'whatsapp' | 'copy') => {
    const urlToShare = window.location.href; 
    const text = `Check out this article: ${article.title}`;
    let shareUrl = '';

    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(urlToShare)}&text=${encodeURIComponent(text)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(urlToShare)}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(urlToShare)}&title=${encodeURIComponent(article.title)}&summary=${encodeURIComponent(article.summary)}`;
        break;
      case 'whatsapp':
        shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text + " " + urlToShare)}`;
        break;
      case 'copy':
        navigator.clipboard.writeText(urlToShare).then(() => {
          toast({ title: "Page Link Copied!", description: "Link to this article page copied to clipboard." });
        }).catch(err => {
          toast({ title: "Error", description: "Could not copy link.", variant: "destructive" });
          console.error('[ArticlePageClientContent] Failed to copy: ', err);
        });
        return;
    }
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const imageAiHintForPage = generateAiHintFromTitle(article.title, article.category);


  return (
    <>
      <div className="max-w-3xl mx-auto bg-card p-4 sm:p-6 lg:p-8 rounded-lg shadow-lg my-8">
        <Button
          variant="outline"
          className="mb-8 group flex items-center text-sm"
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) {
              router.back();
            } else {
              router.push('/'); // Fallback to homepage if no history or only 1 entry
            }
          }}
        >
          <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to News
        </Button>

        <article>
          <header className="mb-8">
            <Badge variant="secondary" className="mb-3 text-sm py-1 px-2.5">{article.category}</Badge>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-primary mb-4 leading-tight">{article.title}</h1>
            <div className="flex flex-wrap items-center text-sm text-muted-foreground space-x-4 mb-6">
              <div className="flex items-center">
                <CalendarDays className="h-4 w-4 mr-1.5" />
                <span>{formattedDate}</span>
              </div>
              <div className="flex items-center">
                <NewspaperIcon className="h-4 w-4 mr-1.5" />
                <span>Source: {article.source}</span>
              </div>
            </div>
          </header>

          { (article.imageUrl || placeholderImageSrcForComponent) && (
            <div className="relative w-full aspect-video mb-8 rounded-lg overflow-hidden shadow-md bg-muted/50">
              <Image
                src={article.imageUrl || placeholderImageSrcForComponent}
                alt={article.title}
                fill
                className="object-cover"
                priority={true}
                data-ai-hint={article.imageUrl ? `${article.category} article full image` : imageAiHintForPage}
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.src !== placeholderImageSrcForComponent) {
                    target.srcset = '';
                    target.src = placeholderImageSrcForComponent;
                    target.setAttribute('data-ai-hint', imageAiHintForPage);
                  }
                }}
              />
            </div>
          )}

          <div className="prose dark:prose-invert max-w-none mb-8 text-lg leading-relaxed text-foreground/90">
            <div dangerouslySetInnerHTML={{ __html: article.content || article.summary }} />
            {(!article.content || article.content.trim() === article.summary.trim() || (article.summary && article.summary.includes('No summary available.'))) && (
              <p className="mt-6 text-muted-foreground italic">Full content could not be loaded for this article from the RSS feed. Please use the link below to read the full article on the source's website.</p>
            )}
          </div>

          <div className="mt-10 pt-8 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
            {article.sourceLink && article.sourceLink !== '#' && (
              <Button variant="default" asChild size="lg">
                <a href={article.sourceLink.startsWith('http') ? article.sourceLink : `https://${article.sourceLink}`} target="_blank" rel="noopener noreferrer" className="flex items-center">
                  Read Full Article on {article.source} <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="lg">
                  <Share2 className="mr-2 h-4 w-4" /> Share
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleShare('twitter')}>Twitter</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShare('facebook')}>Facebook</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShare('linkedin')}>LinkedIn</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShare('whatsapp')}>WhatsApp</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShare('copy')}>Copy Page Link</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </article>
      </div>
    </>
  );
}

