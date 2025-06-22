
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Article } from '@/lib/placeholder-data';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Plane } from 'lucide-react';
import { generateAiHintFromTitle, cn } from '@/lib/utils';

interface TopStoryProps {
  articles: Article[];
}

export default function TopStory({ articles }: TopStoryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleNext = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % articles.length);
  }, [articles.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + articles.length) % articles.length);
  }, [articles.length]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (articles.length > 1) {
      timerRef.current = setInterval(handleNext, 3000);
    }
  }, [handleNext, articles.length]);

  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [resetTimer]);


  const handleDotClick = (index: number) => {
    if (index === currentIndex) return;
    setCurrentIndex(index);
    resetTimer();
  };

  const onPrevClick = () => {
    handlePrev();
    resetTimer();
  };

  const onNextClick = () => {
    handleNext();
    resetTimer();
  };

  if (!articles || articles.length === 0) {
    return null;
  }

  return (
    <div className="relative w-full aspect-[3/4] md:aspect-[16/9] overflow-hidden md:rounded-lg group text-white bg-neutral-900">
      {articles.map((article, index) => {
        const isActive = index === currentIndex;
        const formattedDate = new Date(article.date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        
        const placeholderImageSrc = `https://placehold.co/1200x675.png`;
        const imageAiHint = generateAiHintFromTitle(article.title, article.category);

        return (
          <div
            key={article.id}
            className={cn(
              "absolute inset-0 transition-opacity duration-1000 ease-in-out",
              isActive ? "opacity-100 z-10" : "opacity-0 z-0"
            )}
            aria-hidden={!isActive}
          >
            <Link href={article.link} className="block h-full w-full" tabIndex={isActive ? 0 : -1}>
                <Image
                    src={article.imageUrl || placeholderImageSrc}
                    alt={article.title}
                    fill
                    className="object-cover transition-transform duration-500 ease-in-out"
                    data-ai-hint={article.imageUrl ? 'news story' : imageAiHint}
                    priority={index === 0} // Only prioritize the first image for initial load
                    sizes="100vw"
                    onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src !== placeholderImageSrc) {
                        target.srcset = ''; 
                        target.src = placeholderImageSrc;
                        target.setAttribute('data-ai-hint', imageAiHint);
                    }
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                <div className="absolute bottom-0 left-0 p-6 md:p-10 w-full md:w-3/4 lg:w-2/3">
                    <Badge variant="default" className="mb-2 text-sm rounded-full py-1 px-4 drop-shadow-lg">
                        <Plane className="mr-2 h-4 w-4" />
                        {article.category}
                    </Badge>
                    <p className="text-xs md:text-sm text-gray-200 mb-2 drop-shadow-md">
                        {formattedDate}
                    </p>
                    <h1 className="text-2xl md:text-4xl font-bold leading-tight line-clamp-3 mb-2 drop-shadow-lg">
                        {article.title}
                    </h1>
                    <p className="text-sm md:text-base text-gray-200 line-clamp-2 md:line-clamp-3 mb-4 drop-shadow">
                        {article.summary}
                    </p>
                    <div className="font-semibold text-base text-white hover:text-white/90 group-hover:underline drop-shadow">
                        Read More
                    </div>
                </div>
            </Link>
          </div>
        );
      })}
      
      {articles.length > 1 && (
          <>
              <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-20 h-10 w-10 md:h-12 md:w-12 rounded-full bg-black/30 text-white transition-opacity hover:bg-black/50"
                  onClick={onPrevClick}
                  aria-label="Previous story"
              >
                  <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-20 h-10 w-10 md:h-12 md:w-12 rounded-full bg-black/30 text-white transition-opacity hover:bg-black/50"
                  onClick={onNextClick}
                  aria-label="Next story"
              >
                  <ChevronRight className="h-6 w-6" />
              </Button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2 z-20">
                  {articles.map((_, index) => (
                      <button
                          key={index}
                          onClick={() => handleDotClick(index)}
                          className={cn(
                              "h-2 w-2 rounded-full transition-colors",
                              currentIndex === index ? "bg-white" : "bg-white/50 hover:bg-white/75"
                          )}
                          aria-label={`Go to slide ${index + 1}`}
                      />
                  ))}
              </div>
          </>
      )}
    </div>
  );
}
