'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Article } from '@/lib/placeholder-data';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Plane, Clock, Calendar } from 'lucide-react';
import { generateAiHintFromTitle, cn } from '@/lib/utils';

interface TopStoryProps {
  articles: Article[];
}

export default function TopStory({ articles }: TopStoryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoadErrors, setImageLoadErrors] = useState<Set<string>>(new Set());
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
    if (articles.length > 1 && !isHovered) {
      timerRef.current = setInterval(handleNext, 4000); // Increased to 4s for better UX
    }
  }, [handleNext, articles.length, isHovered]);

  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [resetTimer]);

  const handleDotClick = useCallback((index: number) => {
    if (index === currentIndex) return;
    setCurrentIndex(index);
    resetTimer();
  }, [currentIndex, resetTimer]);

  const onPrevClick = useCallback(() => {
    handlePrev();
    resetTimer();
  }, [handlePrev, resetTimer]);

  const onNextClick = useCallback(() => {
    handleNext();
    resetTimer();
  }, [handleNext, resetTimer]);

  const handleImageError = useCallback((articleId: string) => {
    setImageLoadErrors(prev => new Set(prev).add(articleId));
  }, []);

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    resetTimer();
  };

  if (!articles || articles.length === 0) {
    return (
      <div className="relative w-full aspect-[3/4] md:aspect-[16/9] overflow-hidden md:rounded-lg bg-neutral-900 flex items-center justify-center">
        <div className="text-neutral-500 text-lg">No stories available</div>
      </div>
    );
  }

  return (
    <div 
      className="relative w-full aspect-[3/4] md:aspect-[16/9] overflow-hidden md:rounded-lg group text-white bg-neutral-900 shadow-2xl"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Progress bar */}
      {articles.length > 1 && !isHovered && (
        <div className="absolute top-0 left-0 w-full h-1 bg-white/20 z-30">
          <div 
            className="h-full bg-white transition-all duration-75 ease-linear"
            style={{
              width: `${((currentIndex + 1) / articles.length) * 100}%`
            }}
          />
        </div>
      )}

      {articles.map((article, index) => {
        const isActive = index === currentIndex;
        const formattedDate = new Date(article.date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        
        const timeAgo = getTimeAgo(new Date(article.date));
        const placeholderImageSrc = `https://placehold.co/1200x675/1f2937/9ca3af?text=News+Story`;
        const imageAiHint = generateAiHintFromTitle(article.title, article.category);
        const hasImageError = imageLoadErrors.has(article.id);

        return (
          <div
            key={article.id}
            className={cn(
              "absolute inset-0 transition-all duration-700 ease-in-out",
              isActive ? "opacity-100 z-10 scale-100" : "opacity-0 z-0 scale-105"
            )}
            aria-hidden={!isActive}
          >
            <Link 
              href={article.link} 
              className="block h-full w-full group/link" 
              tabIndex={isActive ? 0 : -1}
              aria-label={`Read article: ${article.title}`}
            >
              <div className="relative h-full w-full overflow-hidden">
                <Image
                  src={hasImageError || !article.imageUrl ? placeholderImageSrc : article.imageUrl}
                  alt={article.title}
                  fill
                  className="object-cover transition-transform duration-700 ease-out group-hover/link:scale-110"
                  data-ai-hint={article.imageUrl && !hasImageError ? 'news story' : imageAiHint}
                  priority={index === 0}
                  sizes="100vw"
                  onError={() => handleImageError(article.id)}
                />
                
                {/* Enhanced gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/10" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />
                
                {/* Content */}
                <div className="absolute bottom-0 left-0 p-6 md:p-8 lg:p-10 w-full">
                  <div className="max-w-4xl">
                    {/* Category Badge */}
                    <Badge 
                      variant="secondary" 
                      className="mb-3 text-xs md:text-sm rounded-full py-1.5 px-4 bg-white/15 text-white border-white/20 backdrop-blur-sm hover:bg-white/25 transition-colors"
                    >
                      <Plane className="mr-2 h-3 w-3 md:h-4 md:w-4" />
                      {article.category}
                    </Badge>
                    
                    {/* Date and Time */}
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex items-center text-xs md:text-sm text-gray-200/90">
                        <Calendar className="mr-1.5 h-3 w-3 md:h-4 md:w-4" />
                        {formattedDate}
                      </div>
                      <div className="flex items-center text-xs md:text-sm text-gray-200/90">
                        <Clock className="mr-1.5 h-3 w-3 md:h-4 md:w-4" />
                        {timeAgo}
                      </div>
                    </div>
                    
                    {/* Title */}
                    <h1 className="text-xl md:text-3xl lg:text-4xl font-bold leading-tight line-clamp-2 md:line-clamp-3 mb-3 text-white group-hover/link:text-blue-100 transition-colors">
                      {article.title}
                    </h1>
                    
                    {/* Summary */}
                    <p className="text-sm md:text-base lg:text-lg text-gray-200/90 line-clamp-2 md:line-clamp-3 mb-6 leading-relaxed">
                      {article.summary}
                    </p>
                    
                    {/* Read More Button */}
                    <div className="inline-flex items-center gap-2 font-semibold text-sm md:text-base text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm border border-white/20 transition-all duration-300 group-hover/link:scale-105">
                      <span>Read Full Story</span>
                      <ChevronRight className="h-4 w-4 transition-transform group-hover/link:translate-x-1" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        );
      })}
      
      {/* Navigation Controls */}
      {articles.length > 1 && (
        <>
          {/* Navigation Buttons */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 h-11 w-11 md:h-12 md:w-12 rounded-full bg-black/40 text-white transition-all duration-300 hover:bg-black/60 hover:scale-110 backdrop-blur-sm border border-white/10"
            onClick={onPrevClick}
            aria-label="Previous story"
          >
            <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 h-11 w-11 md:h-12 md:w-12 rounded-full bg-black/40 text-white transition-all duration-300 hover:bg-black/60 hover:scale-110 backdrop-blur-sm border border-white/10"
            onClick={onNextClick}
            aria-label="Next story"
          >
            <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
          </Button>
          
          {/* Pagination Dots */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10">
            {articles.map((_, index) => (
              <button
                key={index}
                onClick={() => handleDotClick(index)}
                className={cn(
                  "transition-all duration-300 rounded-full border border-white/20",
                  currentIndex === index 
                    ? "h-2.5 w-8 bg-white shadow-lg" 
                    : "h-2.5 w-2.5 bg-white/50 hover:bg-white/75 hover:scale-125"
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

// Helper function to calculate time ago
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
