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
];

function mapToDisplayCategory(rawCategory: string, title: string = ''): string {
    const lowerRawCategory = rawCategory.toLowerCase();
    const lowerTitle = title.toLowerCase();

    const techKeywordsRaw = ['tech', 'gadget', 'internet', 'software', 'hardware', 'ai', 'artificial intelligence', 'crypto', 'digital', 'startup', 'app', 'computing', 'innovation', 'programming', 'data', 'cloud', 'cybersecurity', 'mobile', 'wearable', 'vr', 'ar'];
    const techKeywordsTitle = [' tech', 'software', 'hardware', ' ai', ' app ', 'developer', 'algorithm', 'data breach', 'cybersecurity', 'platform', 'online', 'website', 'user interface', 'user experience', 'gadget review', 'latest smartphone', 'coding language', 'machine learning'];

    if (techKeywordsRaw.some(keyword => lowerRawCategory.includes(keyword))) {
        const sportsTitleKeywordsStrong = ['cricket', 'ipl final', 'football match', 'tennis open', 'olympic games', 'nba championship', 'world cup soccer', 'grand prix racing'];
        if (!sportsTitleKeywordsStrong.some(keyword => lowerTitle.includes(keyword))) {
            return 'Technology';
        }
    }
     if (techKeywordsTitle.some(keyword => lowerTitle.includes(keyword))) {
        const sportsTitleKeywordsStrong = ['cricket', 'ipl final', 'football match', 'tennis open', 'olympic games', 'nba championship', 'world cup soccer', 'grand prix racing'];
         if (!sportsTitleKeywordsStrong.some(keyword => lowerTitle.includes(keyword))) {
            return 'Technology';
        }
    }

    const sportKeywordsRawStrict = ['sports', 'cricket', 'football', 'soccer', 'tennis', 'ipl', 'olympic', 'nba', 'mls', 'esports', 'f1', 'motogp', 'athletics', 'badminton', 'hockey', 'rugby', 'golf', 'wrestling', 'boxing', 'formula 1', 'e-sports', 'gaming competition'];
    const sportKeywordsTitleStrict = ['cricket score', 'ipl match', 'football game', 'tennis tournament', 'olympic medal', 'nba playoffs', 'world cup qualifier', 'grand slam event', 'batsman', 'bowler', 'goal', 'league table', 'championship game', 'fixture schedule', 'match report', 'final score', 'athlete', 'sports update', 'team lineup'];

    if (sportKeywordsRawStrict.some(keyword => lowerRawCategory.includes(keyword))) return 'Sports';
    if (sportKeywordsTitleStrict.some(keyword => lowerTitle.includes(keyword)) &&
        (lowerRawCategory.includes('news') || lowerRawCategory.includes('general') || lowerRawCategory.includes('headlines') || lowerRawCategory.includes('top stor') || lowerRawCategory === '' || lowerRawCategory.includes('sport'))) {
        if (lowerTitle.includes('match') && (techKeywordsRaw.some(keyword => lowerRawCategory.includes(keyword)) || techKeywordsTitle.some(keyword => lowerTitle.includes(keyword)))) {
        } else {
            return 'Sports';
        }
    }

    const bizKeywordsRaw = ['business', 'finance', 'stock', 'market', 'economic', 'economy', 'compan', 'industr', 'bank', 'invest', 'corporate', 'earnings', 'ipo', 'merger', 'acquisition', 'trade', 'commerce', 'financial', 'nse', 'bse', 'sensex', 'nifty', 'cryptocurrency business'];
    const bizKeywordsTitle = ['sensex', 'nifty', 'ipo', 'startup funding', 'quarterly result', 'profit', 'loss', 'gdp', 'inflation', 'interest rate', 'budget', 'fiscal policy', 'monetary policy', 'shares', 'stocks', 'commodities', 'forex', 'bull market', 'bear market', 'economic growth', 'recession', 'company shares', 'market trends'];

    if (bizKeywordsRaw.some(keyword => lowerRawCategory.includes(keyword))) return 'Business & Finance';
    if (bizKeywordsTitle.some(keyword => lowerTitle.includes(keyword)) &&
        (lowerRawCategory.includes('news') || lowerRawCategory.includes('general') || lowerRawCategory.includes('headlines') || lowerRawCategory.includes('top stor') || lowerRawCategory === '' || lowerRawCategory.includes('business') || lowerRawCategory.includes('finance'))) {
       return 'Business & Finance';
    }

    const politicsKeywordsRaw = ['politic', 'election', 'government', 'parliament', 'minister', 'democracy', 'legislature', 'ballot', 'campaign', 'diplomacy', 'geopolitics', 'public policy', 'political party'];
    const politicsKeywordsTitle = ['election result', 'prime minister', 'modi', 'rahul gandhi', 'parliament session', 'bill passed', 'policy debate', 'international summit', 'treaty negotiation', 'geopolitical tension', 'vote count', 'political rally', 'mp', 'mla', 'chief minister', 'cabinet meeting', 'government scheme'];

    if (politicsKeywordsRaw.some(keyword => lowerRawCategory.includes(keyword))) return 'Politics';
    if (politicsKeywordsTitle.some(keyword => lowerTitle.includes(keyword)) &&
        (lowerRawCategory.includes('news') || lowerRawCategory.includes('general') || lowerRawCategory.includes('headlines') || lowerRawCategory.includes('top stor') || lowerRawCategory === '' || lowerRawCategory.includes('politic'))) {
        return 'Politics';
    }

    const entKeywordsRaw = ['entertainment', 'movie', 'film', 'music', 'bollywood', 'hollywood', 'celebrity', 'tv', 'web series', 'cinema', 'arts', 'culture', 'showbiz', 'box office', 'gossip', 'ott platform'];
    const entKeywordsTitle = ['box office collection', 'movie review', 'film trailer', 'album release', 'concert tour', 'award ceremony', 'actor interview', 'actress lifestyle', 'director announcement', 'series finale date', 'ott platform release', 'celebrity news', 'film release'];

    if (entKeywordsRaw.some(keyword => lowerRawCategory.includes(keyword))) {
        if(lowerRawCategory.includes('lifestyle') && (techKeywordsRaw.some(k => lowerRawCategory.includes(k)) || bizKeywordsRaw.some(k => lowerRawCategory.includes(k)))) {
        } else {
            return 'Entertainment';
        }
    }
    if (entKeywordsTitle.some(keyword => lowerTitle.includes(keyword)) &&
        (lowerRawCategory.includes('news') || lowerRawCategory.includes('general') || lowerRawCategory.includes('headlines') || lowerRawCategory.includes('top stor') || lowerRawCategory === '' || lowerRawCategory.includes('entertainment'))) {
        return 'Entertainment';
    }

    const scienceKeywordsRaw = ['science', 'space', 'health research', 'scientific discover', 'astronomy', 'physics', 'biology', 'chemistry', 'medicine research', 'environment science', 'archaeology', 'paleontology', 'innovation in science', 'research article'];
    const scienceKeywordsTitle = ['nasa mission', 'isro launch', 'spacex flight', 'mars rover', 'black hole discovery', 'clinical trial results', 'vaccine development', 'fossil find', 'dinosaur era', 'climate change report', 'quantum computing breakthrough', 'dna sequencing', 'scientific breakthrough', 'research paper', 'new species'];

    if (scienceKeywordsRaw.some(keyword => lowerRawCategory.includes(keyword))) {
        if (lowerRawCategory.includes('health') && (bizKeywordsRaw.some(k => lowerRawCategory.includes(k)) || lowerRawCategory.includes('market'))) {
        } else {
            return 'Science';
        }
    }
    if (scienceKeywordsTitle.some(keyword => lowerTitle.includes(keyword)) &&
        (lowerRawCategory.includes('news') || lowerRawCategory.includes('general') || lowerRawCategory.includes('headlines') || lowerRawCategory.includes('top stor') || lowerRawCategory === '' || lowerRawCategory.includes('science'))) {
        return 'Science';
    }

    const worldKeywordsRaw = ['world', 'global', 'international', 'asia news', 'europe news', 'africa news', 'america news', 'un session', 'nato meeting', 'foreign affairs discussion', 'international conflict'];
    if (worldKeywordsRaw.some(keyword => lowerRawCategory.includes(keyword) && !lowerRawCategory.includes('india') && !lowerRawCategory.includes('bharat'))) {
        return 'World News';
    }
    const worldKeywordsTitle = ['war in', 'global summit on', 'international relations update', 'united nations resolution', 'conflict between', 'treaty signing between', 'foreign minister meets', 'ukraine crisis', 'middle east peace'];
    if (worldKeywordsTitle.some(keyword => lowerTitle.includes(keyword)) &&
        !(lowerRawCategory.includes('india') || lowerTitle.includes('india') || lowerRawCategory.includes('bharat') || lowerTitle.includes('bharat'))) {
        return 'World News';
    }

    const indiaKeywordsRaw = ['india', 'national', 'delhi', 'mumbai', 'bengaluru', 'kolkata', 'chennai', 'hyderabad', 'pune', 'state news', 'indian affairs', 'bharat', 'indian government'];
    if (indiaKeywordsRaw.some(keyword => lowerRawCategory.includes(keyword))) return 'India News';
    if (indiaKeywordsRaw.some(keyword => lowerTitle.includes(keyword)) && (lowerRawCategory.includes('news') || lowerRawCategory.includes('general') || lowerRawCategory.includes('headlines') || lowerRawCategory.includes('top stor') || lowerRawCategory === '')) return 'India News';


    const lifeKeywordsRaw = ['life', 'style', 'fashion', 'food', 'travel', 'wellness', 'horoscope', 'recipe', 'well-being', 'home decor', 'garden tips', 'parenting advice', 'relationships guide', 'beauty trends', 'health tips'];
    const lifeKeywordsTitle = ['fashion week highlights', 'easy recipe for', 'travel guide to', 'yoga benefits', 'meditation techniques', 'daily zodiac forecast', 'parenting hacks', 'home makeover ideas', 'latest beauty products', 'healthy eating habits'];

    if (lifeKeywordsRaw.some(keyword => lowerRawCategory.includes(keyword))) {
        if (!(techKeywordsRaw.some(k => lowerRawCategory.includes(k)) || bizKeywordsRaw.some(k => lowerRawCategory.includes(k)))) {
            return 'Life & Style';
        }
    }
    if (lifeKeywordsTitle.some(keyword => lowerTitle.includes(keyword)) &&
        (lowerRawCategory.includes('news') || lowerRawCategory.includes('general') || lowerRawCategory.includes('headlines') || lowerRawCategory.includes('top stor') || lowerRawCategory === '' || lowerRawCategory.includes('lifestyle'))) {
         if (!(techKeywordsTitle.some(k => lowerTitle.includes(k)) || bizKeywordsTitle.some(k => lowerTitle.includes(k)))) {
            return 'Life & Style';
        }
    }

    if (lowerRawCategory.includes('top stor') || lowerRawCategory.includes('latest news') || lowerRawCategory.includes('breaking news') || lowerRawCategory.includes('headlines')) return 'Top News';

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

  // { name: "Indian Express - India", rssUrl: "https://indianexpress.com/section/india/feed/", defaultCategory: "India News", fetchOgImageFallback: false }, // Commented out due to 403 Forbidden
  { name: "Economic Times", rssUrl: "https://economictimes.indiatimes.com/rssfeedsdefault.cms", defaultCategory: "Business & Finance", fetchOgImageFallback: true },
];


const parser = new Parser({
  explicitArray: false,
  ignoreAttrs: false,
  mergeAttrs: true,
  trim: true
});

async function fetchOgImageFromUrl(articleUrl: string): Promise<string | null> {
    if (!articleUrl || !articleUrl.startsWith('http')) {
      return null;
    }
    try {
      const response = await fetch(articleUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        },
        signal: AbortSignal.timeout(8000)
      });

      if (!response.ok) {
        console.warn(`[RSS OG Fetch] Failed to fetch OG image from ${articleUrl}. Status: ${response.status}`);
        return null;
      }

      const htmlContent = await response.text();
      const $ = cheerioLoad(htmlContent);

      let ogImageUrl =
          $('meta[property="og:image"]').attr('content') ||
          $('meta[name="og:image"]').attr('content') ||
          $('meta[property="twitter:image"]').attr('content') ||
          $('meta[name="twitter:image"]').attr('content');

      if (ogImageUrl && typeof ogImageUrl === 'string') {
          ogImageUrl = he.decode(ogImageUrl.trim());
          if (ogImageUrl.startsWith('//')) {
              ogImageUrl = `https:${ogImageUrl}`;
          }
          if (ogImageUrl.startsWith('/')) {
              const urlObject = new URL(articleUrl);
              ogImageUrl = `${urlObject.protocol}//${urlObject.hostname}${ogImageUrl}`;
          }

          if (ogImageUrl.startsWith('http')) {
            try {
                const validatedUrl = new URL(ogImageUrl);
                return validatedUrl.href;
            } catch (e) {
                console.warn(`[RSS OG Fetch] Invalid OG image URL constructed: "${ogImageUrl}" from base ${articleUrl}. Error: ${(e as Error).message}`);
                return null;
            }
          }
      }
      return null;
    } catch (error) {
      console.error(`[RSS OG Fetch] Error fetching OG image from ${articleUrl}:`, error);
      return null;
    }
}

function normalizeContent(contentInput: any): string {
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
    const potentialTextKeys = ['_', '$t', '#text', '#cdata', 'p', 'span', 'div'];
    for (const key of potentialTextKeys) {
        if (contentInput[key] && typeof contentInput[key] === 'string') {
            text = contentInput[key];
            break;
        }
    }
    if (!text) {
        const standardFields = [
            getNestedValue(contentInput, 'content:encoded'),
            getNestedValue(contentInput, 'content'),
            getNestedValue(contentInput, 'description'),
            getNestedValue(contentInput, 'summary'),
        ];
        for (const val of standardFields) {
            const normalizedVal = normalizeContent(val);
            if (normalizedVal && normalizedVal.trim() !== '') {
                text = normalizedVal;
                break;
            }
        }
    }
  }

  if (text) {
    let decodedText = text.trim();
    try {
        decodedText = he.decode(decodedText);
        decodedText = decodedText.replace(/[\uFFFD\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
        return decodedText;
    } catch (e) {
        return text.trim().replace(/[\uFFFD\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    }
  }
  return '';
}

function normalizeAndStripHtml(htmlString: string): string {
    if (!htmlString || typeof htmlString !== 'string') return "";
    return he.decode(htmlString)
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/\s\s+/g, ' ')
        .trim();
}

function isSummaryJustTitle(title: string, summary: string, similarityThreshold: number = 0.8): boolean {
    if (!title || !summary) return false;

    const normalizedTitle = normalizeAndStripHtml(title).toLowerCase();
    const normalizedSummary = normalizeAndStripHtml(summary).toLowerCase();

    if (normalizedTitle.length === 0 || normalizedSummary.length === 0) return false;

    if (normalizedSummary.startsWith(normalizedTitle) && (normalizedSummary.length < normalizedTitle.length + 30)) {
        return true;
    }

    const titleWords = new Set(normalizedTitle.split(/\s+/).filter(w => w.length > 2));
    if (titleWords.size === 0) return false;

    const summaryWords = normalizedSummary.split(/\s+/);
    let commonWords = 0;
    summaryWords.forEach(word => {
        if (titleWords.has(word)) {
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

  if (fullContentText && fullContentText.length > (descriptionText?.length || 0) + 50) {
    textToSummarize = fullContentText;
  } else if (descriptionText) {
    textToSummarize = descriptionText;
  } else if (fullContentText) {
    textToSummarize = fullContentText;
  }

  if (sourceName && sourceName.toLowerCase().includes("reddit")) {
    textToSummarize = textToSummarize
        .replace(/<p>submitted by.*?<\/p>/gi, '')
        .replace(/<a href="[^"]*">\[comments?\]<\/a>/gi, '')
        .replace(/<a href="[^"]*">\[link\]<\/a>/gi, '')
        .replace(/<a[^>]*?>\[\d+ comments?\]<\/a>/gi, '')
        .replace(/<p><a href="[^"]*">.*?read more.*?<\/a><\/p>/gi, '');
  }

  const plainText = normalizeAndStripHtml(textToSummarize);

  if (!plainText && fullContentText && fullContentText !== textToSummarize) {
      const plainFullContent = normalizeAndStripHtml(fullContentText);
      return he.decode(plainFullContent.substring(0, 250) + (plainFullContent.length > 250 ? '...' : ''));
  }

  if (plainText.length === 0) return "No summary available.";
  return he.decode(plainText.substring(0, 250) + (plainText.length > 250 ? '...' : ''));
}

function extractImageUrl(item: any, articleTitle: string, articleCategory?: string, sourceName?: string, articleLink?: string): string | null {
  let imageUrl: string | null = null;
  const potentialImageSources: string[] = [];

  if (item['media:content']) {
    const mediaContents = Array.isArray(item['media:content']) ? item['media:content'] : [item['media:content']];
    for (const content of mediaContents) {
      if (content && content.url && (content.medium === 'image' || (String(getNestedValue(content, 'type', '')).startsWith('image/')) || (getNestedValue(content, 'type', '').includes('image')))) {
        potentialImageSources.push(content.url);
      }
    }
  }

  if (item['media:group'] && item['media:group']['media:content']) {
    const mediaContents = Array.isArray(item['media:group']['media:content'])
      ? item['media:group']['media:content']
      : [item['media:group']['media:content']];
    for (const content of mediaContents) {
      if (content && content.url && (content.medium === 'image' || (getNestedValue(content, 'type', '').startsWith('image/')))) {
        potentialImageSources.push(content.url);
      }
    }
  }

  if (item.enclosure && item.enclosure.url && item.enclosure.type && String(item.enclosure.type).startsWith('image/')) {
    potentialImageSources.push(item.enclosure.url);
  }

  if (item['media:thumbnail'] && item['media:thumbnail'].url) {
    potentialImageSources.push(item['media:thumbnail'].url);
  }

  if (item.image && item.image.url) {
    potentialImageSources.push(item.image.url);
  } else if (item.image && typeof item.image === 'string' && item.image.startsWith('http')) {
    potentialImageSources.push(item.image);
  }

  const contentFieldsForImageSearch = [
    getNestedValue(item, 'content:encoded'),
    getNestedValue(item, 'content'),
    getNestedValue(item, 'description'),
    getNestedValue(item, 'summary'),
  ];

  for (const field of contentFieldsForImageSearch) {
    const normalizedField = normalizeContent(field);
    if (normalizedField && typeof normalizedField === 'string') {
      const $ = cheerioLoad(normalizedField);
      $('img').each((_i, el) => {
        let srcCandidate = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-original') || $(el).attr('data-lazy-src');
        if (srcCandidate) {
          potentialImageSources.push(srcCandidate.trim());
        }
      });
    }
  }

  for (let src of potentialImageSources) {
    if (typeof src !== 'string') continue;
    src = src.trim();

    if (src.startsWith('//')) {
      src = `https:${src}`;
    }

    if (!src.startsWith('http') && articleLink && articleLink.startsWith('http')) {
      try {
        const base = new URL(articleLink);
        if (src.startsWith('/')) {
          src = new URL(src, base.origin).href;
        } else {
          src = new URL(src, base.href).href;
        }
      } catch (e) {
        continue;
      }
    }

    if (src.startsWith('http')) {
      try {
        const validatedUrl = new URL(src);
        if (validatedUrl.protocol === 'http:' || validatedUrl.protocol === 'https:') {
          imageUrl = validatedUrl.href;
          break;
        }
      } catch (urlError) { /* Log or handle URL parsing errors if necessary */ }
    }
  }

  return imageUrl;
}

function normalizeSourceLinkForDedupe(link: string | null | undefined): string | null {
  if (!link || typeof link !== 'string' || !link.startsWith('http')) {
    return null;
  }
  try {
    const urlObj = new URL(link);
    const commonTrackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'fbclid', 'gclid', 'msclkid', 'mc_eid', 'mc_cid',
      '_ga', 'source', 'src', 'ref', 'spm', 'share_id', 'share_source',
      'feedType', 'feedName', 'rssfeed', 'syndication', 'CMP', 'ncid', 'ICID',
    ];
    commonTrackingParams.forEach(param => urlObj.searchParams.delete(param));

    Array.from(urlObj.searchParams.keys()).forEach(key => {
        if (/^\d+$/.test(urlObj.searchParams.get(key) || "")) {
        }
    });

    const sortedSearchParams = new URLSearchParams();
    Array.from(urlObj.searchParams.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([key, value]) => sortedSearchParams.append(key, value));

    let finalPathname = urlObj.pathname;
    if (finalPathname !== '/' && finalPathname.endsWith('/')) {
      finalPathname = finalPathname.slice(0, -1);
    }

    return `${urlObj.protocol}//${urlObj.hostname}${finalPathname}${sortedSearchParams.toString() ? '?' + sortedSearchParams.toString() : ''}`;
  } catch (e) {
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
  const defaultStats: ArticleUpdateStats = { newlyAddedCount: 0, processedInBatch: 0, skippedBySourceLink: 0, skippedByTitle: 0 };
  if (!articles || articles.length === 0) {
    return defaultStats;
  }
  console.log(`[DB Save] Received ${articles.length} articles to potentially save/update.`);


  try {
    const articlesCollection = await getArticlesCollection();

    const existingArticleDocs = await articlesCollection.find({}, { projection: { title: 1, sourceLink: 1, _id: 0 } }).toArray();

    const existingNormalizedSourceLinksInDb = new Set<string>();
    existingArticleDocs.forEach(doc => {
      if (doc.sourceLink && typeof doc.sourceLink === 'string') {
        const normalizedExistingLink = normalizeSourceLinkForDedupe(doc.sourceLink);
        if (normalizedExistingLink) {
          existingNormalizedSourceLinksInDb.add(normalizedExistingLink);
        }
      }
    });

    const existingNormalizedTitlesInDb = new Set<string>();
    existingArticleDocs.forEach(doc => {
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

      if (normalizedArticleSourceLink) {
        if (existingNormalizedSourceLinksInDb.has(normalizedArticleSourceLink)) {
          skippedBySourceLinkCount++;
          skipReason = "existingInDb_SourceLink";
        } else if (processedNormalizedSourceLinksInBatch.has(normalizedArticleSourceLink)) {
          skippedBySourceLinkCount++;
          skipReason = "processedInBatch_SourceLink";
        }
      }

      if (!skipReason && existingNormalizedTitlesInDb.has(normalizedArticleTitle)) {
        skippedByTitleCount++;
        skipReason = "existingInDb_Title";
      } else if (!skipReason && processedNormalizedTitlesInBatch.has(normalizedArticleTitle)) {
        skippedByTitleCount++;
        skipReason = "processedInBatch_Title";
      }

      if (skipReason) {
          continue;
      }

      if (normalizedArticleSourceLink) {
        processedNormalizedSourceLinksInBatch.add(normalizedArticleSourceLink);
      }
      processedNormalizedTitlesInBatch.add(normalizedArticleTitle);

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
    return { ...defaultStats, processedInBatch: articles.length }; // Return default stats with processed count if error
  }
}


async function fetchAndParseRSS(
    source: NewsSource,
    isForCategoriesOnly: boolean = false,
    fetchOgImagesParam: boolean = true
  ): Promise<ArticleInterface[]> {
  try {
    const fetchResponse = await fetch(source.rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36 NewsAggregator/1.0 (+http://example.com/bot.html)',
        'Accept': 'application/rss+xml,application/xml,application/atom+xml;q=0.9,text/xml;q=0.8,*/*;q=0.7'
      },
      signal: AbortSignal.timeout(15000),
      next: { revalidate: 300 }
    });

    if (!fetchResponse.ok) {
      console.warn(`[RSS Fetch] Failed to fetch ${source.name}: ${fetchResponse.status} ${fetchResponse.statusText}`);
      return [];
    }

    const arrayBuffer = await fetchResponse.arrayBuffer();
    const rawDataBuffer = Buffer.from(arrayBuffer);

    let feedXmlString: string;
    let utf8Decoded = iconv.decode(rawDataBuffer, 'utf-8', { stripBOM: true });
    const utf8ReplacementCharCount = (utf8Decoded.match(/\uFFFD/g) || []).length;

    if (utf8ReplacementCharCount > 0 && (utf8ReplacementCharCount > 5 || utf8ReplacementCharCount / (utf8Decoded.length || 1) > 0.01)) {
      feedXmlString = iconv.decode(rawDataBuffer, 'windows-1252', { stripBOM: true });
    } else {
      feedXmlString = utf8Decoded;
    }
    feedXmlString = feedXmlString.replace(/[\uFFFD\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');


    const result = await parser.parseStringPromise(feedXmlString);

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
      return [];
    }

    const processedArticles: ArticleInterface[] = [];
    const MAX_SLUG_LENGTH = 150;
    const MAX_SUFFIX_LENGTH = 25;

    for (const [index, item] of items.entries()) {
      const rawTitle = normalizeContent(getNestedValue(item, 'title', ''));
      const title = rawTitle.trim();

      let originalLink = '#';
      const linkField = getNestedValue(item, 'link');
      if (typeof linkField === 'string') {
        originalLink = he.decode(linkField.trim());
      } else if (typeof linkField === 'object' && linkField?.href) {
        originalLink = he.decode(linkField.href.trim());
      } else if (typeof linkField === 'object' && !linkField?.href && linkField?._) {
        originalLink = he.decode(linkField._.trim());
      } else if (Array.isArray(linkField)) {
        const alternateLink = linkField.find(l => typeof l === 'object' && l.rel === 'alternate' && l.type === 'text/html' && l.href);
        const selfLink = linkField.find(l => typeof l === 'object' && l.rel === 'self' && l.href);
        const firstValidLink = linkField.find(l => (typeof l === 'object' && l.href && l.href.startsWith('http')) || (typeof l === 'string' && l.startsWith('http')) );

        let tempLink = alternateLink ? alternateLink.href :
                       ( (firstValidLink && typeof firstValidLink === 'object') ? firstValidLink.href :
                         (typeof firstValidLink === 'string' ? firstValidLink :
                           (selfLink && selfLink.href && selfLink.href.startsWith('http') ? selfLink.href : '#')
                         )
                       );
        originalLink = he.decode(String(tempLink).trim());
      }

      if (originalLink === '#' && item.guid && (typeof item.guid === 'string' || (typeof item.guid === 'object' && item.guid._)) ) {
          const guidContent = typeof item.guid === 'object' ? item.guid._ : item.guid;
          if (typeof guidContent === 'string' && guidContent.startsWith('http') && (getNestedValue(item.guid, 'isPermaLink', 'true') !== 'false') ) {
            originalLink = he.decode(guidContent.trim());
          }
      }
      if (originalLink === '#' && item.id && typeof item.id === 'string' && item.id.startsWith('http')) {
        originalLink = he.decode(item.id.trim());
      }

      if (!originalLink.startsWith('http')) originalLink = '#';

      const pubDateSource = getNestedValue(item, 'pubDate') || getNestedValue(item, 'published') || getNestedValue(item, 'updated') || getNestedValue(item, 'dc:date');
      let parsedDateFromFeed = pubDateSource ? new Date(normalizeContent(pubDateSource)) : new Date();
      if (isNaN(parsedDateFromFeed.getTime())) {
        parsedDateFromFeed = new Date();
      }
      const date = parsedDateFromFeed.toISOString();

      let idBaseMaterial: string;
      let normalizedOriginalLinkForId = originalLink;
      if (originalLink && originalLink !== "#" && originalLink.startsWith('http')) {
          try {
              const urlObj = new URL(originalLink);
              const commonTrackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid', 'msclkid', 'source', 'src', 'ref'];
              commonTrackingParams.forEach(param => urlObj.searchParams.delete(param));
              normalizedOriginalLinkForId = `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}${urlObj.search ? urlObj.search : ''}`;
          } catch (e) { /* keep originalLink if normalization fails */ }
          idBaseMaterial = normalizedOriginalLinkForId;
      } else if (title && title.length > 0) {
          idBaseMaterial = title;
      } else {
          idBaseMaterial = `fallback-${source.name}-${new Date(date).getTime()}-${index}`;
      }

      let processedSlugPart = slugify(idBaseMaterial).substring(0, MAX_SLUG_LENGTH);
      if (!processedSlugPart || processedSlugPart.length < 5) {
          processedSlugPart = slugify(`emptybase-${slugify(source.name)}-${new Date(date).getTime()}-${index}-${Math.random().toString(36).substring(2,5)}`).substring(0, MAX_SLUG_LENGTH);
      }

      const sourceNameSlug = slugify(source.name).substring(0, MAX_SUFFIX_LENGTH) || 'unknownsrc';
      let finalId = `${processedSlugPart}-${sourceNameSlug}`;

      if (finalId.length < (sourceNameSlug.length + 5)) {
          finalId = slugify(`override-unique-${slugify(source.name)}-${new Date(date).getTime()}-${index}-${Math.random().toString(36).substring(2,7)}`);
      }

      let rawCategoryFromFeed = getNestedValue(item, 'category', source.defaultCategory || 'General');
      if (Array.isArray(rawCategoryFromFeed)) {
          rawCategoryFromFeed = rawCategoryFromFeed.map(cat => {
            if (typeof cat === 'object') return cat.term || cat._ || cat['#text'] || cat.label || cat.name || cat.$;
            return cat;
          }).filter(Boolean).join(', ') || source.defaultCategory || 'General';
      } else if (typeof rawCategoryFromFeed === 'object') {
          rawCategoryFromFeed = rawCategoryFromFeed.term || rawCategoryFromFeed._ || rawCategoryFromFeed['#text'] || rawCategoryFromFeed.label || rawCategoryFromFeed.name || rawCategoryFromFeed.$;
      }
      rawCategoryFromFeed = typeof rawCategoryFromFeed === 'string' ? he.decode(rawCategoryFromFeed.trim().split(',')[0].trim()) : (source.defaultCategory || 'General');

      const finalCategory = mapToDisplayCategory(rawCategoryFromFeed, title);

      let extractedImgUrl: string | null = null;
      let itemContentForPage: string | undefined = undefined;
      let summaryText: string;

      const rawFullContentFromFeed = normalizeContent(getNestedValue(item, 'content:encoded', getNestedValue(item, 'content', getNestedValue(item, 'description', getNestedValue(item, 'summary')))));
      itemContentForPage = rawFullContentFromFeed;
      summaryText = normalizeSummary(getNestedValue(item, 'description', getNestedValue(item, 'summary')), rawFullContentFromFeed, source.name);

      if (isForCategoriesOnly) {
         if (finalCategory && finalCategory !== 'General') {
            processedArticles.push({
                id: finalId, title, summary: "For category generation", date, source: source.name,
                category: finalCategory, imageUrl: null, link: '#', sourceLink: originalLink,
                fetchedAt: new Date().toISOString(),
            });
         }
         continue;
      }

      const plainSummaryForCheck = normalizeAndStripHtml(summaryText);
      if (!title || title.length < 10 || title.trim().toLowerCase() === "untitled article") {
        continue;
      }
      if (!plainSummaryForCheck || plainSummaryForCheck.length < 25 || plainSummaryForCheck.toLowerCase() === "no summary available.") {
        continue;
      }
      if (isSummaryJustTitle(title, plainSummaryForCheck)) {
        continue;
      }
       if (originalLink === '#') {
        continue;
      }

      extractedImgUrl = extractImageUrl(item, title, finalCategory, source.name, originalLink);
      if (!extractedImgUrl && source.fetchOgImageFallback && originalLink !== '#' && fetchOgImagesParam) {
        try {
          const ogImage = await fetchOgImageFromUrl(originalLink);
          if (ogImage) extractedImgUrl = ogImage;
        } catch (ogError) { /* Already logged in fetchOgImageFromUrl */ }
      }

      if (extractedImgUrl && itemContentForPage && itemContentForPage.length > 0) {
            try {
                const $ = cheerioLoad(itemContentForPage);
                const firstImgElement = $('img').first();
                if (firstImgElement.length) {
                    let firstImgSrcInContent = firstImgElement.attr('src') || firstImgElement.attr('data-src') || firstImgElement.attr('data-original') || firstImgElement.attr('data-lazy-src');
                    if (firstImgSrcInContent) {
                        let resolvedFirstImgSrcInContent = '';
                        let tempSrc = firstImgSrcInContent.trim();
                        if (tempSrc.startsWith('//')) tempSrc = `https:${tempSrc}`;

                        if (tempSrc.startsWith('http')) {
                            try { resolvedFirstImgSrcInContent = new URL(tempSrc).href; } catch (e) { /* ignore */ }
                        } else if (originalLink && originalLink.startsWith('http')) {
                            try { resolvedFirstImgSrcInContent = new URL(tempSrc, originalLink).href; } catch (e) { /* ignore */ }
                        }

                        if (resolvedFirstImgSrcInContent && resolvedFirstImgSrcInContent === extractedImgUrl) {
                            const imgHtmlCandidate = $.html(firstImgElement);
                            const indexOfImg = itemContentForPage.indexOf(imgHtmlCandidate);
                            if (indexOfImg !== -1 && indexOfImg < 300) {
                                firstImgElement.remove();
                                itemContentForPage = $.html();
                            }
                        }
                    }
                }
            } catch (cheerioError) {
                console.warn(`[RSS Cheerio Img Remove] Error processing content for image removal from ${source.name}: ${(cheerioError as Error).message}`);
            }
      }

      let slugifiedCategory = slugify(finalCategory);
      if (!slugifiedCategory || slugifiedCategory.length < 1) {
          slugifiedCategory = 'general';
      }
      const internalArticleLink = `/${slugifiedCategory}/${finalId}`;

      const articleForProcessing: ArticleInterface = {
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
      processedArticles.push(articleForProcessing);
    }
    return processedArticles;
  } catch (error: any) {
    let errorMessage = `[RSS Service] Error fetching or parsing RSS from ${source.name} (${source.rssUrl}): ${error.message || error}`;
    if (error.cause && error.cause.code === 'ENOTFOUND') {
        errorMessage = `[RSS Service] DNS lookup failed for ${source.name} (hostname: ${error.cause.hostname}). Unable to resolve ${source.rssUrl}. Please check network or DNS settings. Original error: ${error.message}`;
    }
    console.error(errorMessage, error.stack ? `\nStack: ${error.stack}`: '');
    return [];
  }
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
  const allArticlesPromises = NEWS_SOURCES.map(source =>
    fetchAndParseRSS(source, isForCategoriesOnly, fetchOgImagesParam && (source.fetchOgImageFallback ?? false))
  );
  const results = await Promise.allSettled(allArticlesPromises);

  let allFetchedArticles: ArticleInterface[] = results
    .filter(result => result.status === 'fulfilled')
    .map(result => (result as PromiseFulfilledResult<ArticleInterface[]>).value)
    .flat();

  if (isForCategoriesOnly) {
      const uniqueCategories = new Set<string>();
      allFetchedArticles.forEach(art => uniqueCategories.add(art.category));
      return { articles: Array.from(uniqueCategories).map(cat => ({ category: cat } as ArticleInterface)) };
  }

  allFetchedArticles.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  let finalArticlesToProcess = allFetchedArticles;
  const defaultProcessingCap = 500;

  if (articleLimit && articleLimit > 0) {
    finalArticlesToProcess = finalArticlesToProcess.slice(0, articleLimit);
  } else {
    finalArticlesToProcess = finalArticlesToProcess.slice(0, defaultProcessingCap);
  }

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
  const articlesToReturnOrSave = articlesWithGuaranteedUniqueIds;

  let updateStats: ArticleUpdateStats | undefined = undefined;
  if (saveToDb) {
    if (articlesToReturnOrSave.length > 0) {
      updateStats = await saveArticlesToDatabase(articlesToReturnOrSave);
    } else {
      console.log("[RSS Service] 'saveToDb' is true, but no articles to save.");
      updateStats = { newlyAddedCount: 0, processedInBatch: 0, skippedBySourceLink: 0, skippedByTitle: 0 };
    }
  }
  return { articles: articlesToReturnOrSave, stats: updateStats };
}

export type { ArticleInterface as Article };
// ArticleUpdateStats type export removed as it's defined inline now.
