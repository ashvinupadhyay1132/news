
import type { Article } from "@/lib/placeholder-data";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, NewspaperIcon, Share2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "./ui/button";
import { generateAiHintFromTitle } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

interface ArticleCardProps {
  article: Article;
}

const ArticleCard = ({ article }: ArticleCardProps) => {
  const { toast } = useToast();
  const [siteOrigin, setSiteOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSiteOrigin(window.location.origin);
    }
  }, []);


  const formattedDate = new Date(article.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const imageAiHintForPlaceholder = generateAiHintFromTitle(article.title, article.category);
  const placeholderImageSrc = `https://placehold.co/600x400.png`;

  const handleShare = (platform: 'twitter' | 'facebook' | 'linkedin' | 'whatsapp' | 'copy') => {
    if (!siteOrigin) {
      toast({ title: "Error", description: "Cannot determine website URL for sharing.", variant: "destructive" });
      return;
    }
    
    const internalArticleUrl = `${siteOrigin}${article.link}`;
    const urlToShare = internalArticleUrl;

    if (!urlToShare || urlToShare === `${siteOrigin}/#` || !article.link || article.link === '#') {
        toast({ title: "Error", description: "Article link is not available for sharing.", variant: "destructive" });
        return;
    }

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
          toast({ title: "Article Link Copied!", description: "Link to this article on our site copied to clipboard." });
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
    <Card className="flex flex-col h-full overflow-hidden border shadow-sm hover:shadow-lg transition-all duration-300 ease-in-out rounded-md bg-card group">
      <Link href={article.link} className="block">
        <div className="relative w-full aspect-[16/10] overflow-hidden bg-muted/50">
          <Image
            src={article.imageUrl || placeholderImageSrc}
            alt={article.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300 ease-in-out"
            data-ai-hint={article.imageUrl ? `${article.category || 'news'} article image` : imageAiHintForPlaceholder}
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
      <CardHeader className="p-4 pb-2">
        {/* Category Badge Removed as per request */}
        <CardTitle className="text-lg font-semibold leading-snug pt-2"> {/* Added pt-2 for spacing after badge removal */}
          <Link href={article.link} className="hover:text-primary transition-colors line-clamp-3">
            {article.title}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-1 flex-grow">
        <p className="text-sm text-muted-foreground line-clamp-4">{article.summary}</p>
      </CardContent>
      <CardFooter className="p-4 border-t flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="text-xs text-muted-foreground space-y-1 self-start sm:self-center">
          <div className="flex items-center">
            <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
            {formattedDate}
          </div>
          <div className="flex items-center">
            <NewspaperIcon className="h-3.5 w-3.5 mr-1.5" />
            {article.source}
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-center mt-2 sm:mt-0">
          <Button asChild variant="outline" size="sm" className="whitespace-nowrap">
            <Link href={article.link}>Read More</Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9" disabled={!siteOrigin}>
                <Share2 className="h-4 w-4" />
                <span className="sr-only">Share article</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleShare('twitter')}>Twitter</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleShare('facebook')}>Facebook</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleShare('linkedin')}>LinkedIn</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleShare('whatsapp')}>WhatsApp</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleShare('copy')}>Copy Article Link</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardFooter>
    </Card>
  );
};

export default ArticleCard;

