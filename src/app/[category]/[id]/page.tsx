
"use client";

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getArticleById, type Article } from '@/lib/placeholder-data';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CalendarDays, NewspaperIcon, Share2, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { slugify } from '@/lib/utils';
// IMPORTANT: For production, you MUST install and use an HTML sanitizer like DOMPurify.
// import DOMPurify from 'dompurify';

export default function ArticlePage() {
  const params = useParams();
  const { toast } = useToast();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  const articleIdParam = Array.isArray(params.id) ? params.id[0] : params.id;

  useEffect(() => {
    if (articleIdParam) {
      const fetchArticle = async () => {
        setLoading(true);
        try {
          const fetchedArticle = await getArticleById(articleIdParam as string);
          setArticle(fetchedArticle || null); // Set to null if not found
          if (!fetchedArticle) {
            console.warn(`Article with ID ${articleIdParam} not found.`);
          }
        } catch (error) {
          console.error("Error fetching article:", error);
          setArticle(null);
        } finally {
          setLoading(false);
        }
      };
      fetchArticle();
    } else {
      setLoading(false);
    }
  }, [articleIdParam]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
        <Skeleton className="h-10 w-32 mb-8" />
        <Skeleton className="h-6 w-24 mb-4" /> 
        <Skeleton className="h-12 sm:h-16 w-full mb-4" /> 
        <Skeleton className="h-5 w-3/4 mb-6" /> 
        <Skeleton className="h-64 sm:h-80 md:h-96 w-full mb-8 rounded-lg" />
        <div className="space-y-3">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-5/6" />
          <Skeleton className="h-5 w-full mt-4" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-3/4" />
        </div>
        <div className="mt-10 pt-6 border-t flex justify-end">
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="text-center py-12">
        <NewspaperIcon className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
        <h1 className="text-3xl font-semibold mb-4">Article Not Found</h1>
        <p className="text-muted-foreground mb-8">
          The article you are looking for does not exist or may have been moved.
        </p>
        <Button asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" /> Go back to Homepage
          </Link>
        </Button>
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
    const urlToShare = article.sourceLink || window.location.href; 
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
          toast({ title: "Link Copied!", description: "Original article link copied to clipboard." });
        }).catch(err => {
          toast({ title: "Error", description: "Could not copy link.", variant: "destructive" });
          console.error('Failed to copy: ', err);
        });
        return; 
    }
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
    }
  };
  
  const imageHint = slugify(article.category) || "news";
  const placeholderImageSrc = `https://placehold.co/1200x675.png`; // Larger placeholder for article page

  return (
    <div className="max-w-3xl mx-auto bg-card p-4 sm:p-6 lg:p-8 rounded-lg shadow-xl my-8">
      <Button asChild variant="outline" className="mb-8 group">
        <Link href="/" className="flex items-center text-sm">
          <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to News
        </Link>
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

        {article.imageUrl && (
          <div className="relative w-full aspect-video mb-8 rounded-lg overflow-hidden shadow-md bg-muted/50">
            <Image
              src={article.imageUrl}
              alt={article.title}
              layout="fill"
              objectFit="cover"
              priority 
              className="transition-opacity duration-300"
              data-ai-hint={`${imageHint} article full image`}
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src !== placeholderImageSrc) {
                  target.srcset = '';
                  target.src = placeholderImageSrc;
                  target.setAttribute('data-ai-hint', `${imageHint} placeholder large`);
                }
              }}
            />
          </div>
        )}
        
        <div className="prose dark:prose-invert max-w-none mb-8 text-lg leading-relaxed text-foreground/90">
          {/* 
            SECURITY WARNING: Rendering HTML from RSS feeds (article.content) via dangerouslySetInnerHTML 
            is a significant XSS (Cross-Site Scripting) risk if the content is not sanitized.
            For a production application, you MUST use a library like DOMPurify to sanitize
            this HTML before rendering it. Example:
            // import DOMPurify from 'dompurify';
            // const cleanHtml = DOMPurify.sanitize(article.content || article.summary);
            // <div dangerouslySetInnerHTML={{ __html: cleanHtml }} />
          */}
          <div dangerouslySetInnerHTML={{ __html: article.content || article.summary }} />
          {(!article.content || article.content.trim() === article.summary.trim()) && article.summary.includes('No summary available.') && (
            <p className="mt-6 text-muted-foreground italic">Full content could not be loaded for this article from the RSS feed.</p>
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
              <DropdownMenuItem onClick={() => handleShare('copy')}>Copy Original Link</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </article>
    </div>
  );
}
