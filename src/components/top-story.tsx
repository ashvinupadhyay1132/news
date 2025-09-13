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
  const touchStartX = useRef<number | null>(null);

  const handleNext = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % articles.length);
  }, [articles.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + articles.length) % articles.length);
  }, [articles.length]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (articles.length > 1 && !isHovered) {
      timerRef.current = setTimeout(() => {
        handleNext();
      }, 5000);
    }
  }, [articles.length, isHovered, handleNext]);

  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resetTimer, currentIndex]);

  const handleDotClick = (index: number) => {
    setCurrentIndex(index);
  };

  const handleImageError = (articleId: string) => {
    setImageLoadErrors((prev) => new Set(prev).add(articleId));
  };

  // Touch swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setIsHovered(true); // pause auto
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current !== null) {
      const diff = e.changedTouches[0].clientX - touchStartX.current;
      if (diff > 50) {
        handlePrev();
      } else if (diff < -50) {
        handleNext();
      }
    }
    touchStartX.current = null;
    setIsHovered(false);
  };

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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Progress bar */}
      {articles.length > 1 && !isHovered && (
        <div className="absolute top-0 left-0 w-full h-1 bg-white/20 z-30">
          <div
            key={currentIndex} // restart animation
            className="h-full bg-[#F96915] animate-[grow_5s_linear]"
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
              'absolute inset-0 transition-all duration-700 ease-in-out',
              isActive ? 'opacity-100 z-10 scale-100' : 'opacity-0 z-0 scale-105'
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

                {/* Gradient overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/20 lg:from-black/90 lg:via-black/50 lg:to-black/10" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent lg:from-black/40" />

                {/* Content */}
                <div className="absolute bottom-0 left-0 p-4 sm:p-6 lg:p-8 xl:p-10 w-full">
                  <div className="max-w-4xl">
                    <Badge
                      variant="secondary"
                      className="mb-2 sm:mb-3 text-xs sm:text-sm rounded-full py-1 sm:py-1.5 px-2 sm:px-4 bg-[#F96915]/90 text-white border-[#F96915]/50 backdrop-blur-sm"
                    >
                      <Plane className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                      {article.category}
                    </Badge>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mb-2 sm:mb-3 text-gray-200/90">
                      <div className="flex items-center text-xs sm:text-sm">
                        <Calendar className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">{formattedDate}</span>
                        <span className="sm:hidden">{shortFormattedDate}</span>
                      </div>
                      <div className="flex items-center text-xs sm:text-sm">
                        <Clock className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                        {timeAgo}
                      </div>
                    </div>

                    <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold line-clamp-2 sm:line-clamp-3 mb-2 sm:mb-3">
                      {article.title}
                    </h1>

                    <p className="hidden sm:block text-sm lg:text-base xl:text-lg text-gray-200/90 line-clamp-3 mb-4 sm:mb-6">
                      {article.summary}
                    </p>

                    <p className="sm:hidden text-xs text-gray-200/90 line-clamp-1 mb-3">
                      {article.summary}
                    </p>

                    <div className="inline-flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm lg:text-base font-semibold bg-[#F96915]/80 hover:bg-[#F96915] px-3 sm:px-4 py-1.5 sm:py-2 rounded-full">
                      <span>Read Full Story</span>
                      <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
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
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 hidden lg:flex bg-black/50 hover:bg-[#F96915]/80"
            onClick={handlePrev}
          >
            <ChevronLeft className="h-6 w-6 text-white" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 hidden lg:flex bg-black/50 hover:bg-[#F96915]/80"
            onClick={handleNext}
          >
            <ChevronRight className="h-6 w-6 text-white" />
          </Button>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20 bg-black/40 px-3 py-1.5 rounded-full">
            {articles.map((_, index) => (
              <button
                key={index}
                onClick={() => handleDotClick(index)}
                className={cn(
                  'transition-all rounded-full',
                  currentIndex === index
                    ? 'h-2 w-6 bg-[#F96915]'
                    : 'h-2 w-2 bg-white/60 hover:bg-white/80'
                )}
              />
            ))}
          </div>
        </>
      )}

      {/* Swipe hint */}
      <div className="absolute top-4 right-4 z-20 lg:hidden text-xs bg-black/40 px-2 py-1 rounded-full">
        Swipe for more
      </div>
    </div>
  );
}

// Helper
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}