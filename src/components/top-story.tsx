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
      timerRef.current = setInterval(handleNext, 5000); // Increased to 5s for better mobile UX
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

  // Handle touch events for mobile
  const handleTouchStart = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleTouchEnd = useCallback(() => {
    setIsHovered(false);
    resetTimer();
  }, [resetTimer]);

  if (!articles || articles.length === 0) {
    return (
      <div className="relative w-full h-screen lg:h-[500px] xl:h-[550px] overflow-hidden lg:rounded-xl bg-neutral-900 flex items-center justify-center">
        <div className="text-neutral-500 text-base md:text-lg">No stories available</div>
      </div>
    );
  }

  return (
    <div 
      className="relative w-full h-screen lg:h-[500px] xl:h-[550px] overflow-hidden lg:rounded-xl group text-white bg-neutral-900 shadow-2xl"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Progress bar */}
      {articles.length > 1 && !isHovered && (
        <div className="absolute top-0 left-0 w-full h-1 bg-white/20 z-30">
          <div 
            className="h-full bg-[#F96915] transition-all duration-75 ease-linear shadow-sm"
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
        
        // Responsive date format
        const shortFormattedDate = new Date(article.date).toLocaleDateString('en-US', {
          month: 'short',
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
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 100vw"
                  onError={() => handleImageError(article.id)}
                />
                
                {/* Enhanced gradient overlay - mobile optimized */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/20 lg:from-black/90 lg:via-black/50 lg:to-black/10" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent lg:from-black/40" />
                
                {/* Content - Responsive positioning */}
                <div className="absolute bottom-0 left-0 p-4 sm:p-6 lg:p-8 xl:p-10 w-full">
                  <div className="max-w-4xl">
                    {/* Category Badge */}
                    <Badge 
                      variant="secondary" 
                      className="mb-2 sm:mb-3 text-xs sm:text-sm rounded-full py-1 sm:py-1.5 px-2 sm:px-4 bg-[#F96915]/90 text-white border-[#F96915]/50 backdrop-blur-sm hover:bg-[#F96915] transition-all duration-300 shadow-lg"
                    >
                      <Plane className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="font-medium">{article.category}</span>
                    </Badge>
                    
                    {/* Date and Time - Responsive layout */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mb-2 sm:mb-3">
                      <div className="flex items-center text-xs sm:text-sm text-gray-200/90">
                        <Calendar className="mr-1 sm:mr-1.5 h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">{formattedDate}</span>
                        <span className="sm:hidden">{shortFormattedDate}</span>
                      </div>
                      <div className="flex items-center text-xs sm:text-sm text-gray-200/90">
                        <Clock className="mr-1 sm:mr-1.5 h-3 w-3 sm:h-4 sm:w-4" />
                        {timeAgo}
                      </div>
                    </div>
                    
                    {/* Title - Responsive text sizing */}
                    <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold leading-tight line-clamp-2 sm:line-clamp-3 mb-2 sm:mb-3 text-white group-hover/link:text-[#F96915]/90 transition-colors duration-300">
                      {article.title}
                    </h1>
                    
                    {/* Summary - Responsive visibility */}
                    <p className="text-xs sm:text-sm lg:text-base xl:text-lg text-gray-200/90 line-clamp-2 lg:line-clamp-3 mb-4 sm:mb-6 leading-relaxed hidden sm:block">
                      {article.summary}
                    </p>
                    
                    {/* Mobile summary - shorter version */}
                    <p className="text-xs text-gray-200/90 line-clamp-1 mb-3 leading-relaxed sm:hidden">
                      {article.summary}
                    </p>
                    
                    {/* Read More Button - Responsive sizing */}
                    <div className="inline-flex items-center gap-1.5 sm:gap-2 font-semibold text-xs sm:text-sm lg:text-base text-white bg-[#F96915]/80 hover:bg-[#F96915] px-3 sm:px-4 py-1.5 sm:py-2 rounded-full backdrop-blur-sm border border-[#F96915]/30 transition-all duration-300 group-hover/link:scale-105 shadow-lg hover:shadow-xl">
                      <span>Read Full Story</span>
                      <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 transition-transform group-hover/link:translate-x-1" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        );
      })}
      
      {/* Navigation Controls - Hidden on mobile/tablet, visible on large screens */}
      {articles.length > 1 && (
        <>
          {/* Navigation Buttons - Hidden below lg breakpoint */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full bg-black/50 text-white transition-all duration-300 hover:bg-[#F96915]/80 hover:scale-110 backdrop-blur-sm border border-white/20 shadow-lg hidden lg:flex"
            onClick={onPrevClick}
            aria-label="Previous story"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full bg-black/50 text-white transition-all duration-300 hover:bg-[#F96915]/80 hover:scale-110 backdrop-blur-sm border border-white/20 shadow-lg hidden lg:flex"
            onClick={onNextClick}
            aria-label="Next story"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
          
          {/* Pagination Dots - Responsive sizing and positioning */}
          <div className="absolute bottom-3 sm:bottom-4 lg:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 sm:gap-2 z-20 bg-black/40 backdrop-blur-sm px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-full border border-white/20">
            {articles.map((_, index) => (
              <button
                key={index}
                onClick={() => handleDotClick(index)}
                className={cn(
                  "transition-all duration-300 rounded-full border border-white/30",
                  currentIndex === index 
                    ? "h-2 w-6 sm:h-2.5 sm:w-8 bg-[#F96915] shadow-lg border-[#F96915]/50" 
                    : "h-2 w-2 sm:h-2.5 sm:w-2.5 bg-white/60 hover:bg-white/80 hover:scale-125"
                )}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}

      {/* Mobile swipe indicator - Only show on mobile/tablet */}
      <div className="absolute top-4 right-4 z-20 lg:hidden">
        <div className="bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full border border-white/20 text-xs text-white/80">
          Swipe for more
        </div>
      </div>
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

  if (diffInMinutes < 1) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
