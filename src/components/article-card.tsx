
import type { Article } from "@/lib/placeholder-data";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, NewspaperIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "./ui/button";
import { slugify, generateAiHintFromTitle } from "@/lib/utils";

interface ArticleCardProps {
  article: Article;
}

const ArticleCard = ({ article }: ArticleCardProps) => {
  const formattedDate = new Date(article.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const imageAiHint = generateAiHintFromTitle(article.title, article.category);
  const placeholderImageSrc = `https://placehold.co/600x400.png`;

  return (
    <Card className="flex flex-col h-full overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg bg-card group">
      <Link href={article.link} className="block">
        <div className="relative w-full h-52 sm:h-48 overflow-hidden bg-muted/50"> {/* Added bg-muted for better placeholder appearance */}
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
                target.srcset = ''; // Prevent further attempts with broken src
                target.src = placeholderImageSrc;
                // Update AI hint if we switched to placeholder
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
        <Button asChild variant="outline" size="sm" className="self-end sm:self-center whitespace-nowrap mt-2 sm:mt-0">
          <Link href={article.link}>Read More</Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ArticleCard;
