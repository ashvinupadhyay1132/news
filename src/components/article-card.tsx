
import type { Article } from "@/lib/placeholder-data";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, NewspaperIcon, Share2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "./ui/button";
import { slugify, generateAiHintFromTitle } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface ArticleCardProps {
  article: Article;
}

const ArticleCard = ({ article }: ArticleCardProps) => {
  const { toast } = useToast();
  const formattedDate = new Date(article.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const imageAiHint = generateAiHintFromTitle(article.title, article.category);
  const placeholderImageSrc = `https://placehold.co/600x400.png`;

  const handleShare = (platform: 'twitter' | 'facebook' | 'linkedin' | 'whatsapp' | 'copy') => {
    // Ensure sourceLink is a full URL before sharing
    let urlToShare = article.sourceLink;
    if (urlToShare && !urlToShare.startsWith('http')) {
      urlToShare = `https://${urlToShare}`;
    }
    
    if (!urlToShare || urlToShare === '#') {
        toast({ title: "Error", description: "Source link is not available for sharing.", variant: "destructive" });
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

  return (
    <Card className="flex flex-col h-full overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg bg-card group">
      <Link href={article.link} className="block">
        <div className="relative w-full h-52 sm:h-48 overflow-hidden bg-muted/50">
          <Image
            src={article.imageUrl || placeholderImageSrc}
            alt={article.title}
            layout="fill"
            objectFit="cover"
            className="group-hover:scale-105 transition-transform duration-300 ease-in-out"
            data-ai-hint={article.imageUrl ? `${slugify(article.category)} thumbnail` : imageAiHint}
            onError={(e) => {
              const target = e.currentTarget;
              if (target.src !== placeholderImageSrc) {
                target.srcset = ''; 
                target.src = placeholderImageSrc;
                target.setAttribute('data-ai-hint', imageAiHint);
              }
            }}
          />
        </div>
      </Link>
      <CardHeader className="p-4 pb-2">
        <Badge variant="secondary" className="mb-2 w-fit text-xs">{article.category}</Badge>
        <CardTitle className="text-lg font-semibold leading-snug">
          <Link href={article.link} className="hover:text-primary transition-colors line-clamp-3">
            {article.title}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-1 flex-grow">
        <p className="text-sm text-muted-foreground line-clamp-4">{article.summary}</p>
      </CardContent>
      <CardFooter className="p-4 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-3">
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
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Share2 className="h-4 w-4" />
                <span className="sr-only">Share article</span>
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
      </CardFooter>
    </Card>
  );
};

export default ArticleCard;
