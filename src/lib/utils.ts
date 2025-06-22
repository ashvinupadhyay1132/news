
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w-]+/g, '')       // Remove all non-word chars (alphanumeric, underscore, hyphen)
    .replace(/--+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

// Helper to safely get a property from a deeply nested object
export function getNestedValue(obj: any, path: string, defaultValue: any = undefined) {
  if (!obj || typeof path !== 'string') {
    return defaultValue;
  }
  const value = path.split('.').reduce((acc, part) => {
    // Handle array indexing like part[0]
    const match = part.match(/(\w+)\[(\d+)\]/);
    if (match) {
      const arrayKey = match[1];
      const index = parseInt(match[2], 10);
      if (acc && acc[arrayKey] && Array.isArray(acc[arrayKey]) && acc[arrayKey].length > index) {
        return acc[arrayKey][index];
      }
      return undefined;
    }
    return acc && acc[part];
  }, obj);
  return value === undefined ? defaultValue : value;
}

// Function to generate AI hint for placeholder images
export function generateAiHintFromTitle(title: string, category?: string): string {
  const commonWords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'for', 'to', 'and', 'or', 'but', 'of', 'with',
    'how', 'why', 'when', 'what', 'who', 'it', 'its', 'from', 'as', 'by', 'this', 'that', 'these', 'those',
    'live', 'updates', 'news', 'story', 'reports', 'says', 'told', 'after', 'before', 'over', 'under', 'new', 'old',
    'latest', 'top', 'daily', 'breaking', 'headlines', 'analysis', 'review', 'explainer', 'opinion', 'world', 'india', 'global', 'local'
  ]);

  const titleKeywords = title
    ? title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .split(/\s+/)
        .map(word => word.replace(/^-+|-+$/g, ''))
        .filter(word => word.length > 2 && !commonWords.has(word) && !/^\d+$/.test(word))
    : [];

  let categoryKeyword = '';
  if (category) {
    const catSlug = slugify(category);
    if (catSlug && !commonWords.has(catSlug) && catSlug.split('-').length === 1 && catSlug !== 'general' && catSlug !== 'all') {
      categoryKeyword = catSlug;
    }
  }

  if (categoryKeyword) {
    if (titleKeywords.length > 0 && categoryKeyword !== titleKeywords[0]) {
      return `${categoryKeyword} ${titleKeywords[0]}`.substring(0, 50); // Max 2 words generally, ensure reasonable length
    }
    return categoryKeyword;
  }

  if (titleKeywords.length === 0) return 'news article';
  if (titleKeywords.length === 1) return titleKeywords[0];
  return `${titleKeywords[0]} ${titleKeywords[1]}`.substring(0, 50);
}

export function clearArticleCache() {
  if (typeof window !== "undefined") {
    Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('articleGrid_')) {
            sessionStorage.removeItem(key);
        }
    });
    console.log('[Cache] Cleared all articleGrid caches from sessionStorage.');
  }
}
