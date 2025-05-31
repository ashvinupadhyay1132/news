
// @ts-nocheck
// Disabling TypeScript checks for this file due to the dynamic nature of RSS feed structures
// and the use of xml2js which can lead to complex type definitions.
'use server';

import { Parser } from 'xml2js';
import type { Article } from './placeholder-data';
import { slugify, getNestedValue } from './utils';
import he from 'he';
import iconv from 'iconv-lite';
import { load as cheerioLoad } from 'cheerio';

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

    // --- Start with more specific categories or source-based hints ---

    // Technology (give it higher precedence if rawCategory hints at it)
    const techKeywordsRaw = ['tech', 'gadget', 'internet', 'software', 'hardware', 'ai', 'artificial intelligence', 'crypto', 'digital', 'startup', 'app', 'computing', 'innovation', 'programming', 'data', 'cloud', 'cybersecurity', 'mobile', 'wearable', 'vr', 'ar'];
    const techKeywordsTitle = [' tech', 'software', 'hardware', ' ai', ' app ', 'developer', 'algorithm', 'data breach', 'cybersecurity', 'platform', 'online', 'website', 'user interface', 'user experience'];

    if (techKeywordsRaw.some(keyword => lowerRawCategory.includes(keyword))) {
        // If title also strongly suggests another category (e.g. "sports tech"), that might override.
        // Check for strong counter-indicators from title for sports
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


    // Sports (make keywords more specific)
    const sportKeywordsRawStrict = ['sports', 'cricket', 'football', 'soccer', 'tennis', 'ipl', 'olympic', 'nba', 'mls', 'esports', 'f1', 'motogp', 'athletics', 'badminton', 'hockey', 'rugby', 'golf', 'wrestling', 'boxing', 'formula 1', 'e-sports', 'gaming competition'];
    const sportKeywordsTitleStrict = ['cricket score', 'ipl match', 'football game', 'tennis tournament', 'olympic medal', 'nba playoffs', 'world cup qualifier', 'grand slam event', 'batsman', 'bowler', 'goal', 'league table', 'championship game', 'fixture schedule', 'match report', 'final score', 'athlete'];
    
    if (sportKeywordsRawStrict.some(keyword => lowerRawCategory.includes(keyword))) return 'Sports';
    if (sportKeywordsTitleStrict.some(keyword => lowerTitle.includes(keyword)) && 
        (lowerRawCategory.includes('news') || lowerRawCategory.includes('general') || lowerRawCategory.includes('headlines') || lowerRawCategory.includes('top stor') || lowerRawCategory === '' || lowerRawCategory.includes('sport'))) {
        // Avoid misclassifying tech articles that might mention "match" in a non-sporting context
        if (lowerTitle.includes('match') && (techKeywordsRaw.some(keyword => lowerRawCategory.includes(keyword)) || techKeywordsTitle.some(keyword => lowerTitle.includes(keyword)))) {
            // This is likely a tech article, let technology rule pass if it hasn't already.
        } else {
            return 'Sports';
        }
    }


    // Business & Finance
    const bizKeywordsRaw = ['business', 'finance', 'stock', 'market', 'economic', 'economy', 'compan', 'industr', 'bank', 'invest', 'corporate', 'earnings', 'ipo', 'merger', 'acquisition', 'trade', 'commerce', 'financial', 'nse', 'bse', 'sensex', 'nifty'];
    const bizKeywordsTitle = ['sensex', 'nifty', 'ipo', 'startup funding', 'quarterly result', 'profit', 'loss', 'gdp', 'inflation', 'interest rate', 'budget', 'fiscal policy', 'monetary policy', 'shares', 'stocks', 'commodities', 'forex', 'bull market', 'bear market', 'economic growth', 'recession'];

    if (bizKeywordsRaw.some(keyword => lowerRawCategory.includes(keyword))) return 'Business & Finance';
    if (bizKeywordsTitle.some(keyword => lowerTitle.includes(keyword)) && 
        (lowerRawCategory.includes('news') || lowerRawCategory.includes('general') || lowerRawCategory.includes('headlines') || lowerRawCategory.includes('top stor') || lowerRawCategory === '' || lowerRawCategory.includes('business') || lowerRawCategory.includes('finance'))) {
       return 'Business & Finance';
    }
    
    // Politics
    const politicsKeywordsRaw = ['politic', 'election', 'government', 'parliament', 'minister', 'democracy', 'legislature', 'ballot', 'campaign', 'diplomacy', 'geopolitics', 'public policy'];
    const politicsKeywordsTitle = ['election result', 'prime minister', 'modi', 'rahul gandhi', 'parliament session', 'bill passed', 'policy debate', 'international summit', 'treaty negotiation', 'geopolitical tension', 'vote count', 'political rally', 'mp', 'mla', 'chief minister', 'cabinet meeting'];

    if (politicsKeywordsRaw.some(keyword => lowerRawCategory.includes(keyword))) return 'Politics';
    if (politicsKeywordsTitle.some(keyword => lowerTitle.includes(keyword)) &&
        (lowerRawCategory.includes('news') || lowerRawCategory.includes('general') || lowerRawCategory.includes('headlines') || lowerRawCategory.includes('top stor') || lowerRawCategory === '' || lowerRawCategory.includes('politic'))) {
        return 'Politics';
    }

    // Entertainment
    const entKeywordsRaw = ['entertainment', 'movie', 'film', 'music', 'bollywood', 'hollywood', 'celebrity', 'tv', 'web series', 'cinema', 'arts', 'culture', 'showbiz', 'box office', 'gossip']; 
    const entKeywordsTitle = ['box office collection', 'movie review', 'film trailer', 'album release', 'concert tour', 'award ceremony', 'actor interview', 'actress lifestyle', 'director announcement', 'series finale date', 'ott platform release', 'celebrity news'];
    
    if (entKeywordsRaw.some(keyword => lowerRawCategory.includes(keyword))) {
        if(lowerRawCategory.includes('lifestyle') && (techKeywordsRaw.some(k => lowerRawCategory.includes(k)) || bizKeywordsRaw.some(k => lowerRawCategory.includes(k)))) {
            // let other rules handle if it's more tech/biz lifestyle
        } else {
            return 'Entertainment';
        }
    }
    if (entKeywordsTitle.some(keyword => lowerTitle.includes(keyword)) &&
        (lowerRawCategory.includes('news') || lowerRawCategory.includes('general') || lowerRawCategory.includes('headlines') || lowerRawCategory.includes('top stor') || lowerRawCategory === '' || lowerRawCategory.includes('entertainment'))) {
        return 'Entertainment';
    }

    // Science
    const scienceKeywordsRaw = ['science', 'space', 'health research', 'scientific discover', 'astronomy', 'physics', 'biology', 'chemistry', 'medicine research', 'environment science', 'archaeology', 'paleontology', 'innovation in science'];
    const scienceKeywordsTitle = ['nasa mission', 'isro launch', 'spacex flight', 'mars rover', 'black hole discovery', 'clinical trial results', 'vaccine development', 'fossil find', 'dinosaur era', 'climate change report', 'quantum computing breakthrough', 'dna sequencing', 'scientific breakthrough', 'research paper'];

    if (scienceKeywordsRaw.some(keyword => lowerRawCategory.includes(keyword))) {
        if (lowerRawCategory.includes('health') && (bizKeywordsRaw.some(k => lowerRawCategory.includes(k)) || lowerRawCategory.includes('market'))) {
            // likely business news about health sector
        } else {
            return 'Science';
        }
    }
    if (scienceKeywordsTitle.some(keyword => lowerTitle.includes(keyword)) &&
        (lowerRawCategory.includes('news') || lowerRawCategory.includes('general') || lowerRawCategory.includes('headlines') || lowerRawCategory.includes('top stor') || lowerRawCategory === '' || lowerRawCategory.includes('science'))) {
        return 'Science';
    }
    
    // World News
    const worldKeywordsRaw = ['world', 'global', 'international', 'asia news', 'europe news', 'africa news', 'america news', 'un session', 'nato meeting', 'foreign affairs discussion'];
    if (worldKeywordsRaw.some(keyword => lowerRawCategory.includes(keyword)) && !lowerRawCategory.includes('india')) {
        return 'World News';
    }
    if ((lowerTitle.includes('war in') || lowerTitle.includes('global summit on') || lowerTitle.includes('international relations update') || lowerTitle.includes('united nations resolution')) && !(lowerRawCategory.includes('india') || lowerTitle.includes('india'))) {
        return 'World News';
    }
    
    // India News
    const indiaKeywordsRaw = ['india', 'national', 'delhi', 'mumbai', 'bengaluru', 'kolkata', 'chennai', 'hyderabad', 'pune', 'state news', 'indian affairs'];
    if (indiaKeywordsRaw.some(keyword => lowerRawCategory.includes(keyword))) return 'India News';
    if (indiaKeywordsRaw.some(keyword => lowerTitle.includes(keyword)) && (lowerRawCategory.includes('news') || lowerRawCategory.includes('general') || lowerRawCategory.includes('headlines'))) return 'India News';


    // Life & Style (should be less aggressive than entertainment)
    const lifeKeywordsRaw = ['life', 'style', 'fashion', 'food', 'travel', 'wellness', 'horoscope', 'recipe', 'well-being', 'home decor', 'garden tips', 'parenting advice', 'relationships guide', 'beauty trends'];
    const lifeKeywordsTitle = ['fashion week highlights', 'easy recipe for', 'travel guide to', 'yoga benefits', 'meditation techniques', 'daily zodiac forecast', 'parenting hacks', 'home makeover ideas', 'latest beauty products'];
    
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
    
    // Top News (usually from source)
    if (lowerRawCategory.includes('top stor') || lowerRawCategory.includes('latest news') || lowerRawCategory.includes('breaking news') || lowerRawCategory.includes('headlines')) return 'Top News';
    
    // If rawCategory is already one of the target categories (case-insensitive check)
    const matchedTargetCategory = TARGET_DISPLAY_CATEGORIES.find(tc => tc.toLowerCase() === lowerRawCategory);
    if (matchedTargetCategory) return matchedTargetCategory;

    // Default fallback
    return 'General';
}


const NEWS_SOURCES: NewsSource[] = [
  { name: "TechCrunch", rssUrl: "https://techcrunch.com/feed/", defaultCategory: "Technology", fetchOgImageFallback: true },
  { name: "Reuters - Business", rssUrl: "https://feeds.reuters.com/reuters/businessNews", defaultCategory: "Business & Finance", fetchOgImageFallback: true },
  { name: "Live Science", rssUrl: "https://www.livescience.com/home/feed/site.xml", defaultCategory: "Science", fetchOgImageFallback: true },
  
  { name: "TOI - Top Stories", rssUrl: "https://timesofindia.indiatimes.com/rssfeedstopstories.cms", defaultCategory: "Top News", fetchOgImageFallback: true },
  { name: "TOI - India News", rssUrl: "https://timesofindia.indiatimes.com/rssfeeds/54829575.cms", defaultCategory: "India News", fetchOgImageFallback: true }, // Updated TOI India specific
  { name: "HT - India", rssUrl: "https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml", defaultCategory: "India News", fetchOgImageFallback: true },
  { name: "Indian Express - India", rssUrl: "https://indianexpress.com/section/india/feed/", defaultCategory: "India News", fetchOgImageFallback: true },
  { name: "BBC News - India", rssUrl: "https://feeds.bbci.co.uk/news/world/asia/india/rss.xml", defaultCategory: "India News", fetchOgImageFallback: true },

  { name: "Livemint - News", rssUrl: "https://www.livemint.com/rss/news", defaultCategory: "Business & Finance", fetchOgImageFallback: true },
  { name: "Economic Times", rssUrl: "https://economictimes.indiatimes.com/rssfeedsdefault.cms", defaultCategory: "Business & Finance", fetchOgImageFallback: true },
  
  { name: "BBC World News", rssUrl: "http://feeds.bbci.co.uk/news/world/rss.xml", defaultCategory: "World News", fetchOgImageFallback: true },
  { name: "TOI - World", rssUrl: "https://timesofindia.indiatimes.com/rssfeeds/296589292.cms", defaultCategory: "World News", fetchOgImageFallback: true },
  { name: "TOI - Entertainment", rssUrl: "https://timesofindia.indiatimes.com/rssfeeds/1081479906.cms", defaultCategory: "Entertainment", fetchOgImageFallback: true },
  { name: "TOI - Sports", rssUrl: "https://timesofindia.indiatimes.com/rssfeeds/4719148.cms", defaultCategory: "Sports", fetchOgImageFallback: true },
  { name: "TOI - Science", rssUrl: "https://timesofindia.indiatimes.com/rssfeeds/-2128672765.cms", defaultCategory: "Science", fetchOgImageFallback: true },
  { name: "TOI - Life & Style", rssUrl: "https://timesofindia.indiatimes.com/rssfeeds/2886704.cms", defaultCategory: "Life & Style", fetchOgImageFallback: true },
  { name: "TOI - Business", rssUrl: "https://timesofindia.indiatimes.com/rssfeeds/1898055.cms", defaultCategory: "Business & Finance", fetchOgImageFallback: true },

  // Sports specific feeds
  { name: "RSSHub - BBC Sports", rssUrl: "https://rsshub.app/bbc/sport", defaultCategory: "Sports", fetchOgImageFallback: true },
  { name: "RSSHub - Bing Sports", rssUrl: "https://rsshub.app/bing/news/sports", defaultCategory: "Sports", fetchOgImageFallback: true },
  { name: "RSSHub - ESPN", rssUrl: "https://rsshub.app/espn/news", defaultCategory: "Sports", fetchOgImageFallback: true },
];


const parser = new Parser({ 
  explicitArray: false, 
  ignoreAttrs: false, 
  mergeAttrs: true,
  trim: true 
});

async function fetchOgImageFromUrl(articleUrl: string): Promise<string | null> {
    if (!articleUrl || !articleUrl.startsWith('http')) {
      // console.warn(`[RSS Service] Invalid article URL for OG image: ${articleUrl}`);
      return null;
    }
    try {
      const response = await fetch(articleUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        },
        signal: AbortSignal.timeout(8000) // 8-second timeout
      });
  
      if (!response.ok) {
        // console.warn(`[RSS Service] Failed to fetch OG image from ${articleUrl}, status: ${response.status}`);
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
          ogImageUrl = he.decode(ogImageUrl.trim()); // Decode HTML entities
          // Ensure the URL is absolute
          if (ogImageUrl.startsWith('/')) {
              const urlObject = new URL(articleUrl);
              ogImageUrl = `${urlObject.protocol}//${urlObject.hostname}${ogImageUrl}`;
          }
          if (!ogImageUrl.startsWith('http://') && !ogImageUrl.startsWith('https://')) {
              // console.warn(`[RSS Service] Invalid OG image URL scheme: ${ogImageUrl} from ${articleUrl}`);
              return null; // Invalid image URL scheme
          }
          return ogImageUrl;
      }
      // console.log(`[RSS Service] No OG image found on ${articleUrl}`);
      return null;
    } catch (error) {
      // console.error(`[RSS Service] Error fetching OG image from ${articleUrl}:`, error.message);
      return null;
    }
}

function normalizeContent(contentInput: any): string {
  let text = '';
  if (typeof contentInput === 'string') {
    text = contentInput;
  } else if (contentInput && typeof contentInput._ === 'string') { // For xml2js parsed content like { _: "text" }
    text = contentInput._;
  } else if (contentInput && typeof contentInput.$t === 'string') { // Another common pattern
    text = contentInput.$t;
  } else if (contentInput && typeof contentInput['#'] === 'string') { // Check for '#' key used by some parsers for text content
      text = contentInput['#'];
  } else if (contentInput && typeof contentInput['#text'] === 'string') { // Yet another pattern
      text = contentInput['#text'];
  } else if (contentInput && contentInput['#name'] === '__cdata' && typeof contentInput._ === 'string') { // CDATA
     text = contentInput._;
  } else if (Array.isArray(contentInput)) {
    // If it's an array, join the parts (could be mixed text and CDATA nodes)
    text = contentInput.map(segment => normalizeContent(segment)).join(' ');
  } else if (typeof contentInput === 'object' && contentInput !== null) {
    // Fallback for other object structures - try common text keys
    const potentialTextKeys = ['_', '$t', '#text', '#cdata', 'p', 'span', 'div'];
    for (const key of potentialTextKeys) {
        if (contentInput[key] && typeof contentInput[key] === 'string') {
            text = contentInput[key];
            break;
        }
    }
    // If still no text, try a few standard fields often used for full content
    if (!text) { 
        const standardFields = [
            getNestedValue(contentInput, 'content:encoded'),
            getNestedValue(contentInput, 'content'),
            getNestedValue(contentInput, 'description'),
            getNestedValue(contentInput, 'summary'),
        ];
        for (const val of standardFields) {
            const normalizedVal = normalizeContent(val); // Recursive call
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
        // Remove \uFFFD (garbage char) and other common control characters
        decodedText = decodedText.replace(/[\uFFFD\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); 
        return decodedText;
    } catch (e) {
        // console.warn(`[RSS Service] Error decoding text: "${text.substring(0,50)}..."`, e.message);
        return text.trim().replace(/[\uFFFD\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    }
  }
  return '';
}

function normalizeSummary(descriptionInput: any, fullContentInput?: any, sourceName?: string): string {
  let textToSummarize = '';
  const descriptionText = normalizeContent(descriptionInput); 
  const fullContentText = normalizeContent(fullContentInput); 

  // Prefer full content if it's significantly longer than the description
  if (fullContentText && fullContentText.length > (descriptionText?.length || 0) + 50) { // Arbitrary 50 char difference
    textToSummarize = fullContentText;
  } else if (descriptionText) {
    textToSummarize = descriptionText;
  } else if (fullContentText) { // Fallback to full content if description is empty
    textToSummarize = fullContentText;
  }
  
  // Specific cleaning for known problematic sources like Reddit
  if (sourceName && sourceName.toLowerCase().includes("reddit")) {
    textToSummarize = textToSummarize
        .replace(/<p>submitted by.*?<\/p>/gi, '') // Remove "submitted by..." paragraphs
        .replace(/<a href="[^"]*">\[comments?\]<\/a>/gi, '') // Remove [comments] links
        .replace(/<a href="[^"]*">\[link\]<\/a>/gi, '')     // Remove [link] links
        .replace(/<a[^>]*?>\[\d+ comments?\]<\/a>/gi, '') // Remove specific comment count links
        .replace(/<p><a href="[^"]*">.*?read more.*?<\/a><\/p>/gi, ''); // Remove "read more" links in paragraphs
  }

  // General HTML stripping and text cleaning
  const plainText = textToSummarize
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove style tags and their content
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove script tags and their content
    .replace(/<figure[^>]*>[\s\S]*?<\/figure>/gi, '') // Remove figure tags and their content
    .replace(/<img[^>]*?>/gi, '') // Remove img tags (summary shouldn't contain raw img tags)
    .replace(/<table[^>]*>[\s\S]*?<\/table>/gi, '') // Remove table tags and their content
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '') // Remove iframe tags
    .replace(/<video[^>]*>[\s\S]*?<\/video>/gi, '') // Remove video tags
    .replace(/<audio[^>]*>[\s\S]*?<\/audio>/gi, '') // Remove audio tags
    .replace(/<!--[\s\S]*?-->/g, '') // Remove HTML comments
    .replace(/<[^>]+>/g, ' ') // Strip all other HTML tags
    .replace(/\[link\]|\[comments\]/gi, '') // Remove [link] or [comments] text artifacts
    .replace(/&nbsp;/gi, ' ') // Replace non-breaking spaces
    .replace(/\s+/g, ' ')    // Normalize whitespace to single spaces
    .trim();
    
  // If the primary summarization yields nothing, but fullContentText was different and exists, try with that
  if (!plainText && fullContentText && fullContentText !== textToSummarize) { 
      const plainFullContent = fullContentText
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<figure[^>]*>[\s\S]*?<\/figure>/gi, '') 
        .replace(/<img[^>]*?>/gi, '') 
        .replace(/<table[^>]*>[\s\S]*?<\/table>/gi, '')
        .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
        .replace(/<video[^>]*>[\s\S]*?<\/video>/gi, '')
        .replace(/<audio[^>]*>[\s\S]*?<\/audio>/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\[link\]|\[comments\]/gi, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return he.decode(plainFullContent.substring(0, 250) + (plainFullContent.length > 250 ? '...' : ''));
  }

  if (plainText.length === 0) return "No summary available.";
  return he.decode(plainText.substring(0, 250) + (plainText.length > 250 ? '...' : ''));
}

function extractImageUrl(item: any, articleTitle: string, articleCategory?: string, sourceName?: string, articleLink?: string): string | null {
  let imageUrl: string | null = null;
  
  // 1. Check media:content (common in many feeds, including Atom)
  if (item['media:content']) {
    const mediaContents = Array.isArray(item['media:content']) ? item['media:content'] : [item['media:content']];
    for (const content of mediaContents) {
      if (content && content.url && (content.medium === 'image' || (String(getNestedValue(content, 'type', '')).startsWith('image/')) || (getNestedValue(content, 'type', '').includes('image')))) {
        imageUrl = content.url;
        break;
      }
    }
  }

  // 2. Check media:group -> media:content (another common Atom pattern)
  if (!imageUrl && item['media:group'] && item['media:group']['media:content']) {
    const mediaContents = Array.isArray(item['media:group']['media:content'])
      ? item['media:group']['media:content']
      : [item['media:group']['media:content']];
    for (const content of mediaContents) {
      if (content && content.url && (content.medium === 'image' || (getNestedValue(content, 'type', '').startsWith('image/')))) {
        imageUrl = content.url;
        break;
      }
    }
  }
  
  // 3. Check enclosure (RSS standard)
  if (!imageUrl && item.enclosure && item.enclosure.url && item.enclosure.type && String(item.enclosure.type).startsWith('image/')) {
    imageUrl = item.enclosure.url;
  }

  // 4. Check media:thumbnail
  if (!imageUrl && item['media:thumbnail'] && item['media:thumbnail'].url) {
    imageUrl = item['media:thumbnail'].url;
  }
 
  // 5. Check simple image tag (less common directly in item root for image, but some feeds might use it)
  if (!imageUrl && item.image && item.image.url) {
    imageUrl = item.image.url;
  } else if (!imageUrl && item.image && typeof item.image === 'string' && item.image.startsWith('http')) {
    imageUrl = item.image;
  }
  
  // 6. Check for images embedded in HTML content (description, content:encoded, etc.)
  const contentFieldsForImageSearch = [
    getNestedValue(item, 'content:encoded'), // Often contains full HTML
    getNestedValue(item, 'content'),
    getNestedValue(item, 'description'),
    getNestedValue(item, 'summary'), // Less likely for images but check anyway
  ];

  for (const field of contentFieldsForImageSearch) {
    if (imageUrl) break;
    const normalizedField = normalizeContent(field); // Get the text/HTML content
    if (normalizedField && typeof normalizedField === 'string') {
      const $ = cheerioLoad(normalizedField);
      const imgTag = $('img').first();
      if (imgTag.length && imgTag.attr('src')) {
        let srcCandidate = imgTag.attr('src');
        // Attempt to make relative URLs absolute
        if (srcCandidate && !srcCandidate.startsWith('http') && articleLink) {
          try {
            const base = new URL(articleLink);
            srcCandidate = new URL(srcCandidate, base.origin).href;
          } catch (e) { /* ignore, keep relative if fails */ }
        }
        if (srcCandidate && srcCandidate.startsWith('http')) { // Only accept absolute URLs from HTML parsing
            imageUrl = srcCandidate;
            break;
        }
      }
    }
  }
  
  // Final URL cleaning and validation
  if (imageUrl && typeof imageUrl === 'string') {
    imageUrl = he.decode(imageUrl.trim());
    if (imageUrl.startsWith('//')) { // Protocol-relative URL
      return `https:${imageUrl}`;
    }
    if (imageUrl.startsWith('/')) { // Path-relative URL, needs articleLink to resolve
        if (articleLink && articleLink.startsWith('http')) {
            try {
                const baseUrlObject = new URL(articleLink);
                return new URL(imageUrl, baseUrlObject.origin).href;
            } catch (e) { return null; } // Cannot resolve
        }
        return null; // Cannot resolve without a base URL
    }
    // Ensure it has a valid protocol
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
        return null; // Invalid scheme
    }
    return imageUrl;
  }
  return null; // No image found or invalid
}

async function fetchAndParseRSS(source: NewsSource): Promise<Article[]> {
  try {
    // console.log(`[RSS Service] Fetching: ${source.name} from ${source.rssUrl}`);
    const fetchResponse = await fetch(source.rssUrl, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36 NewsAggregator/1.0 (+http://example.com/bot.html)', // Polite User-Agent
        'Accept': 'application/rss+xml,application/xml,application/atom+xml;q=0.9,text/xml;q=0.8,*/*;q=0.7' // Accept common feed types
      },
      signal: AbortSignal.timeout(15000), // 15-second timeout for fetch
      next: { revalidate: 300 } // Revalidate cache every 5 minutes for this fetch
    });

    if (!fetchResponse.ok) {
      // console.error(`[RSS Service] Failed to fetch ${source.name}: ${fetchResponse.status} ${fetchResponse.statusText}`);
      return [];
    }

    const arrayBuffer = await fetchResponse.arrayBuffer();
    const rawDataBuffer = Buffer.from(arrayBuffer);
    
    // Attempt to decode with UTF-8, fallback to Windows-1252 if too many replacement characters
    let feedXmlString: string;
    let utf8Decoded = iconv.decode(rawDataBuffer, 'utf-8', { stripBOM: true });
    const utf8ReplacementCharCount = (utf8Decoded.match(/\uFFFD/g) || []).length;

    // Heuristic: if more than 5 replacement chars OR >1% of content is replacement chars, try windows-1252
    if (utf8ReplacementCharCount > 0 && (utf8ReplacementCharCount > 5 || utf8ReplacementCharCount / (utf8Decoded.length || 1) > 0.01)) {
      // console.warn(`[RSS Service] High UTF-8 replacement chars for ${source.name}. Trying Windows-1252.`);
      feedXmlString = iconv.decode(rawDataBuffer, 'windows-1252', { stripBOM: true });
    } else {
      feedXmlString = utf8Decoded;
    }
    
    // Final cleanup of any remaining replacement characters or common control chars
    feedXmlString = feedXmlString.replace(/[\uFFFD\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');


    const result = await parser.parseStringPromise(feedXmlString);

    // Determine the path to the items array based on common RSS/Atom structures
    let items = getNestedValue(result, 'rss.channel.item', []);
    if (!items || (Array.isArray(items) && items.length === 0)) { // Try Atom structure
      items = getNestedValue(result, 'feed.entry', []); 
    }
     if (!items || (Array.isArray(items) && items.length === 0)) { // Try RDF structure
      items = getNestedValue(result, 'rdf:RDF.item', []); 
    }

    // Ensure items is an array, even if only one item was found
    if (!Array.isArray(items)) {
      items = items ? [items] : []; // If items is truthy but not an array, wrap it
    }

    if (items.length === 0) {
      // console.warn(`[RSS Service] No items found for ${source.name} after parsing.`);
      return [];
    }

    const processedItems: Article[] = [];

    for (const [index, item] of items.entries()) {
      const rawTitle = normalizeContent(getNestedValue(item, 'title', 'Untitled Article'));
      const title = rawTitle; // Already normalized by normalizeContent

      // Robust link extraction
      let originalLink = '#';
      const linkField = getNestedValue(item, 'link');
      if (typeof linkField === 'string') {
        originalLink = he.decode(linkField.trim());
      } else if (typeof linkField === 'object' && linkField?.href) { // Atom link object
        originalLink = he.decode(linkField.href.trim());
      } else if (typeof linkField === 'object' && !linkField?.href && linkField?._) { // xml2js object with text in _
        originalLink = he.decode(linkField._.trim());
      } else if (Array.isArray(linkField)) { // Multiple link tags (common in Atom)
        const alternateLink = linkField.find(l => typeof l === 'object' && l.rel === 'alternate' && l.type === 'text/html' && l.href);
        const selfLink = linkField.find(l => typeof l === 'object' && l.rel === 'self' && l.href); // Less preferred but a fallback
        const firstValidLink = linkField.find(l => (typeof l === 'object' && l.href && l.href.startsWith('http')) || (typeof l === 'string' && l.startsWith('http')) );
        
        let tempLink = alternateLink ? alternateLink.href : 
                       ( (firstValidLink && typeof firstValidLink === 'object') ? firstValidLink.href : 
                         (typeof firstValidLink === 'string' ? firstValidLink : 
                           (selfLink && selfLink.href && selfLink.href.startsWith('http') ? selfLink.href : '#')
                         )
                       );
        originalLink = he.decode(String(tempLink).trim());
      }
      
      // Fallback to guid if link is still '#', and guid is a permalink
      if (originalLink === '#' && item.guid && (typeof item.guid === 'string' || (typeof item.guid === 'object' && item.guid._)) ) {
          const guidContent = typeof item.guid === 'object' ? item.guid._ : item.guid;
          if (typeof guidContent === 'string' && guidContent.startsWith('http') && (getNestedValue(item.guid, 'isPermaLink', 'true') !== 'false') ) { // Check isPermaLink
            originalLink = he.decode(guidContent.trim());
          }
      }
      // Fallback to id (common in Atom as a unique identifier, sometimes a URL)
      if (originalLink === '#' && item.id && typeof item.id === 'string' && item.id.startsWith('http')) {
        originalLink = he.decode(item.id.trim()); 
      }


      // Date extraction from various common fields
      const pubDateSource = getNestedValue(item, 'pubDate') || getNestedValue(item, 'published') || getNestedValue(item, 'updated') || getNestedValue(item, 'dc:date');
      const date = pubDateSource ? new Date(normalizeContent(pubDateSource)).toISOString() : new Date().toISOString();

      // Generate a unique ID for the article
      // Prefer GUID if it's a string and looks like a permalink, otherwise use originalLink or title+source for uniqueness
      let guidValue = getNestedValue(item, 'guid');
      if (typeof guidValue === 'object') { // Handle cases where guid is an object like { _: "text", isPermaLink: "true" }
          if (guidValue.isPermaLink === 'false' || guidValue.ispermalink === 'false') { // Check both common spellings
              guidValue = originalLink !== '#' ? originalLink : (title + source.name + index); // Fallback if not permalink
          } else {
              guidValue = normalizeContent(getNestedValue(guidValue, '_', getNestedValue(guidValue, '#text', originalLink)));
          }
      } else {
          guidValue = normalizeContent(guidValue || getNestedValue(item, 'id')); // Use item.id as another fallback for guid
      }
      
      const idInput = (typeof guidValue === 'string' && guidValue.trim() !== '' && guidValue.trim() !== '#') ? guidValue : (originalLink !== "#" ? originalLink : (title + source.name + index) );
      const idSuffix = source.name.replace(/[^a-zA-Z0-9]/g, '').slice(0,10); // Sanitize source name for suffix
      const idBase = idInput.length > 75 ? idInput.substring(0, 75) : idInput; // Truncate long IDs
      const id = slugify(idBase) + '-' + idSuffix;


      // Category extraction and mapping
      let rawCategoryFromFeed = getNestedValue(item, 'category', source.defaultCategory || 'General');
      if (Array.isArray(rawCategoryFromFeed)) {
          // Extract 'term' for Atom, or text content
          rawCategoryFromFeed = rawCategoryFromFeed.map(cat => {
            if (typeof cat === 'object') return cat.term || cat._ || cat['#text'] || cat.label || cat.name || cat.$; // Atom uses 'term', some feeds might use other attributes
            return cat;
          }).filter(Boolean).join(', ') || source.defaultCategory || 'General';
      } else if (typeof rawCategoryFromFeed === 'object') {
          rawCategoryFromFeed = rawCategoryFromFeed.term || rawCategoryFromFeed._ || rawCategoryFromFeed['#text'] || rawCategoryFromFeed.label || rawCategoryFromFeed.name || rawCategoryFromFeed.$;
      }
      rawCategoryFromFeed = typeof rawCategoryFromFeed === 'string' ? he.decode(rawCategoryFromFeed.trim().split(',')[0].trim()) : (source.defaultCategory || 'General'); // Take first category if multiple
      
      const finalCategory = mapToDisplayCategory(rawCategoryFromFeed, title);

      // Image URL extraction
      let imageUrl = extractImageUrl(item, title, finalCategory, source.name, originalLink);
      
      // Fallback to OG image scraping if no image found and enabled for the source
      if (!imageUrl && source.fetchOgImageFallback && originalLink && originalLink !== '#') {
        try {
          const ogImage = await fetchOgImageFromUrl(originalLink);
          if (ogImage) imageUrl = ogImage;
        } catch (ogError) { /* error logged by fetchOgImageFromUrl if necessary */ }
      }
      
      // Content and summary
      let itemContent = normalizeContent(getNestedValue(item, 'content:encoded', getNestedValue(item, 'content', getNestedValue(item, 'description', getNestedValue(item, 'summary')))));
      const summaryText = normalizeSummary(getNestedValue(item, 'description', getNestedValue(item, 'summary')), itemContent, source.name);

      // Internal link for the app
      const internalArticleLink = `/${slugify(finalCategory)}/${id}`;

      // Filter out articles that still have the replacement character after cleaning
      if (title.includes('\uFFFD') || summaryText.includes('\uFFFD')) {
        // console.warn(`[RSS Service] Skipping article due to persistent garbage characters: "${title}" from ${source.name}`);
        continue;
      }
      // Filter out articles with insufficient summaries (already checked in normalizeSummary, but as safeguard)
      const summaryLower = summaryText.toLowerCase();
      if (!summaryText || summaryLower.length < 15 || summaryLower === "no summary available." || summaryLower === "...") {
        // console.warn(`[RSS Service] Skipping article due to insufficient summary: "${title}" from ${source.name}`);
        continue;
      }


      processedItems.push({
        id,
        title,
        summary: summaryText, // Use the cleaned and potentially truncated summary
        date,
        source: source.name,
        category: finalCategory, // Use the mapped category
        imageUrl: imageUrl || null, // Ensure null if no image
        link: internalArticleLink, // App-internal link
        sourceLink: originalLink, // Link to the original article
        content: itemContent || summaryText, // Full content if available, else summary
      });
    }
    return processedItems.filter(article => article.title && article.title !== 'Untitled Article' && article.sourceLink && article.sourceLink !== '#');
  } catch (error) {
    // console.error(`[RSS Service] Error processing feed for ${source.name}: ${error.message}`, error.stack);
    return []; // Return empty array on error for this source
  }
}

export async function fetchArticlesFromAllSources(): Promise<Article[]> {
  const allArticlesPromises = NEWS_SOURCES.map(source => fetchAndParseRSS(source));
  const results = await Promise.allSettled(allArticlesPromises); // Use allSettled to avoid one failing source stopping others

  let allArticles: Article[] = results
    .filter(result => result.status === 'fulfilled')
    .map(result => (result as PromiseFulfilledResult<Article[]>).value)
    .flat();
  
  // Filter out articles that STILL have garbage characters in title or summary after normalization
  allArticles = allArticles.filter(article => 
    !article.title.includes('\uFFFD') && 
    !article.summary.includes('\uFFFD')
  );
  
  // Filter out articles with insufficient summaries (minimum 15 chars, not placeholder)
  allArticles = allArticles.filter(article => {
    const summaryLower = article.summary.toLowerCase();
    return summaryLower.length >= 15 && summaryLower !== "no summary available." && summaryLower !== "...";
  });


  // De-duplication logic
  const uniqueArticlesMap = new Map<string, Article>();
  for (const article of allArticles) {
    if (!article.title || !article.sourceLink || article.sourceLink === '#') {
        // console.warn(`[RSS Service] Skipping article in de-duplication due to missing title/link: ${JSON.stringify(article)}`);
        continue; 
    }

    // Normalize title for key: first 80 chars, lowercase, remove extra spaces
    let normalizedTitleKey = article.title.toLowerCase().replace(/\s+/g, ' ').substring(0, 80).trim();
    
    // Normalize link for key: remove common tracking params, www, trailing slash
    let normalizedLinkKey = article.sourceLink;
    try {
        const url = new URL(article.sourceLink);
        // More comprehensive list of common tracking/irrelevant params
        const paramsToRemove = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid', 'msclkid', 'mc_cid', 'mc_eid', 'rssfeed', 'source', 'medium', 'campaign', 'ref', 'oc', '_gl', 'ftcamp', 'ft_orig', 'assetType', 'variant', 'trc', 'trk', 'spot_im_highlight_immediate', 'spot_im_platform', 'spot_im_story_after_action', 'spot_im_impression_id', 'si', 'ICID', 'ncid', 'ns_source', 'ns_mchannel', 'ns_campaign', 'ns_linkname', 'ns_fee', '_ga', 'oly_anon_id', 'oly_enc_id', 'otc_src', 'otc_tcat', 'otc_subtcat', 'otc_type', 'otc_ctry'];
        paramsToRemove.forEach(param => url.searchParams.delete(param));
        normalizedLinkKey = `${url.hostname}${url.pathname}${url.search}`.replace(/^www\./, '').replace(/\/$/, '').toLowerCase();
    } catch (e) { 
        // Fallback if URL parsing fails (e.g. malformed link)
        normalizedLinkKey = article.sourceLink.toLowerCase().replace(/^www\./, '').replace(/\/$/, '').trim();
    }

    const uniqueKey = `${normalizedTitleKey}|${normalizedLinkKey}`;
    const existingArticle = uniqueArticlesMap.get(uniqueKey);

    if (!existingArticle) {
        uniqueArticlesMap.set(uniqueKey, article);
    } else {
        // Prefer article with image, or more content, or more specific category
        let keepNew = false;
        if (article.imageUrl && !existingArticle.imageUrl) {
            keepNew = true;
        } else if (!article.imageUrl && existingArticle.imageUrl) {
            // keep existing
        } else if (article.content && (!existingArticle.content || article.content.length > (existingArticle.content.length + 50))) { // Prefer longer content
            keepNew = true;
        } else if (!article.content && existingArticle.content) {
           // keep existing
        } else if (article.category !== existingArticle.category && 
                   (article.category.toLowerCase() !== 'general' && !article.category.toLowerCase().includes('news') && !article.category.toLowerCase().includes('top stories')) && // New is more specific
                   (existingArticle.category.toLowerCase() === 'general' || existingArticle.category.toLowerCase().includes('news') || existingArticle.category.toLowerCase().includes('top stories'))) { // Existing is generic
            keepNew = true; 
        }
        
        if (keepNew) {
            uniqueArticlesMap.set(uniqueKey, article);
        }
    }
  }
  allArticles = Array.from(uniqueArticlesMap.values());

  // Sort by date (newest first)
  allArticles.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // console.log(`[RSS Service] Total articles after processing & de-duplication: ${allArticles.length}`);
  return allArticles.slice(0, 150); // Limit to a reasonable number for performance
}
    
