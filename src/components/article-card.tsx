import type { Article } from "@/lib/placeholder-data";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, NewspaperIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "./ui/button";

interface ArticleCardProps {
  article: Article;
}

const ArticleCard = ({ article }: ArticleCardProps) => {
  const formattedDate = new Date(article.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Card className="flex flex-col h-full overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg bg-card">
      <Link href={article.link} className="block">
        <div className="relative w-full h-48">
          <Image
            src={article.imageUrl}
            alt={article.title}
            layout="fill"
            objectFit="cover"
            data-ai-hint={`${article.category} news`}
          />
        </div>
      </Link>
      <CardHeader className="p-4">
        <Badge variant="secondary" className="mb-2 w-fit">{article.category}</Badge>
        <CardTitle className="text-lg font-semibold leading-tight">
          <Link href={article.link} className="hover:text-primary transition-colors">
            {article.title}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <p className="text-sm text-muted-foreground line-clamp-3">{article.summary}</p>
      </CardContent>
      <CardFooter className="p-4 border-t border-border flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex items-center">
            <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
            {formattedDate}
          </div>
          <div className="flex items-center">
            <NewspaperIcon className="h-3.5 w-3.5 mr-1.5" />
            {article.source}
          </div>
        </div>
        <Button asChild variant="link" size="sm" className="p-0 h-auto text-primary hover:underline">
          <Link href={article.link}>Read More &rarr;</Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ArticleCard;
