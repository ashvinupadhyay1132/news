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
