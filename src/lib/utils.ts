
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

// Function to generate AI hint for placeholder images based on title
export function generateAiHintFromTitle(title: string): string {
  if (!title) return 'news article';
  const commonWords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'for', 'to', 'and', 'or', 'but', 'of', 'with',
    'how', 'why', 'when', 'what', 'who', 'it', 'its', 'from', 'as', 'by', 'this', 'that', 'these', 'those',
    'live', 'updates', 'news', 'story', 'reports', 'says', 'told', 'after', 'before', 'over', 'under', 'new', 'old'
  ]);

  const words = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove punctuation except hyphens
    .split(/\s+/)
    .map(word => word.replace(/^-+|-+$/g, '')) // Trim hyphens from words
    .filter(word => word.length > 2 && !commonWords.has(word) && !/^\d+$/.test(word)); // Remove short words, common words, and pure numbers

  if (words.length === 0) return 'article media';
  if (words.length === 1) return words[0];
  // Return a maximum of two keywords
  const hint = words.slice(0, 2).join(' ');
  return hint;
}
