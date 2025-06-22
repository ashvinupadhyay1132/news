
'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { Article } from '@/lib/placeholder-data';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, NewspaperIcon, Share2, ExternalLink } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';
import { generateAiHintFromTitle } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface ArticleViewSheetProps {
  article: Article | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ArticleViewSheet({ article, open, onOpenChange }: ArticleViewSheetProps) {
  const { toast } = useToast();
  const [siteOrigin, setSiteOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSiteOrigin(window.location.origin);
    }
  }, []);

  if (!article) {
    return null;
  }
  
  const pageUrl = siteOrigin && article.link ? `${siteOrigin}${article.link}` : '';

  const handleShare = (platform: 'twitter' | 'facebook' | 'linkedin' | 'whatsapp' | 'copy') => {
    if (!pageUrl) {
      toast({ title: "Error", description: "Cannot determine article URL for sharing.", variant: "destructive" });
      return;
    }
    const text = `Check out this article: ${article.title}`;
    let shareUrl = '';

    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(text)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(pageUrl)}&title=${encodeURIComponent(article.title)}&summary=${encodeURIComponent(article.summary)}`;
        break;
      case 'whatsapp':
        shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text + " " + pageUrl)}`;
        break;
      case 'copy':
        navigator.clipboard.writeText(pageUrl).then(() => {
          toast({ title: "Page Link Copied!", description: "Link to this article page copied to clipboard." });
        }).catch(err => {
          toast({ title: "Error", description: "Could not copy link.", variant: "destructive" });
        });
        return;
    }
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const placeholderImageSrcForComponent = `https://placehold.co/1200x675.png`;
  const imageAiHintForPage = generateAiHintFromTitle(article.title, article.category);
  const formattedDate = new Date(article.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:w-3/4 lg:w-1/2 xl:w-2/5 p-0 flex flex-col" side="right">
        {article && (
          <>
            <SheetHeader className="p-4 sm:p-6 border-b">
              <SheetTitle className="text-xl sm:text-2xl font-bold text-primary leading-tight line-clamp-3">
                <Link href={article.link} className="hover:underline" onClick={() => onOpenChange(false)}>
                  {article.title}
                </Link>
              </SheetTitle>
              <div className="flex flex-wrap items-center text-xs text-muted-foreground gap-x-4 gap-y-1 pt-2">
                <div className="flex items-center">
                  <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
                  <span>{formattedDate}</span>
                </div>
                <div className="flex items-center">
                  <NewspaperIcon className="h-3.5 w-3.5 mr-1.5" />
                  <span>Source: {article.source}</span>
                </div>
                  <Badge variant="secondary" className="text-xs py-0.5 px-2">{article.category}</Badge>
              </div>
            </SheetHeader>
            <ScrollArea className="flex-grow">
              <div className="p-4 sm:p-6">
                {(article.imageUrl || placeholderImageSrcForComponent) && (
                  <div className="relative w-full aspect-video mb-6 rounded-lg overflow-hidden shadow-md bg-muted/50">
                    <Image
                      src={article.imageUrl || placeholderImageSrcForComponent}
                      alt={article.title}
                      fill
                      className="object-cover"
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
                <div className="prose dark:prose-invert max-w-none text-base leading-relaxed text-foreground/90">
                  <div dangerouslySetInnerHTML={{ __html: article.content || article.summary }} />
                  {(!article.content || article.content.trim() === article.summary.trim() || (article.summary && article.summary.includes('No summary available.'))) && (
                    <p className="mt-6 text-muted-foreground italic">Full content could not be loaded for this article. Please use the link below to read the full article on the source's website.</p>
                  )}
                </div>
              </div>
            </ScrollArea>
            <div className="p-4 border-t flex flex-col sm:flex-row justify-between items-center gap-2 bg-muted/50">
                {article.sourceLink && article.sourceLink !== '#' && (
                  <Button variant="default" asChild size="sm">
                    <a href={article.sourceLink.startsWith('http') ? article.sourceLink : `https://${article.sourceLink}`} target="_blank" rel="noopener noreferrer" className="flex items-center">
                      Read on {article.source} <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={!pageUrl}>
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
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
