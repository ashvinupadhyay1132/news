
"use client";

import { useRouter } from 'next/navigation';
import { type Article } from '@/lib/placeholder-data';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CalendarDays, NewspaperIcon, Share2, ExternalLink, Plane } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';
import { generateAiHintFromTitle } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { Separator } from '@/components/ui/separator';
import ArticleCard from '@/components/article-card';

interface ArticlePageClientContentProps {
  article: Article;
  relevantArticles: Article[];
}

export default function ArticlePageClientContent({ article, relevantArticles }: ArticlePageClientContentProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [clientFormattedDate, setClientFormattedDate] = useState<string | null>(null);
  const [processedContent, setProcessedContent] = useState(article.content || article.summary);

  const placeholderImageSrcForComponent = `https://placehold.co/1200x675.png`;

  useEffect(() => {
    if (article?.date) {
      const formatted = new Date(article.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      setClientFormattedDate(formatted);
    } else {
      setClientFormattedDate('Date not available');
    }
  }, [article?.date]);
  
  useEffect(() => {
    // This effect runs only on the client to avoid hydration mismatch.
    // If a hero image exists, we assume the first image in the content is a duplicate and remove it.
    if (!article.content || !article.imageUrl) {
      setProcessedContent(article.content || article.summary);
      return;
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(article.content, 'text/html');
      
      const firstImageInContent = doc.querySelector('img');

      if (firstImageInContent) {
        // A common pattern is <figure><img></figure> or <a><img></a>. If so, remove the whole wrapper.
        const parent = firstImageInContent.parentElement;
        if (parent && (parent.tagName.toLowerCase() === 'figure' || parent.tagName.toLowerCase() === 'a') && parent.textContent.trim() === '' && parent.children.length === 1) {
            parent.remove();
        } else {
            firstImageInContent.remove();
        }
        setProcessedContent(doc.body.innerHTML);
      } else {
        setProcessedContent(article.content);
      }
    } catch (error) {
      console.error("Error processing article content to remove duplicate image:", error);
      setProcessedContent(article.content);
    }
  }, [article.content, article.imageUrl]);


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
      <div className="max-w-3xl mx-auto bg-card p-4 sm:p-6 lg:p-8 rounded-lg my-8">
        <Button
          variant="ghost"
          className="mb-8 group flex items-center text-sm"
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) {
              router.back();
            } else {
              router.push('/');
            }
          }}
        >
          <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to News
        </Button>

        <article>
          <header className="mb-8">
            <Badge variant="default" className="mb-3 text-sm py-1 px-3">
              <Plane className="mr-2 h-4 w-4" />
              {article.category}
            </Badge>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 leading-tight">{article.title}</h1>
            <div className="flex flex-wrap items-center text-sm text-muted-foreground space-x-4 mb-6">
              <div className="flex items-center">
                <CalendarDays className="h-4 w-4 mr-1.5" />
                <span>{clientFormattedDate || 'Loading date...'}</span>
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
                sizes="(max-width: 768px) 100vw, 768px"
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
            <div dangerouslySetInnerHTML={{ __html: processedContent }} />
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
      
      {relevantArticles && relevantArticles.length > 0 && (
        <div className="max-w-7xl mx-auto mt-12">
          <Separator />
          <h2 className="text-3xl font-bold text-foreground tracking-tight my-8">
            You Might Also Like
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {relevantArticles.map((relevantArticle) => (
              <ArticleCard key={relevantArticle.id} article={relevantArticle} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
