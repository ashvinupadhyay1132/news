
"use client";

import { useParams, notFound } from 'next/navigation';
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
          if (fetchedArticle) {
            setArticle(fetchedArticle);
          } else {
            // This will be handled by the !article check below, potentially triggering notFound()
            // or showing a "not found" message. For simplicity, we just log here.
            console.warn(`Article with ID ${articleIdParam} not found.`);
          }
        } catch (error) {
          console.error("Error fetching article:", error);
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
      <div className="max-w-3xl mx-auto p-6 sm:p-8">
        <Skeleton className="h-10 w-32 mb-6" /> {/* Back button skeleton */}
        <Skeleton className="h-6 w-24 mb-3" /> {/* Badge skeleton */}
        <Skeleton className="h-12 w-full mb-3" /> {/* Title skeleton */}
        <Skeleton className="h-10 w-3/4 mb-4" /> {/* Meta info skeleton */}
        <Skeleton className="h-64 sm:h-96 w-full mb-8 rounded-md" /> {/* Image skeleton */}
        <Skeleton className="h-5 w-full mb-2" />
        <Skeleton className="h-5 w-full mb-2" />
        <Skeleton className="h-5 w-5/6 mb-6" />
        <Skeleton className="h-5 w-full mb-2" />
        <Skeleton className="h-5 w-full mb-2" />
        <Skeleton className="h-5 w-3/4 mb-8" />
        <div className="mt-8 pt-6 border-t flex justify-end">
          <Skeleton className="h-10 w-24" /> {/* Share button skeleton */}
        </div>
      </div>
    );
  }

  if (!article) {
    // Optional: Trigger Next.js 404 page if article truly not found
    // if (typeof window !== 'undefined') notFound(); // Only call on client-side after initial check
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-semibold mb-4">Article not found</h1>
        <p className="text-muted-foreground mb-6">The article you are looking for does not exist or may have been moved.</p>
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
    const url = article.sourceLink || window.location.href; // Prefer sharing the original source link
    const text = `Check out this article: ${article.title}`;
    let shareUrl = '';

    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(article.title)}&summary=${encodeURIComponent(article.summary)}`;
        break;
      case 'whatsapp':
        shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text + " " + url)}`;
        break;
      case 'copy':
        navigator.clipboard.writeText(url).then(() => {
          toast({ title: "Link Copied!", description: "Article link copied to clipboard." });
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

  return (
    <div className="max-w-3xl mx-auto bg-card p-6 sm:p-8 rounded-lg shadow-xl">
      <Button asChild variant="outline" className="mb-6">
        <Link href="/">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to News
        </Link>
      </Button>

      <article>
        <header className="mb-6">
          <Badge variant="secondary" className="mb-3">{article.category}</Badge>
          <h1 className="text-3xl sm:text-4xl font-bold text-primary mb-3 leading-tight">{article.title}</h1>
          <div className="flex flex-wrap items-center text-sm text-muted-foreground space-x-4 mb-4">
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

        <div className="relative w-full h-64 sm:h-96 mb-8 rounded-md overflow-hidden shadow-md">
          <Image
            src={article.imageUrl || 'https://placehold.co/600x400.png'}
            alt={article.title}
            layout="fill"
            objectFit="cover"
            priority // Prioritize loading for main article image
            className="transition-opacity duration-300"
            data-ai-hint={`${article.category} article full image`}
            onError={(e) => {
              e.currentTarget.srcset = ''; // Clear srcset to prevent issues with failed sources
              e.currentTarget.src = 'https://placehold.co/800x450.png'; // Slightly larger placeholder
            }}
          />
        </div>
        
        <div className="prose dark:prose-invert max-w-none mb-8 text-foreground/90">
          <p className="text-lg leading-relaxed italic mb-6">{article.summary}</p>
          {/* Render HTML content if available, otherwise show a message. 
              NOTE: dangerouslySetInnerHTML is used here. For production, 
              you MUST sanitize this HTML to prevent XSS attacks if the RSS content is not trusted.
              Using a library like DOMPurify is recommended.
          */}
          {article.content && article.content.trim() !== article.summary.trim() && article.content.trim() !== 'No summary available.' ? (
             <div dangerouslySetInnerHTML={{ __html: article.content }} />
          ) : (
            article.summary.includes('No summary available.') && <p>Full content could not be loaded for this article.</p>
            // If content is same as summary (and summary is not the default "No summary"), don't show "Full content not available".
            // If summary is the default "No summary", then it means content is also likely unavailable.
          )}
        </div>

        <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
          {article.sourceLink && article.sourceLink !== '#' && (
            <Button variant="outline" asChild>
              <a href={article.sourceLink.startsWith('http') ? article.sourceLink : `https://${article.sourceLink}`} target="_blank" rel="noopener noreferrer">
                Read on {article.source} <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
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
