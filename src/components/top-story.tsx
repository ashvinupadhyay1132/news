'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Article } from '@/lib/placeholder-data';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Plane, Clock, Calendar, Play } from 'lucide-react';
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
      }, 6000);
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

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setIsHovered(true);
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
      <div className="relative w-full h-[60vh] sm:h-[70vh] lg:h-[500px] xl:h-[550px] overflow-hidden lg:rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-slate-400 text-base md:text-lg">No stories available</div>
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-[60vh] sm:h-[70vh] lg:h-[500px] xl:h-[550px] overflow-hidden lg:rounded-2xl group text-white bg-slate-900 shadow-2xl border border-slate-800/50"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {articles.length > 1 && !isHovered && (
        <div className="absolute top-0 left-0 w-full h-0.5 bg-white/10 z-30">
          <div
            key={currentIndex}
            className="h-full bg-gradient-to-r from-orange-500 to-red-500 animate-[grow_6s_linear]"
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
        const placeholderImageSrc = `https://placehold.co/1200x675/1e293b/64748b?text=Breaking+News`;
        const imageAiHint = generateAiHintFromTitle(article.title, article.category);
        const hasImageError = imageLoadErrors.has(article.id);

        return (
          <div
            key={article.id}
            className={cn(
              'absolute inset-0 transition-all duration-1000 ease-out',
              isActive 
                ? 'opacity-100 z-10 scale-100 translate-x-0' 
                : 'opacity-0 z-0 scale-105 translate-x-8'
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
                  className="object-cover object-center transition-transform duration-1000 ease-out group-hover/link:scale-105"
                  data-ai-hint={article.imageUrl && !hasImageError ? 'news story' : imageAiHint}
                  priority={index === 0}
                  sizes="100vw"
                  onError={() => handleImageError(article.id)}
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />

                <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-6 lg:p-8 xl:p-10">
                  <div className="max-w-4xl space-y-3 sm:space-y-4">
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="secondary"
                        className="text-xs sm:text-sm rounded-full py-1.5 sm:py-2 px-3 sm:px-4 bg-gradient-to-r from-orange-500/90 to-red-500/90 text-white border-0 backdrop-blur-md shadow-lg"
                      >
                        <Plane className="mr-1.5 h-3 w-3 sm:h-4 sm:w-4" />
                        {article.category}
                      </Badge>
                      
                      {timeAgo.includes('m ago') && (
                        <div className="flex items-center gap-1.5 text-xs bg-red-500/80 text-white px-2 py-1 rounded-full backdrop-blur-sm">
                          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                          LIVE
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-gray-200/80">
                      <div className="flex items-center text-xs sm:text-sm">
                        <Calendar className="mr-1.5 h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">{formattedDate}</span>
                        <span className="sm:hidden">{shortFormattedDate}</span>
                      </div>
                      <div className="flex items-center text-xs sm:text-sm">
                        <Clock className="mr-1.5 h-3 w-3 sm:h-4 sm:w-4" />
                        {timeAgo}
                      </div>
                    </div>

                    <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold leading-tight line-clamp-2 sm:line-clamp-3 bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
                      {article.title}
                    </h1>

                    <p className="hidden sm:block text-sm lg:text-base xl:text-lg text-gray-200/80 line-clamp-3 leading-relaxed">
                      {article.summary}
                    </p>

                    <p className="sm:hidden text-xs text-gray-300/70 line-clamp-1">
                      {article.summary}
                    </p>

                    <div className="pt-2">
                      <div className="inline-flex items-center gap-2 text-xs sm:text-sm lg:text-base font-semibold bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 px-4 sm:px-6 py-2 sm:py-3 rounded-full transition-all duration-300 transform hover:scale-105 hover:shadow-lg backdrop-blur-sm">
                        <Play className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>Read Story</span>
                        <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                      </div>
                    </div>
                  </div>
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
            className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-20 hidden lg:flex h-12 w-12 bg-black/40 hover:bg-gradient-to-r hover:from-orange-500/80 hover:to-red-500/80 backdrop-blur-md border border-white/20 rounded-full transition-all duration-300"
            onClick={handlePrev}
          >
            <ChevronLeft className="h-6 w-6 text-white" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-20 hidden lg:flex h-12 w-12 bg-black/40 hover:bg-gradient-to-r hover:from-orange-500/80 hover:to-red-500/80 backdrop-blur-md border border-white/20 rounded-full transition-all duration-300"
            onClick={handleNext}
          >
            <ChevronRight className="h-6 w-6 text-white" />
          </Button>

          <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20 bg-black/30 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
            {articles.map((_, index) => (
              <button
                key={index}
                onClick={() => handleDotClick(index)}
                className={cn(
                  'transition-all duration-300 rounded-full',
                  currentIndex === index
                    ? 'h-2 w-8 bg-gradient-to-r from-orange-500 to-red-500 shadow-lg'
                    : 'h-2 w-2 bg-white/50 hover:bg-white/70 hover:scale-110'
                )}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}

      <div className="absolute top-4 right-4 z-20 lg:hidden">
        <div className="flex items-center gap-1.5 text-xs bg-black/40 backdrop-blur-md text-white/80 px-3 py-1.5 rounded-full border border-white/20">
          <div className="flex gap-0.5">
            <div className="w-1 h-1 bg-white/60 rounded-full animate-pulse" />
            <div className="w-1 h-1 bg-white/40 rounded-full animate-pulse" />
            <div className="w-1 h-1 bg-white/60 rounded-full animate-pulse" />
          </div>
          Swipe
        </div>
      </div>
    </div>
  );
}

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
