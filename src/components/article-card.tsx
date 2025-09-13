
'use client';

import type { Article } from "@/lib/placeholder-data";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { generateAiHintFromTitle } from "@/lib/utils";
import { Button } from "./ui/button";
import { Share2, Twitter, Facebook, Linkedin, ClipboardCopy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ArticleCardProps {
  article: Article;
}

const WhatsAppIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
    </svg>
  );

const ArticleCard = ({ article }: ArticleCardProps) => {
  const { toast } = useToast();
  const [siteOrigin, setSiteOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSiteOrigin(window.location.origin);
    }
  }, []);
  
  const formattedDate = new Date(article.date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const imageAiHintForPlaceholder = generateAiHintFromTitle(article.title, article.category);
  const placeholderImageSrc = `https://thumbs.dreamstime.com/b/bright-blue-orange-text-displays-breaking-news-digital-screen-surrounded-abstract-data-visualization-elements-386391298.jpg?w=768`;
  
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
          toast({ title: "Link Copied!", description: "Link to this article page copied to clipboard." });
        }).catch(err => {
          toast({ title: "Error", description: "Could not copy link.", variant: "destructive" });
        });
        return;
    }
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
    }
  };


  return (
    <Card className="flex flex-col h-full overflow-hidden rounded-lg bg-card transition-shadow duration-300 hover:shadow-lg">
      <Link href={article.link} className="block group">
        <div className="relative w-full aspect-[16/10] overflow-hidden rounded-md bg-muted">
          <Image
            src={article.imageUrl || placeholderImageSrc}
            alt={article.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300 ease-in-out"
            data-ai-hint={article.imageUrl ? `${article.category} article image` : imageAiHintForPlaceholder}
            onError={(e) => {
              const target = e.currentTarget;
              if (target.src !== placeholderImageSrc) {
                target.srcset = ''; 
                target.src = placeholderImageSrc;
                target.setAttribute('data-ai-hint', imageAiHintForPlaceholder);
              }
            }}
            priority={false} 
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      </Link>
      <CardContent className="p-4 flex-grow flex flex-col">
        <div className="text-sm text-muted-foreground mb-2">
            <span>{article.category}</span>
            <span className="mx-2">&bull;</span>
            <span>{formattedDate}</span>
        </div>
        <h3 className="text-xl font-semibold leading-snug mb-2">
          <Link href={article.link} className="hover:text-primary transition-colors line-clamp-2">
            {article.title}
          </Link>
        </h3>
        <p className="text-muted-foreground line-clamp-3 flex-grow">{article.summary}</p>
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-border/50">
          <Button asChild variant="link" className="p-0 text-primary hover:no-underline">
            <Link href={article.link} aria-label={`Read more about ${article.title}`}>
              Read More
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!pageUrl}>
                  <Share2 className="h-4 w-4" />
                  <span className="sr-only">Share</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleShare('twitter')}>
                <Twitter className="mr-2 h-4 w-4" />
                <span>Twitter</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleShare('facebook')}>
                <Facebook className="mr-2 h-4 w-4" />
                <span>Facebook</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleShare('linkedin')}>
                <Linkedin className="mr-2 h-4 w-4" />
                <span>LinkedIn</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleShare('whatsapp')}>
                <WhatsAppIcon />
                <span className="ml-2">WhatsApp</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleShare('copy')}>
                <ClipboardCopy className="mr-2 h-4 w-4" />
                <span>Copy Link</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
};

export default ArticleCard;
