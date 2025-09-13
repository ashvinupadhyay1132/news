// @ts-nocheck
// Disabling TypeScript checks for this file due to the dynamic nature of RSS feed structures
// and the use of xml2js which can lead to complex type definitions.
'use server';

import { Parser } from 'xml2js';
import type { Article as ArticleInterface } from './placeholder-data';
import { slugify, getNestedValue } from './utils';
import he from 'he';
import iconv from 'iconv-lite';
import { load as cheerioLoad } from 'cheerio';
import { getArticlesCollection } from './mongodb';

interface NewsSource {
  name: string;
  rssUrl: string;
  defaultCategory?: string;
  fetchOgImageFallback?: boolean;
}

// Define target display categories
const TARGET_DISPLAY_CATEGORIES = [
  'Technology', 'Business & Finance', 'Sports', 'Politics',
  'Entertainment', 'Science', 'World News', 'India News',
  'Life & Style', 'Top News', 'General'
] as const;

type DisplayCategory = typeof TARGET_DISPLAY_CATEGORIES[number];

// Configuration constants
const FETCH_CONFIG = {
  timeout: 15000,
  revalidate: 300,
  maxRetries: 3,
  retryDelay: 1000,
} as const;

const PROCESSING_CONFIG = {
  maxSlugLength: 150,
  maxSuffixLength: 25,
  defaultProcessingCap: 500,
  minTitleLength: 10,
  minSummaryLength: 25,
  maxSummaryLength: 250,
  similarityThreshold: 0.8,
  ogImageTimeout: 8000,
} as const;

const KEYWORD_MAPPINGS = {
  technology: {
    raw: ['tech', 'gadget', 'internet', 'software', 'hardware', 'ai', 'artificial intelligence', 'crypto', 'digital', 'startup', 'app', 'computing', 'innovation', 'programming', 'data', 'cloud', 'cybersecurity', 'mobile', 'wearable', 'vr', 'ar'],
    title: [' tech', 'software', 'hardware', ' ai', ' app ', 'developer', 'algorithm', 'data breach', 'cybersecurity', 'platform', 'online', 'website', 'user interface', 'user experience', 'gadget review', 'latest smartphone', 'coding language', 'machine learning']
  },
  sports: {
    raw: ['sports', 'cricket', 'football', 'soccer', 'tennis', 'ipl', 'olympic', 'nba', 'mls', 'esports', 'f1', 'motogp', 'athletics', 'badminton', 'hockey', 'rugby', 'golf', 'wrestling', 'boxing', 'formula 1', 'e-sports', 'gaming competition'],
    title: ['cricket score', 'ipl match', 'football game', 'tennis tournament', 'olympic medal', 'nba playoffs', 'world cup qualifier', 'grand slam event', 'batsman', 'bowler', 'goal', 'league table', 'championship game', 'fixture schedule', 'match report', 'final score', 'athlete', 'sports update', 'team lineup'],
    titleStrong: ['cricket', 'ipl final', 'football match', 'tennis open', 'olympic games', 'nba championship', 'world cup soccer', 'grand prix racing']
  },
  business: {
    raw: ['business', 'finance', 'stock', 'market', 'economic', 'economy', 'compan', 'industr', 'bank', 'invest', 'corporate', 'earnings', 'ipo', 'merger', 'acquisition', 'trade', 'commerce', 'financial', 'nse', 'bse', 'sensex', 'nifty', 'cryptocurrency business'],
    title: ['sensex', 'nifty', 'ipo', 'startup funding', 'quarterly result', 'profit', 'loss', 'gdp', 'inflation', 'interest rate', 'budget', 'fiscal policy', 'monetary policy', 'shares', 'stocks', 'commodities', 'forex', 'bull market', 'bear market', 'economic growth', 'recession', 'company shares', 'market trends']
  },
  politics: {
    raw: ['politic', 'election', 'government', 'parliament', 'minister', 'democracy', 'legislature', 'ballot', 'campaign', 'diplomacy', 'geopolitics', 'public policy', 'political party'],
    title: ['election result', 'prime minister', 'modi', 'rahul gandhi', 'parliament session', 'bill passed', 'policy debate', 'international summit', 'treaty negotiation', 'geopolitical tension', 'vote count', 'political rally', 'mp', 'mla', 'chief minister', 'cabinet meeting', 'government scheme']
  },
  entertainment: {
    raw: ['entertainment', 'movie', 'film', 'music', 'bollywood', 'hollywood', 'celebrity', 'tv', 'web series', 'cinema', 'arts', 'culture', 'showbiz', 'box office', 'gossip', 'ott platform'],
    title: ['box office collection', 'movie review', 'film trailer', 'album release', 'concert tour', 'award ceremony', 'actor interview', 'actress lifestyle', 'director announcement', 'series finale date', 'ott platform release', 'celebrity news', 'film release']
  },
  science: {
    raw: ['science', 'space', 'health research', 'scientific discover', 'astronomy', 'physics', 'biology', 'chemistry', 'medicine research', 'environment science', 'archaeology', 'paleontology', 'innovation in science', 'research article'],
    title: ['nasa mission', 'isro launch', 'spacex flight', 'mars rover', 'black hole discovery', 'clinical trial results', 'vaccine development', 'fossil find', 'dinosaur era', 'climate change report', 'quantum computing breakthrough', 'dna sequencing', 'scientific breakthrough', 'research paper', 'new species']
  },
  world: {
    raw: ['world', 'global', 'international', 'asia news', 'europe news', 'africa news', 'america news', 'un session', 'nato meeting', 'foreign affairs discussion', 'international conflict'],
    title: ['war in', 'global summit on', 'international relations update', 'united nations resolution', 'conflict between', 'treaty signing between', 'foreign minister meets', 'ukraine crisis', 'middle east peace']
  },
  india: {
    raw: ['india', 'national', 'delhi', 'mumbai', 'bengaluru', 'kolkata', 'chennai', 'hyderabad', 'pune', 'state news', 'indian affairs', 'bharat', 'indian government'],
    title: ['india', 'delhi', 'mumbai', 'bengaluru', 'kolkata', 'chennai', 'hyderabad', 'pune', 'bharat']
  },
  lifestyle: {
    raw: ['life', 'style', 'fashion', 'food', 'travel', 'wellness', 'horoscope', 'recipe', 'well-being', 'home decor', 'garden tips', 'parenting advice', 'relationships guide', 'beauty trends', 'health tips'],
    title: ['fashion week highlights', 'easy recipe for', 'travel guide to', 'yoga benefits', 'meditation techniques', 'daily zodiac forecast', 'parenting hacks', 'home makeover ideas', 'latest beauty products', 'healthy eating habits']
  }
} as const;

function mapToDisplayCategory(rawCategory: string, title: string = ''): DisplayCategory {
  const lowerRawCategory = rawCategory.toLowerCase();
  const lowerTitle = title.toLowerCase();

  // Helper function to check if keywords match
  const hasKeywords = (keywords: readonly string[], text: string): boolean => 
    keywords.some(keyword => text.includes(keyword));

  const hasNewsCategory = ['news', 'general', 'headlines', 'top stor'].some(cat => lowerRawCategory.includes(cat)) || lowerRawCategory === '';

  // Technology mapping with sports conflict resolution
  if (hasKeywords(KEYWORD_MAPPINGS.technology.raw, lowerRawCategory)) {
    if (!hasKeywords(KEYWORD_MAPPINGS.sports.titleStrong, lowerTitle)) {
      return 'Technology';
    }
  }
  if (hasKeywords(KEYWORD_MAPPINGS.technology.title, lowerTitle)) {
    if (!hasKeywords(KEYWORD_MAPPINGS.sports.titleStrong, lowerTitle)) {
      return 'Technology';
    }
  }

  // Sports mapping
  if (hasKeywords(KEYWORD_MAPPINGS.sports.raw, lowerRawCategory)) return 'Sports';
  if (hasKeywords(KEYWORD_MAPPINGS.sports.title, lowerTitle) && 
      (hasNewsCategory || lowerRawCategory.includes('sport'))) {
    // Avoid tech-sports conflicts
    if (!(lowerTitle.includes('match') && 
          (hasKeywords(KEYWORD_MAPPINGS.technology.raw, lowerRawCategory) || 
           hasKeywords(KEYWORD_MAPPINGS.technology.title, lowerTitle)))) {
      return 'Sports';
    }
  }

  // Business & Finance mapping
  if (hasKeywords(KEYWORD_MAPPINGS.business.raw, lowerRawCategory)) return 'Business & Finance';
  if (hasKeywords(KEYWORD_MAPPINGS.business.title, lowerTitle) && 
      (hasNewsCategory || ['business', 'finance'].some(cat => lowerRawCategory.includes(cat)))) {
    return 'Business & Finance';
  }

  // Politics mapping
  if (hasKeywords(KEYWORD_MAPPINGS.politics.raw, lowerRawCategory)) return 'Politics';
  if (hasKeywords(KEYWORD_MAPPINGS.politics.title, lowerTitle) && 
      (hasNewsCategory || lowerRawCategory.includes('politic'))) {
    return 'Politics';
  }

  // Entertainment mapping with lifestyle conflict resolution
  if (hasKeywords(KEYWORD_MAPPINGS.entertainment.raw, lowerRawCategory)) {
    if (!(lowerRawCategory.includes('lifestyle') && 
          (hasKeywords(KEYWORD_MAPPINGS.technology.raw, lowerRawCategory) || 
           hasKeywords(KEYWORD_MAPPINGS.business.raw, lowerRawCategory)))) {
      return 'Entertainment';
    }
  }
  if (hasKeywords(KEYWORD_MAPPINGS.entertainment.title, lowerTitle) && 
      (hasNewsCategory || lowerRawCategory.includes('entertainment'))) {
    return 'Entertainment';
  }

  // Science mapping with health-business conflict resolution
  if (hasKeywords(KEYWORD_MAPPINGS.science.raw, lowerRawCategory)) {
    if (!(lowerRawCategory.includes('health') && 
          (hasKeywords(KEYWORD_MAPPINGS.business.raw, lowerRawCategory) || 
           lowerRawCategory.includes('market')))) {
      return 'Science';
    }
  }
  if (hasKeywords(KEYWORD_MAPPINGS.science.title, lowerTitle) && 
      (hasNewsCategory || lowerRawCategory.includes('science'))) {
    return 'Science';
  }

  // World News mapping
  if (hasKeywords(KEYWORD_MAPPINGS.world.raw, lowerRawCategory) && 
      !['india', 'bharat'].some(country => lowerRawCategory.includes(country))) {
    return 'World News';
  }
  if (hasKeywords(KEYWORD_MAPPINGS.world.title, lowerTitle) && 
      !['india', 'bharat'].some(country => lowerTitle.includes(country) || lowerRawCategory.includes(country))) {
    return 'World News';
  }

  // India News mapping
  if (hasKeywords(KEYWORD_MAPPINGS.india.raw, lowerRawCategory)) return 'India News';
  if (hasKeywords(KEYWORD_MAPPINGS.india.title, lowerTitle) && hasNewsCategory) return 'India News';

  // Life & Style mapping with tech/business conflict resolution
  if (hasKeywords(KEYWORD_MAPPINGS.lifestyle.raw, lowerRawCategory)) {
    if (!(hasKeywords(KEYWORD_MAPPINGS.technology.raw, lowerRawCategory) || 
          hasKeywords(KEYWORD_MAPPINGS.business.raw, lowerRawCategory))) {
      return 'Life & Style';
    }
  }
  if (hasKeywords(KEYWORD_MAPPINGS.lifestyle.title, lowerTitle) && 
      (hasNewsCategory || lowerRawCategory.includes('lifestyle'))) {
    if (!(hasKeywords(KEYWORD_MAPPINGS.technology.title, lowerTitle) || 
          hasKeywords(KEYWORD_MAPPINGS.business.title, lowerTitle))) {
      return 'Life & Style';
    }
  }

  // Top News mapping
  const topNewsKeywords = ['top stor', 'latest news', 'breaking news', 'headlines'];
  if (topNewsKeywords.some(keyword => lowerRawCategory.includes(keyword))) return 'Top News';

  // Direct category match
  const matchedTargetCategory = TARGET_DISPLAY_CATEGORIES.find(tc => tc.toLowerCase() === lowerRawCategory);
  if (matchedTargetCategory) return matchedTargetCategory;

  return 'General';
}

const NEWS_SOURCES: NewsSource[] = [
  { name: "TechCrunch", rssUrl: "https://techcrunch.com/feed/", defaultCategory: "Technology", fetchOgImageFallback: true },
  { name: "Reuters Business", rssUrl: "https://feeds.reuters.com/reuters/businessNews", defaultCategory: "Business & Finance", fetchOgImageFallback: true },
  { name: "Live Science", rssUrl: "https://www.livescience.com/home/feed/site.xml", defaultCategory: "Science", fetchOgImageFallback: true },

  { name: "TOI - Top Stories", rssUrl: "https://timesofindia.indiatimes.com/rssfeedstopstories.cms", defaultCategory: "Top News", fetchOgImageFallback: false },
  { name: "TOI - India News", rssUrl: "https://timesofindia.indiatimes.com/rssfeeds/54829575.cms", defaultCategory: "India News", fetchOgImageFallback: false },
  { name: "TOI - World News", rssUrl: "https://timesofindia.indiatimes.com/rssfeeds/296589292.cms", defaultCategory: "World News", fetchOgImageFallback: false },
  { name: "TOI - Entertainment", rssUrl: "https://timesofindia.indiatimes.com/rssfeeds/1081479906.cms", defaultCategory: "Entertainment", fetchOgImageFallback: true },
  { name: "TOI - Sports", rssUrl: "https://timesofindia.indiatimes.com/rssfeeds/4719148.cms", defaultCategory: "Sports", fetchOgImageFallback: false },
  { name: "TOI - Business", rssUrl: "https://timesofindia.indiatimes.com/rssfeeds/1898055.cms", defaultCategory: "Business & Finance", fetchOgImageFallback: false },
  { name: "TOI - Science", rssUrl: "https://timesofindia.indiatimes.com/rssfeeds/-2128672765.cms", defaultCategory: "Science", fetchOgImageFallback: false },
  { name: "TOI - Life & Style", rssUrl: "https://timesofindia.indiatimes.com/rssfeeds/2886704.cms", defaultCategory: "Life & Style", fetchOgImageFallback: false },

  { name: "Economic Times", rssUrl: "https://economictimes.indiatimes.com/rssfeedsdefault.cms", defaultCategory: "Business & Finance", fetchOgImageFallback: true },
];

const parser = new Parser({
  explicitArray: false,
  ignoreAttrs: false,
  mergeAttrs: true,
  trim: true,
  normalize: true,
  normalizeTags: true
});

// Utility function to sleep for retry delays
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url: string, options: RequestInit, retries: number = FETCH_CONFIG.maxRetries): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }
      if (attempt === retries) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      console.warn(`[Fetch Retry] Attempt ${attempt}/${retries} failed for ${url}. Retrying in ${FETCH_CONFIG.retryDelay}ms...`);
      await sleep(FETCH_CONFIG.retryDelay * attempt); // Exponential backoff
    }
  }
  throw new Error('Max retries exceeded');
}

async function fetchOgImageFromUrl(articleUrl: string): Promise<string | null> {
  if (!articleUrl || !articleUrl.startsWith('http')) {
    return null;
  }

  try {
    const response = await fetchWithRetry(articleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      },
      signal: AbortSignal.timeout(PROCESSING_CONFIG.ogImageTimeout)
    }, 2); // Fewer retries for OG image fetching

    const htmlContent = await response.text();
    const $ = cheerioLoad(htmlContent);

    const ogSelectors = [
      'meta[property="og:image"]',
      'meta[name="og:image"]',
      'meta[property="twitter:image"]',
      'meta[name="twitter:image"]'
    ];

    let ogImageUrl: string | undefined;
    for (const selector of ogSelectors) {
      ogImageUrl = $(selector).attr('content');
      if (ogImageUrl) break;
    }

    if (ogImageUrl && typeof ogImageUrl === 'string') {
      ogImageUrl = he.decode(ogImageUrl.trim());
      
      // Handle protocol-relative URLs
      if (ogImageUrl.startsWith('//')) {
        ogImageUrl = `https:${ogImageUrl}`;
      }
      
      // Handle relative URLs
      if (ogImageUrl.startsWith('/')) {
        const urlObject = new URL(articleUrl);
        ogImageUrl = `${urlObject.protocol}//${urlObject.hostname}${ogImageUrl}`;
      }

      if (ogImageUrl.startsWith('http')) {
        try {
          const validatedUrl = new URL(ogImageUrl);
          return validatedUrl.href;
        } catch (e) {
          console.warn(`[RSS OG Fetch] Invalid OG image URL: "${ogImageUrl}" from ${articleUrl}`);
          return null;
        }
      }
    }
    return null;
  } catch (error) {
    console.warn(`[RSS OG Fetch] Error fetching OG image from ${articleUrl}:`, error);
    return null;
  }
}

function normalizeContent(contentInput: any): string {
  if (!contentInput) return '';
  
  let text = '';
  
  if (typeof contentInput === 'string') {
    text = contentInput;
  } else if (contentInput && typeof contentInput._ === 'string') {
    text = contentInput._;
  } else if (contentInput && typeof contentInput.$t === 'string') {
    text = contentInput.$t;
  } else if (contentInput && typeof contentInput['#'] === 'string') {
    text = contentInput['#'];
  } else if (contentInput && typeof contentInput['#text'] === 'string') {
    text = contentInput['#text'];
  } else if (contentInput && contentInput['#name'] === '__cdata' && typeof contentInput._ === 'string') {
    text = contentInput._;
  } else if (Array.isArray(contentInput)) {
    text = contentInput.map(segment => normalizeContent(segment)).join(' ');
  } else if (typeof contentInput === 'object' && contentInput !== null) {
    // Try common text field names
    const potentialTextKeys = ['_', '$t', '#text', '#cdata', 'p', 'span', 'div'];
    for (const key of potentialTextKeys) {
      if (contentInput[key] && typeof contentInput[key] === 'string') {
        text = contentInput[key];
        break;
      }
    }
    
    // Try standard content fields
    if (!text) {
      const standardFields = [
        getNestedValue(contentInput, 'content:encoded'),
        getNestedValue(contentInput, 'content'),
        getNestedValue(contentInput, 'description'),
        getNestedValue(contentInput, 'summary'),
      ];
      for (const val of standardFields) {
        if (val) {
          const normalizedVal = normalizeContent(val);
          if (normalizedVal && normalizedVal.trim() !== '') {
            text = normalizedVal;
            break;
          }
        }
      }
    }
  }

  if (text) {
    let decodedText = text.trim();
    try {
      decodedText = he.decode(decodedText);
      // Remove control characters and replacement characters
      decodedText = decodedText.replace(/[\uFFFD\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
      return decodedText;
    } catch (e) {
      console.warn('[Content Decode] Error decoding HTML entities:', e);
      return text.trim().replace(/[\uFFFD\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    }
  }
  return '';
}

function normalizeAndStripHtml(htmlString: string): string {
  if (!htmlString || typeof htmlString !== 'string') return "";
  
  try {
    return he.decode(htmlString)
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s\s+/g, ' ')
      .trim();
  } catch (e) {
    console.warn('[HTML Strip] Error processing HTML:', e);
    return htmlString.replace(/<[^>]+>/g, ' ').replace(/\s\s+/g, ' ').trim();
  }
}

function isSummaryJustTitle(title: string, summary: string, similarityThreshold: number = PROCESSING_CONFIG.similarityThreshold): boolean {
  if (!title || !summary) return false;

  const normalizedTitle = normalizeAndStripHtml(title).toLowerCase();
  const normalizedSummary = normalizeAndStripHtml(summary).toLowerCase();

  if (normalizedTitle.length === 0 || normalizedSummary.length === 0) return false;

  // Check if summary starts with title and is not much longer
  if (normalizedSummary.startsWith(normalizedTitle) && 
      (normalizedSummary.length < normalizedTitle.length + 30)) {
    return true;
  }

  // Check word overlap
  const titleWords = new Set(normalizedTitle.split(/\s+/).filter(w => w.length > 2));
  if (titleWords.size === 0) return false;

  const summaryWords = normalizedSummary.split(/\s+/);
  let commonWords = 0;
  summaryWords.forEach(word => {
    if (word.length > 2 && titleWords.has(word)) {
      commonWords++;
    }
  });

  const overlapRatio = commonWords / titleWords.size;
  return overlapRatio >= similarityThreshold;
}

function normalizeSummary(descriptionInput: any, fullContentInput?: any, sourceName?: string): string {
  let textToSummarize = '';
  const descriptionText = normalizeContent(descriptionInput);
  const fullContentText = normalizeContent(fullContentInput);

  // Use full content if it's significantly longer than description
  if (fullContentText && fullContentText.length > (descriptionText?.length || 0) + 50) {
    textToSummarize = fullContentText;
  } else if (descriptionText) {
    textToSummarize = descriptionText;
  } else if (fullContentText) {
    textToSummarize = fullContentText;
  }

  // Clean Reddit-specific content
  if (sourceName && sourceName.toLowerCase().includes("reddit")) {
    textToSummarize = textToSummarize
      .replace(/<p>submitted by.*?<\/p>/gi, '')
      .replace(/<a href="[^"]*">\[comments?\]<\/a>/gi, '')
      .replace(/<a href="[^"]*">\[link\]<\/a>/gi, '')
      .replace(/<a[^>]*?>\[\d+ comments?\]<\/a>/gi, '')
      .replace(/<p><a href="[^"]*">.*?read more.*?<\/a><\/p>/gi, '');
  }

  const plainText = normalizeAndStripHtml(textToSummarize);

  // Fallback to full content if initial processing failed
  if (!plainText && fullContentText && fullContentText !== textToSummarize) {
    const plainFullContent = normalizeAndStripHtml(fullContentText);
    return he.decode(plainFullContent.substring(0, PROCESSING_CONFIG.maxSummaryLength) + 
      (plainFullContent.length > PROCESSING_CONFIG.maxSummaryLength ? '...' : ''));
  }

  if (plainText.length === 0) return "No summary available.";
  
  return he.decode(plainText.substring(0, PROCESSING_CONFIG.maxSummaryLength) + 
    (plainText.length > PROCESSING_CONFIG.maxSummaryLength ? '...' : ''));
}

function extractImageUrl(item: any, articleTitle: string, articleCategory?: string, sourceName?: string, articleLink?: string): string | null {
  const potentialImageSources: string[] = [];

  try {
    // Extract from media:content
    if (item['media:content']) {
      const mediaContents = Array.isArray(item['media:content']) ? item['media:content'] : [item['media:content']];
      for (const content of mediaContents) {
        if (content?.url && (content.medium === 'image' || 
            (content.type && String(content.type).startsWith('image/')))) {
          potentialImageSources.push(content.url);
        }
      }
    }

    // Extract from media:group
    if (item['media:group']?.['media:content']) {
      const mediaContents = Array.isArray(item['media:group']['media:content'])
        ? item['media:group']['media:content']
        : [item['media:group']['media:content']];
      for (const content of mediaContents) {
        if (content?.url && (content.medium === 'image' || 
            (content.type && String(content.type).startsWith('image/')))) {
          potentialImageSources.push(content.url);
        }
      }
    }

    // Extract from enclosure
    if (item.enclosure?.url && item.enclosure.type && 
        String(item.enclosure.type).startsWith('image/')) {
      potentialImageSources.push(item.enclosure.url);
    }

    // Extract from media:thumbnail
    if (item['media:thumbnail']?.url) {
      potentialImageSources.push(item['media:thumbnail'].url);
    }

    // Extract from image field
    if (item.image) {
      if (item.image.url) {
        potentialImageSources.push(item.image.url);
      } else if (typeof item.image === 'string' && item.image.startsWith('http')) {
        potentialImageSources.push(item.image);
      }
    }

    // Extract images from content fields
    const contentFields = [
      getNestedValue(item, 'content:encoded'),
      getNestedValue(item, 'content'),
      getNestedValue(item, 'description'),
      getNestedValue(item, 'summary'),
    ];

    for (const field of contentFields) {
      const normalizedField = normalizeContent(field);
      if (normalizedField && typeof normalizedField === 'string') {
        const $ = cheerioLoad(normalizedField);
        $('img').each((_i, el) => {
          const imgSelectors = ['src', 'data-src', 'data-original', 'data-lazy-src'];
          for (const selector of imgSelectors) {
            const srcCandidate = $(el).attr(selector);
            if (srcCandidate) {
              potentialImageSources.push(srcCandidate.trim());
              break;
            }
          }
        });
      }
    }

    // Process and validate image URLs
    for (let src of potentialImageSources) {
      if (typeof src !== 'string') continue;
      src = src.trim();

      // Handle protocol-relative URLs
      if (src.startsWith('//')) {
        src = `https:${src}`;
      }

      // Handle relative URLs
      if (!src.startsWith('http') && articleLink && articleLink.startsWith('http')) {
        try {
          const base = new URL(articleLink);
          if (src.startsWith('/')) {
            src = new URL(src, base.origin).href;
          } else {
            src = new URL(src, base.href).href;
          }
        } catch (e) {
          console.warn(`[Image URL] Failed to resolve relative URL: ${src}`);
          continue;
        }
      }

      if (src.startsWith('http')) {
        try {
          const validatedUrl = new URL(src);
          if (validatedUrl.protocol === 'http:' || validatedUrl.protocol === 'https:') {
            return validatedUrl.href;
          }
        } catch (urlError) {
          console.warn(`[Image URL] Invalid URL: ${src}`);
        }
      }
    }

    return null;
  } catch (error) {
    console.warn(`[Image Extract] Error extracting image URL:`, error);
    return null;
  }
}

function normalizeSourceLinkForDedupe(link: string | null | undefined): string | null {
  if (!link || typeof link !== 'string' || !link.startsWith('http')) {
    return null;
  }
  
  try {
    const urlObj = new URL(link);
    
    // Remove common tracking parameters
    const commonTrackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'fbclid', 'gclid', 'msclkid', 'mc_eid', 'mc_cid',
      '_ga', 'source', 'src', 'ref', 'spm', 'share_id', 'share_source',
      'feedType', 'feedName', 'rssfeed', 'syndication', 'CMP', 'ncid', 'ICID',
    ];
    
    commonTrackingParams.forEach(param => urlObj.searchParams.delete(param));

    // Sort remaining parameters for consistency
    const sortedSearchParams = new URLSearchParams();
    Array.from(urlObj.searchParams.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([key, value]) => sortedSearchParams.append(key, value));

    // Normalize pathname
    let finalPathname = urlObj.pathname;
    if (finalPathname !== '/' && finalPathname.endsWith('/')) {
      finalPathname = finalPathname.slice(0, -1);
    }

    return `${urlObj.protocol}//${urlObj.hostname}${finalPathname}${sortedSearchParams.toString() ? '?' + sortedSearchParams.toString() : ''}`;
  } catch (e) {
    console.warn(`[URL Normalize] Failed to normalize URL: ${link}`, e);
    const trimmedLink = link.trim();
    return trimmedLink.startsWith('http') ? trimmedLink : null;
  }
}

export interface ArticleUpdateStats {
  newlyAddedCount: number;
  processedInBatch: number;
  skippedBySourceLink: number;
  skippedByTitle: number;
}

async function saveArticlesToDatabase(articles: ArticleInterface[]): Promise<ArticleUpdateStats> {
  const defaultStats: ArticleUpdateStats = { 
    newlyAddedCount: 0, 
    processedInBatch: 0, 
    skippedBySourceLink: 0, 
    skippedByTitle: 0 
  };
  
  if (!articles || articles.length === 0) {
    console.log('[DB Save] No articles to save.');
    return defaultStats;
  }
  
  console.log(`[DB Save] Received ${articles.length} articles to potentially save/update.`);

  try {
    const articlesCollection = await getArticlesCollection();

    // Get existing articles for deduplication
    const existingArticleDocs = await articlesCollection.find(
      {}, 
      { projection: { title: 1, sourceLink: 1, _id: 0 } }
    ).toArray();

    // Build deduplication sets
    const existingNormalizedSourceLinksInDb = new Set<string>();
    const existingNormalizedTitlesInDb = new Set<string>();
    
    existingArticleDocs.forEach(doc => {
      if (doc.sourceLink && typeof doc.sourceLink === 'string') {
        const normalizedExistingLink = normalizeSourceLinkForDedupe(doc.sourceLink);
        if (normalizedExistingLink) {
          existingNormalizedSourceLinksInDb.add(normalizedExistingLink);
        }
      }
      
      if (doc.title && typeof doc.title === 'string') {
        existingNormalizedTitlesInDb.add(doc.title.trim().toLowerCase());
      }
    });

    const operations = [];
    const processedNormalizedSourceLinksInBatch = new Set<string>();
    const processedNormalizedTitlesInBatch = new Set<string>();

    let skippedBySourceLinkCount = 0;
    let skippedByTitleCount = 0;

    for (const article of articles) {
      const normalizedArticleSourceLink = normalizeSourceLinkForDedupe(article.sourceLink);
      const normalizedArticleTitle = article.title.trim().toLowerCase();
      let skipReason = "";

      // Check for duplicates by source link
      if (normalizedArticleSourceLink) {
        if (existingNormalizedSourceLinksInDb.has(normalizedArticleSourceLink)) {
          skippedBySourceLinkCount++;
          skipReason = "existingInDb_SourceLink";
        } else if (processedNormalizedSourceLinksInBatch.has(normalizedArticleSourceLink)) {
          skippedBySourceLinkCount++;
          skipReason = "processedInBatch_SourceLink";
        }
      }

      // Check for duplicates by title if not already skipped
      if (!skipReason) {
        if (existingNormalizedTitlesInDb.has(normalizedArticleTitle)) {
          skippedByTitleCount++;
          skipReason = "existingInDb_Title";
        } else if (processedNormalizedTitlesInBatch.has(normalizedArticleTitle)) {
          skippedByTitleCount++;
          skipReason = "processedInBatch_Title";
        }
      }

      if (skipReason) {
        continue;
      }

      // Track processed items
      if (normalizedArticleSourceLink) {
        processedNormalizedSourceLinksInBatch.add(normalizedArticleSourceLink);
      }
      processedNormalizedTitlesInBatch.add(normalizedArticleTitle);

      // Prepare article data for database
      const articleDataForDb = {
        id: article.id,
        title: article.title.trim(),
        summary: article.summary,
        date: new Date(article.date),
        source: article.source,
        category: article.category,
        imageUrl: article.imageUrl,
        link: article.link,
        sourceLink: article.sourceLink,
        content: article.content,
        fetchedAt: article.fetchedAt ? new Date(article.fetchedAt) : new Date(),
      };

      operations.push({
        updateOne: {
          filter: { id: article.id },
          update: {
            $set: articleDataForDb,
            $setOnInsert: { createdAt: new Date() }
          },
          upsert: true,
        },
      });
    }
    
    const statsToReturn: ArticleUpdateStats = {
      newlyAddedCount: 0,
      processedInBatch: operations.length,
      skippedBySourceLink: skippedBySourceLinkCount,
      skippedByTitle: skippedByTitleCount,
    };

    console.log(`[DB Save] After deduplication (skipped ${skippedBySourceLinkCount} by link, ${skippedByTitleCount} by title), ${operations.length} operations will be sent to bulkWrite.`);

    if (operations.length > 0) {
      const result = await articlesCollection.bulkWrite(operations, { ordered: false });
      statsToReturn.newlyAddedCount = (result.insertedCount || 0) + (result.upsertedCount || 0);
      console.log(`[DB Save] Bulk write completed. Result: inserted: ${result.insertedCount}, matched: ${result.matchedCount}, modified: ${result.modifiedCount}, upserted: ${result.upsertedCount}. Newly Added: ${statsToReturn.newlyAddedCount}`);
      
      if (result.writeErrors && result.writeErrors.length > 0) {
        console.error(`[DB Save] Bulk write encountered ${result.writeErrors.length} write errors. First error:`, result.writeErrors[0]);
      }
    } else {
      console.log("[DB Save] No operations to perform after filtering and deduplication.");
    }
    
    return statsToReturn;
  } catch (error) {
    console.error("[DB Save] CRITICAL ERROR saving articles to MongoDB:", error);
    return { ...defaultStats, processedInBatch: articles.length };
  }
}

async function fetchAndParseRSS(
  source: NewsSource,
  isForCategoriesOnly: boolean = false,
  fetchOgImagesParam: boolean = true
): Promise<ArticleInterface[]> {
  try {
    console.log(`[RSS Fetch] Starting fetch for ${source.name}...`);
    
    const fetchResponse = await fetchWithRetry(source.rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36 NewsAggregator/1.0 (+http://example.com/bot.html)',
        'Accept': 'application/rss+xml,application/xml,application/atom+xml;q=0.9,text/xml;q=0.8,*/*;q=0.7'
      },
      signal: AbortSignal.timeout(FETCH_CONFIG.timeout),
      next: { revalidate: FETCH_CONFIG.revalidate }
    });

    const arrayBuffer = await fetchResponse.arrayBuffer();
    const rawDataBuffer = Buffer.from(arrayBuffer);

    // Handle encoding detection and conversion
    let feedXmlString: string;
    let utf8Decoded = iconv.decode(rawDataBuffer, 'utf-8', { stripBOM: true });
    const utf8ReplacementCharCount = (utf8Decoded.match(/\uFFFD/g) || []).length;

    if (utf8ReplacementCharCount > 0 && 
        (utf8ReplacementCharCount > 5 || utf8ReplacementCharCount / (utf8Decoded.length || 1) > 0.01)) {
      console.log(`[RSS Encoding] High replacement character count detected for ${source.name}, trying windows-1252...`);
      feedXmlString = iconv.decode(rawDataBuffer, 'windows-1252', { stripBOM: true });
    } else {
      feedXmlString = utf8Decoded;
    }
    
    // Clean control characters
    feedXmlString = feedXmlString.replace(/[\uFFFD\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    const result = await parser.parseStringPromise(feedXmlString);

    // Try different RSS/Atom/RDF structures
    let items = getNestedValue(result, 'rss.channel.item', []);
    if (!items || (Array.isArray(items) && items.length === 0)) {
      items = getNestedValue(result, 'feed.entry', []);
    }
    if (!items || (Array.isArray(items) && items.length === 0)) {
      items = getNestedValue(result, 'rdf:RDF.item', []);
    }

    if (!Array.isArray(items)) {
      items = items ? [items] : [];
    }

    if (items.length === 0) {
      console.warn(`[RSS Parse] No items found in feed for ${source.name}`);
      return [];
    }

    console.log(`[RSS Parse] Found ${items.length} items in ${source.name} feed`);

    const processedArticles: ArticleInterface[] = [];

    for (const [index, item] of items.entries()) {
      try {
        const processedArticle = await processRSSItem(item, source, index, isForCategoriesOnly, fetchOgImagesParam);
        if (processedArticle) {
          processedArticles.push(processedArticle);
        }
      } catch (itemError) {
        console.warn(`[RSS Item Process] Error processing item ${index} from ${source.name}:`, itemError);
        continue;
      }
    }

    console.log(`[RSS Parse] Successfully processed ${processedArticles.length} articles from ${source.name}`);
    return processedArticles;
  } catch (error: any) {
    let errorMessage = `[RSS Service] Error fetching or parsing RSS from ${source.name} (${source.rssUrl}): ${error.message || error}`;
    
    if (error.cause && error.cause.code === 'ENOTFOUND') {
      errorMessage = `[RSS Service] DNS lookup failed for ${source.name} (hostname: ${error.cause.hostname}). Unable to resolve ${source.rssUrl}. Please check network or DNS settings. Original error: ${error.message}`;
    } else if (error.name === 'AbortError') {
      errorMessage = `[RSS Service] Request timeout for ${source.name} after ${FETCH_CONFIG.timeout}ms`;
    }
    
    console.error(errorMessage);
    if (error.stack) {
      console.error(`Stack: ${error.stack}`);
    }
    return [];
  }
}

async function processRSSItem(
  item: any, 
  source: NewsSource, 
  index: number, 
  isForCategoriesOnly: boolean, 
  fetchOgImagesParam: boolean
): Promise<ArticleInterface | null> {
  // Extract and normalize title
  const rawTitle = normalizeContent(getNestedValue(item, 'title', ''));
  const title = rawTitle.trim();

  // Extract and normalize link
  let originalLink = extractLinkFromItem(item);
  
  // Extract and normalize publication date
  const pubDateSource = getNestedValue(item, 'pubDate') || 
                        getNestedValue(item, 'published') || 
                        getNestedValue(item, 'updated') || 
                        getNestedValue(item, 'dc:date');
  let parsedDateFromFeed = pubDateSource ? new Date(normalizeContent(pubDateSource)) : new Date();
  if (isNaN(parsedDateFromFeed.getTime())) {
    parsedDateFromFeed = new Date();
  }
  const date = parsedDateFromFeed.toISOString();

  // Generate unique ID
  const finalId = generateUniqueArticleId(originalLink, title, source, date, index);

  // Extract and map category
  let rawCategoryFromFeed = extractCategoryFromItem(item, source);
  const finalCategory = mapToDisplayCategory(rawCategoryFromFeed, title);

  // Early return for category-only processing
  if (isForCategoriesOnly) {
    if (finalCategory && finalCategory !== 'General') {
      return {
        id: finalId,
        title,
        summary: "For category generation",
        date,
        source: source.name,
        category: finalCategory,
        imageUrl: null,
        link: '#',
        sourceLink: originalLink,
        fetchedAt: new Date().toISOString(),
      };
    }
    return null;
  }

  // Quality checks
  if (!title || title.length < PROCESSING_CONFIG.minTitleLength || 
      title.trim().toLowerCase() === "untitled article") {
    return null;
  }

  if (originalLink === '#') {
    return null;
  }

  // Extract content and generate summary
  const rawFullContentFromFeed = normalizeContent(
    getNestedValue(item, 'content:encoded', 
      getNestedValue(item, 'content', 
        getNestedValue(item, 'description', 
          getNestedValue(item, 'summary')
        )
      )
    )
  );
  
  let itemContentForPage: string | undefined = rawFullContentFromFeed;
  let summaryText = normalizeSummary(
    getNestedValue(item, 'description', getNestedValue(item, 'summary')), 
    rawFullContentFromFeed, 
    source.name
  );

  // Summary quality checks
  const plainSummaryForCheck = normalizeAndStripHtml(summaryText);
  if (!plainSummaryForCheck || plainSummaryForCheck.length < PROCESSING_CONFIG.minSummaryLength || 
      plainSummaryForCheck.toLowerCase() === "no summary available.") {
    return null;
  }
  
  if (isSummaryJustTitle(title, plainSummaryForCheck)) {
    return null;
  }

  // Extract image URL
  let extractedImgUrl: string | null = extractImageUrl(item, title, finalCategory, source.name, originalLink);
  
  // Fallback to OG image if enabled
  if (!extractedImgUrl && source.fetchOgImageFallback && originalLink !== '#' && fetchOgImagesParam) {
    try {
      const ogImage = await fetchOgImageFromUrl(originalLink);
      if (ogImage) extractedImgUrl = ogImage;
    } catch (ogError) {
      console.warn(`[OG Image] Failed to fetch OG image for ${originalLink}:`, ogError);
    }
  }

  // Remove duplicate image from content if it matches the extracted image
  if (extractedImgUrl && itemContentForPage) {
    itemContentForPage = removeDuplicateImageFromContent(itemContentForPage, extractedImgUrl, originalLink);
  }

  // Generate internal link
  let slugifiedCategory = slugify(finalCategory);
  if (!slugifiedCategory || slugifiedCategory.length < 1) {
    slugifiedCategory = 'general';
  }
  const internalArticleLink = `/${slugifiedCategory}/${finalId}`;

  return {
    id: finalId,
    title,
    summary: summaryText,
    date,
    source: source.name,
    category: finalCategory,
    imageUrl: extractedImgUrl,
    link: internalArticleLink,
    sourceLink: originalLink,
    content: itemContentForPage,
    fetchedAt: new Date().toISOString(),
  };
}

function extractLinkFromItem(item: any): string {
  let originalLink = '#';
  const linkField = getNestedValue(item, 'link');
  
  if (typeof linkField === 'string') {
    originalLink = he.decode(linkField.trim());
  } else if (typeof linkField === 'object' && linkField?.href) {
    originalLink = he.decode(linkField.href.trim());
  } else if (typeof linkField === 'object' && !linkField?.href && linkField?._) {
    originalLink = he.decode(linkField._.trim());
  } else if (Array.isArray(linkField)) {
    const alternateLink = linkField.find(l => 
      typeof l === 'object' && l.rel === 'alternate' && l.type === 'text/html' && l.href);
    const selfLink = linkField.find(l => 
      typeof l === 'object' && l.rel === 'self' && l.href);
    const firstValidLink = linkField.find(l => 
      (typeof l === 'object' && l.href && l.href.startsWith('http')) || 
      (typeof l === 'string' && l.startsWith('http')));

    let tempLink = alternateLink ? alternateLink.href :
                   ((firstValidLink && typeof firstValidLink === 'object') ? firstValidLink.href :
                     (typeof firstValidLink === 'string' ? firstValidLink :
                       (selfLink && selfLink.href && selfLink.href.startsWith('http') ? selfLink.href : '#')
                     )
                   );
    originalLink = he.decode(String(tempLink).trim());
  }

  // Fallback to GUID if no link found
  if (originalLink === '#' && item.guid) {
    const guidContent = typeof item.guid === 'object' ? item.guid._ : item.guid;
    if (typeof guidContent === 'string' && guidContent.startsWith('http') && 
        (getNestedValue(item.guid, 'isPermaLink', 'true') !== 'false')) {
      originalLink = he.decode(guidContent.trim());
    }
  }
  
  // Fallback to ID if still no link
  if (originalLink === '#' && item.id && typeof item.id === 'string' && item.id.startsWith('http')) {
    originalLink = he.decode(item.id.trim());
  }

  if (!originalLink.startsWith('http')) originalLink = '#';
  
  return originalLink;
}

function extractCategoryFromItem(item: any, source: NewsSource): string {
  let rawCategoryFromFeed = getNestedValue(item, 'category', source.defaultCategory || 'General');
  
  if (Array.isArray(rawCategoryFromFeed)) {
    rawCategoryFromFeed = rawCategoryFromFeed.map(cat => {
      if (typeof cat === 'object') {
        return cat.term || cat._ || cat['#text'] || cat.label || cat.name || cat.$;
      }
      return cat;
    }).filter(Boolean).join(', ') || source.defaultCategory || 'General';
  } else if (typeof rawCategoryFromFeed === 'object') {
    rawCategoryFromFeed = rawCategoryFromFeed.term || rawCategoryFromFeed._ || 
                         rawCategoryFromFeed['#text'] || rawCategoryFromFeed.label || 
                         rawCategoryFromFeed.name || rawCategoryFromFeed.$;
  }
  
  rawCategoryFromFeed = typeof rawCategoryFromFeed === 'string' ? 
    he.decode(rawCategoryFromFeed.trim().split(',')[0].trim()) : 
    (source.defaultCategory || 'General');
    
  return rawCategoryFromFeed;
}

function generateUniqueArticleId(originalLink: string, title: string, source: NewsSource, date: string, index: number): string {
  let idBaseMaterial: string;
  let normalizedOriginalLinkForId = originalLink;
  
  if (originalLink && originalLink !== "#" && originalLink.startsWith('http')) {
    try {
      const urlObj = new URL(originalLink);
      const commonTrackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid', 'msclkid', 'source', 'src', 'ref'];
      commonTrackingParams.forEach(param => urlObj.searchParams.delete(param));
      normalizedOriginalLinkForId = `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}${urlObj.search ? urlObj.search : ''}`;
    } catch (e) {
      // Keep original link if normalization fails
    }
    idBaseMaterial = normalizedOriginalLinkForId;
  } else if (title && title.length > 0) {
    idBaseMaterial = title;
  } else {
    idBaseMaterial = `fallback-${source.name}-${new Date(date).getTime()}-${index}`;
  }

  let processedSlugPart = slugify(idBaseMaterial).substring(0, PROCESSING_CONFIG.maxSlugLength);
  if (!processedSlugPart || processedSlugPart.length < 5) {
    processedSlugPart = slugify(`emptybase-${slugify(source.name)}-${new Date(date).getTime()}-${index}-${Math.random().toString(36).substring(2,5)}`).substring(0, PROCESSING_CONFIG.maxSlugLength);
  }

  const sourceNameSlug = slugify(source.name).substring(0, PROCESSING_CONFIG.maxSuffixLength) || 'unknownsrc';
  let finalId = `${processedSlugPart}-${sourceNameSlug}`;

  if (finalId.length < (sourceNameSlug.length + 5)) {
    finalId = slugify(`override-unique-${slugify(source.name)}-${new Date(date).getTime()}-${index}-${Math.random().toString(36).substring(2,7)}`);
  }

  return finalId;
}

function removeDuplicateImageFromContent(itemContentForPage: string, extractedImgUrl: string, originalLink: string): string {
  try {
    const $ = cheerioLoad(itemContentForPage);
    const firstImgElement = $('img').first();
    
    if (firstImgElement.length) {
      const imgSelectors = ['src', 'data-src', 'data-original', 'data-lazy-src'];
      let firstImgSrcInContent = '';
      
      for (const selector of imgSelectors) {
        const srcValue = firstImgElement.attr(selector);
        if (srcValue) {
          firstImgSrcInContent = srcValue;
          break;
        }
      }
      
      if (firstImgSrcInContent) {
        let resolvedFirstImgSrcInContent = '';
        let tempSrc = firstImgSrcInContent.trim();
        
        if (tempSrc.startsWith('//')) tempSrc = `https:${tempSrc}`;

        if (tempSrc.startsWith('http')) {
          try { 
            resolvedFirstImgSrcInContent = new URL(tempSrc).href; 
          } catch (e) { 
            // Ignore invalid URLs
          }
        } else if (originalLink && originalLink.startsWith('http')) {
          try { 
            resolvedFirstImgSrcInContent = new URL(tempSrc, originalLink).href; 
          } catch (e) { 
            // Ignore invalid URLs
          }
        }

        if (resolvedFirstImgSrcInContent && resolvedFirstImgSrcInContent === extractedImgUrl) {
          const imgHtmlCandidate = $.html(firstImgElement);
          const indexOfImg = itemContentForPage.indexOf(imgHtmlCandidate);
          if (indexOfImg !== -1 && indexOfImg < 300) {
            firstImgElement.remove();
            return $.html();
          }
        }
      }
    }
  } catch (cheerioError) {
    console.warn(`[Content Image Remove] Error processing content for image removal:`, cheerioError);
  }
  
  return itemContentForPage;
}

export interface FetchArticlesResult {
  articles: ArticleInterface[];
  stats?: ArticleUpdateStats;
}

export async function fetchArticlesFromAllSources(
  isForCategoriesOnly: boolean = false,
  fetchOgImagesParam: boolean = true,
  saveToDb: boolean = false,
  articleLimit?: number
): Promise<FetchArticlesResult> {
  console.log(`[RSS Service] Starting fetch from ${NEWS_SOURCES.length} sources...`);
  
  const allArticlesPromises = NEWS_SOURCES.map(source =>
    fetchAndParseRSS(source, isForCategoriesOnly, fetchOgImagesParam && (source.fetchOgImageFallback ?? false))
  );
  
  const results = await Promise.allSettled(allArticlesPromises);

  let allFetchedArticles: ArticleInterface[] = results
    .filter(result => result.status === 'fulfilled')
    .map(result => (result as PromiseFulfilledResult<ArticleInterface[]>).value)
    .flat();

  // Log failed sources
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(`[RSS Service] Failed to fetch from ${NEWS_SOURCES[index].name}:`, result.reason);
    }
  });

  if (isForCategoriesOnly) {
    const uniqueCategories = new Set<string>();
    allFetchedArticles.forEach(art => uniqueCategories.add(art.category));
    return { 
      articles: Array.from(uniqueCategories).map(cat => ({ category: cat } as ArticleInterface)) 
    };
  }

  // Sort articles by date (newest first)
  allFetchedArticles.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Apply limits
  let finalArticlesToProcess = allFetchedArticles;
  if (articleLimit && articleLimit > 0) {
    finalArticlesToProcess = finalArticlesToProcess.slice(0, articleLimit);
  } else {
    finalArticlesToProcess = finalArticlesToProcess.slice(0, PROCESSING_CONFIG.defaultProcessingCap);
  }

  // Ensure unique IDs
  const finalArticleIds = new Set<string>();
  const articlesWithGuaranteedUniqueIds: ArticleInterface[] = [];
  let duplicateIdCounter = 0;

  for (const article of finalArticlesToProcess) {
    let currentId = article.id;
    if (!currentId) {
      currentId = `emergency-id-${slugify(article.source || 'unknown')}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      article.id = currentId;
    }

    if (finalArticleIds.has(currentId)) {
      let newId;
      do {
        duplicateIdCounter++;
        newId = `${currentId}-dupfix${duplicateIdCounter}`;
      } while (finalArticleIds.has(newId));
      article.id = newId;
    }
    
    finalArticleIds.add(article.id);
    articlesWithGuaranteedUniqueIds.push(article);
  }

  console.log(`[RSS Service] Processed ${articlesWithGuaranteedUniqueIds.length} articles total`);

  // Save to database if requested
  let updateStats: ArticleUpdateStats | undefined = undefined;
  if (saveToDb) {
    if (articlesWithGuaranteedUniqueIds.length > 0) {
      updateStats = await saveArticlesToDatabase(articlesWithGuaranteedUniqueIds);
    } else {
      console.log("[RSS Service] 'saveToDb' is true, but no articles to save.");
      updateStats = { newlyAddedCount: 0, processedInBatch: 0, skippedBySourceLink: 0, skippedByTitle: 0 };
    }
  }

  return { 
    articles: articlesWithGuaranteedUniqueIds, 
    stats: updateStats 
  };
}

export type { ArticleInterface as Article };
