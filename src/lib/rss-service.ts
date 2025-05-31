
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

    // Sports
    if (lowerRawCategory.includes('sport') || lowerRawCategory.includes('cricket') || lowerRawCategory.includes('football') || lowerRawCategory.includes('tennis') || lowerRawCategory.includes('ipl') || lowerRawCategory.includes('olympic')) return 'Sports';
    if (lowerTitle.includes('cricket') || lowerTitle.includes('ipl') || lowerTitle.includes('football') || lowerTitle.includes('tennis') || lowerTitle.includes('olympic') || lowerTitle.includes('batsman') || lowerTitle.includes('bowler') || lowerTitle.includes('match') && (lowerRawCategory.includes('news') || lowerRawCategory.includes('general')) ) return 'Sports';

    // Business & Finance
    if (lowerRawCategory.includes('business') || lowerRawCategory.includes('finance') || lowerRawCategory.includes('stock') || lowerRawCategory.includes('market') || lowerRawCategory.includes('economic') || lowerRawCategory.includes('economy') || lowerRawCategory.includes('compan') || lowerRawCategory.includes('industr') || lowerRawCategory.includes('bank') || lowerRawCategory.includes('invest')) return 'Business & Finance';
    if (lowerTitle.includes('sensex') || lowerTitle.includes('nifty') || lowerTitle.includes('ipo') || lowerTitle.includes('startup funding') || lowerTitle.includes('quarterly result') || lowerTitle.includes('profit') || lowerTitle.includes('loss') && (lowerRawCategory.includes('news') || lowerRawCategory.includes('general'))) return 'Business & Finance';
    
    // Politics
    if (lowerRawCategory.includes('politic') || lowerRawCategory.includes('election') || lowerRawCategory.includes('government') || lowerRawCategory.includes('parliament') || lowerRawCategory.includes('minister') || lowerRawCategory.includes('democracy')) return 'Politics';
    if (lowerTitle.includes('election') || lowerTitle.includes('prime minister') || lowerTitle.includes('modi') || lowerTitle.includes('rahul gandhi') || lowerTitle.includes('parliament') || lowerTitle.includes('bill pass') || lowerTitle.includes('policy') && (lowerRawCategory.includes('news') || lowerRawCategory.includes('general'))) return 'Politics';

    // Technology
    if (lowerRawCategory.includes('tech') || lowerRawCategory.includes('gadget') || lowerRawCategory.includes('internet') || lowerRawCategory.includes('software') || lowerRawCategory.includes('hardware') || lowerRawCategory.includes('ai') || lowerRawCategory.includes('artificial intelligence') || lowerRawCategory.includes('crypto') || lowerRawCategory.includes('digital')) return 'Technology';

    // Entertainment
    if (lowerRawCategory.includes('entertainment') || lowerRawCategory.includes('movie') || lowerRawCategory.includes('film') || lowerRawCategory.includes('music') || lowerRawCategory.includes('bollywood') || lowerRawCategory.includes('hollywood') || lowerRawCategory.includes('celebrity') || lowerRawCategory.includes('tv') || lowerRawCategory.includes('web series')) return 'Entertainment';

    // Science
    if (lowerRawCategory.includes('science') || lowerRawCategory.includes('space') || (lowerRawCategory.includes('health') && !(lowerRawCategory.includes('business') || lowerRawCategory.includes('finance'))) || lowerRawCategory.includes('research') || lowerRawCategory.includes('discover')) return 'Science';

    // World News
    if (lowerRawCategory.includes('world') || (lowerRawCategory.includes('global') && !lowerRawCategory.includes('india')) || (lowerRawCategory.includes('international') && !lowerRawCategory.includes('india')) || (lowerRawCategory.includes('news') && !(lowerRawCategory.includes('india') || TARGET_DISPLAY_CATEGORIES.some(cat => lowerRawCategory.includes(cat.toLowerCase()) && cat !== 'World News')) )) return 'World News';
    
    // India News
    if (lowerRawCategory.includes('india') || lowerRawCategory.includes('national')) return 'India News';
    if (lowerRawCategory.includes('delhi') || lowerRawCategory.includes('mumbai') || lowerRawCategory.includes('bengaluru') || lowerRawCategory.includes('kolkata') || lowerRawCategory.includes('chennai') || lowerRawCategory.includes('hyderabad') || lowerRawCategory.includes('pune')) return 'India News';
    
    // Life & Style
    if (lowerRawCategory.includes('life') || lowerRawCategory.includes('style') || lowerRawCategory.includes('fashion') || lowerRawCategory.includes('food') || lowerRawCategory.includes('travel') || lowerRawCategory.includes('wellness') || lowerRawCategory.includes('horoscope') || lowerRawCategory.includes('recipe')) return 'Life & Style';

    // Top News
    if (lowerRawCategory.includes('top stor') || lowerRawCategory.includes('latest news') || lowerRawCategory.includes('breaking news') || lowerRawCategory.includes('headlines')) return 'Top News';
    
    // If rawCategory is already one of the target categories (case-insensitive check)
    const matchedTargetCategory = TARGET_DISPLAY_CATEGORIES.find(tc => tc.toLowerCase() === lowerRawCategory);
    if (matchedTargetCategory) return matchedTargetCategory;

    return 'General'; // Default fallback
}


const NEWS_SOURCES: NewsSource[] = [
  { name: "TechCrunch", rssUrl: "https://techcrunch.com/feed/", defaultCategory: "Technology", fetchOgImageFallback: true },
  { name: "Reuters - Business", rssUrl: "https://feeds.reuters.com/reuters/businessNews", defaultCategory: "Business & Finance", fetchOgImageFallback: true },
  { name: "Live Science", rssUrl: "https://www.livescience.com/home/feed/site.xml", defaultCategory: "Science", fetchOgImageFallback: true },
  
  { name: "TOI - Top Stories", rssUrl: "https://timesofindia.indiatimes.com/rssfeedstopstories.cms", defaultCategory: "Top News", fetchOgImageFallback: true },
  { name: "TOI - India News", rssUrl: "https://timesofindia.indiatimes.com/rssfeeds/54829575.cms", defaultCategory: "India News", fetchOgImageFallback: true },
  { name: "HT - India", rssUrl: "https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml", defaultCategory: "India News", fetchOgImageFallback: true },
  { name: "Indian Express - India", rssUrl: "https://indianexpress.com/section/india/feed/", defaultCategory: "India News", fetchOgImageFallback: true },
  { name: "BBC News - India", rssUrl: "https://feeds.bbci.co.uk/news/world/asia/india/rss.xml", defaultCategory: "India News", fetchOgImageFallback: true },

  { name: "Livemint - News", rssUrl: "https://www.livemint.com/rss/news", defaultCategory: "Business & Finance", fetchOgImageFallback: true },
  { name: "Economic Times", rssUrl: "https://economictimes.indiatimes.com/rssfeedsdefault.cms", defaultCategory: "Business & Finance", fetchOgImageFallback: true },
  
  { name: "BBC World News", rssUrl: "http://feeds.bbci.co.uk/news/world/rss.xml", defaultCategory: "World News", fetchOgImageFallback: true },
  // Adding a few more for category variety as discussed previously
  { name: "TOI - World", rssUrl: "https://timesofindia.indiatimes.com/rssfeeds/296589292.cms", defaultCategory: "World News", fetchOgImageFallback: true },
  { name: "TOI - Entertainment", rssUrl: "https://timesofindia.indiatimes.com/rssfeeds/1081479906.cms", defaultCategory: "Entertainment", fetchOgImageFallback: true },
  { name: "TOI - Sports", rssUrl: "https://timesofindia.indiatimes.com/rssfeeds/4719148.cms", defaultCategory: "Sports", fetchOgImageFallback: true },
  { name: "TOI - Science", rssUrl: "https://timesofindia.indiatimes.com/rssfeeds/-2128672765.cms", defaultCategory: "Science", fetchOgImageFallback: true },
  { name: "TOI - Life & Style", rssUrl: "https://timesofindia.indiatimes.com/rssfeeds/2886704.cms", defaultCategory: "Life & Style", fetchOgImageFallback: true },
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
          if (ogImageUrl.startsWith('/')) {
              const urlObject = new URL(articleUrl);
              ogImageUrl = `${urlObject.protocol}//${urlObject.hostname}${ogImageUrl}`;
          }
          if (!ogImageUrl.startsWith('http://') && !ogImageUrl.startsWith('https://')) {
              return null; 
          }
          return ogImageUrl;
      }
      return null;
    } catch (error) {
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
        // Remove \uFFFD (garbage char) and other common control characters
        decodedText = decodedText.replace(/[\uFFFD\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); 
        return decodedText;
    } catch (e) {
        return text.trim().replace(/[\uFFFD\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    }
  }
  return '';
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
        .replace(/<p><a href="[^"]*">.*?read more.*?<\/a><\/p>/gi, '') 
        .replace(/<img[^>]*?>/gi, ''); 
  }

  const plainText = textToSummarize
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
  
  if (item['media:content']) {
    const mediaContents = Array.isArray(item['media:content']) ? item['media:content'] : [item['media:content']];
    for (const content of mediaContents) {
      if (content && content.url && (content.medium === 'image' || (String(getNestedValue(content, 'type', '')).startsWith('image/')) || (getNestedValue(content, 'type', '').includes('image')))) {
        imageUrl = content.url;
        break;
      }
    }
  }

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
  
  if (!imageUrl && item.enclosure && item.enclosure.url && item.enclosure.type && String(item.enclosure.type).startsWith('image/')) {
    imageUrl = item.enclosure.url;
  }

  if (!imageUrl && item['media:thumbnail'] && item['media:thumbnail'].url) {
    imageUrl = item['media:thumbnail'].url;
  }
 
  if (!imageUrl && item.image && item.image.url) {
    imageUrl = item.image.url;
  } else if (!imageUrl && item.image && typeof item.image === 'string' && item.image.startsWith('http')) {
    imageUrl = item.image;
  }
  
  const contentFieldsForImageSearch = [
    getNestedValue(item, 'content:encoded'), 
    getNestedValue(item, 'content'),
    getNestedValue(item, 'description'),
    getNestedValue(item, 'summary'), 
  ];

  for (const field of contentFieldsForImageSearch) {
    if (imageUrl) break;
    const normalizedField = normalizeContent(field); 
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
        if (srcCandidate && srcCandidate.startsWith('http')) { // Only accept absolute URLs
            imageUrl = srcCandidate;
            break;
        }
      }
    }
  }
  
  if (imageUrl && typeof imageUrl === 'string') {
    imageUrl = he.decode(imageUrl.trim());
    if (imageUrl.startsWith('//')) {
      return `https:${imageUrl}`;
    }
    if (imageUrl.startsWith('/')) {
        if (articleLink && articleLink.startsWith('http')) {
            try {
                const baseUrlObject = new URL(articleLink);
                return new URL(imageUrl, baseUrlObject.origin).href;
            } catch (e) { return null; }
        }
        return null; 
    }
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
        return null; 
    }
    return imageUrl;
  }
  return null; 
}

async function fetchAndParseRSS(source: NewsSource): Promise<Article[]> {
  try {
    const fetchResponse = await fetch(source.rssUrl, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36 NewsAggregator/1.0',
        'Accept': 'application/rss+xml,application/xml,application/atom+xml;q=0.9,text/xml;q=0.8,*/*;q=0.7' 
      },
      signal: AbortSignal.timeout(15000), 
      next: { revalidate: 300 } 
    });

    if (!fetchResponse.ok) {
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

    const processedItems: Article[] = [];

    for (const [index, item] of items.entries()) {
      const rawTitle = normalizeContent(getNestedValue(item, 'title', 'Untitled Article'));
      const title = rawTitle; 

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

      const pubDateSource = getNestedValue(item, 'pubDate') || getNestedValue(item, 'published') || getNestedValue(item, 'updated') || getNestedValue(item, 'dc:date');
      const date = pubDateSource ? new Date(normalizeContent(pubDateSource)).toISOString() : new Date().toISOString();

      let guidValue = getNestedValue(item, 'guid');
      if (typeof guidValue === 'object') {
          if (guidValue.isPermaLink === 'false' || guidValue.ispermalink === 'false') { 
              guidValue = originalLink !== '#' ? originalLink : (title + source.name + index); 
          } else {
              guidValue = normalizeContent(getNestedValue(guidValue, '_', getNestedValue(guidValue, '#text', originalLink)));
          }
      } else {
          guidValue = normalizeContent(guidValue || getNestedValue(item, 'id')); 
      }
      
      const idInput = (typeof guidValue === 'string' && guidValue.trim() !== '' && guidValue.trim() !== '#') ? guidValue : (originalLink !== "#" ? originalLink : (title + source.name + index) );
      const idSuffix = source.name.replace(/[^a-zA-Z0-9]/g, '').slice(0,10); 
      const idBase = idInput.length > 75 ? idInput.substring(0, 75) : idInput; 
      const id = slugify(idBase) + '-' + idSuffix;

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

      let imageUrl = extractImageUrl(item, title, finalCategory, source.name, originalLink);
      
      if (!imageUrl && source.fetchOgImageFallback && originalLink && originalLink !== '#') {
        try {
          const ogImage = await fetchOgImageFromUrl(originalLink);
          if (ogImage) imageUrl = ogImage;
        } catch (ogError) { /* error logged by fetchOgImageFromUrl if necessary */ }
      }
      
      let itemContent = normalizeContent(getNestedValue(item, 'content:encoded', getNestedValue(item, 'content', getNestedValue(item, 'description', getNestedValue(item, 'summary')))));
      const summaryText = normalizeSummary(getNestedValue(item, 'description', getNestedValue(item, 'summary')), itemContent, source.name);

      const internalArticleLink = `/${slugify(finalCategory)}/${id}`;

      if (title.includes('\uFFFD') || summaryText.includes('\uFFFD')) {
        continue;
      }
      const summaryLower = summaryText.toLowerCase();
      if (!summaryText || summaryLower.length < 15 || summaryLower === "no summary available." || summaryLower === "...") {
        continue;
      }


      processedItems.push({
        id,
        title,
        summary: summaryText, 
        date,
        source: source.name,
        category: finalCategory, // Use the mapped category
        imageUrl: imageUrl || null, 
        link: internalArticleLink, 
        sourceLink: originalLink, 
        content: itemContent || summaryText, 
      });
    }
    return processedItems.filter(article => article.title && article.title !== 'Untitled Article' && article.sourceLink && article.sourceLink !== '#');
  } catch (error) {
    return [];
  }
}

export async function fetchArticlesFromAllSources(): Promise<Article[]> {
  const allArticlesPromises = NEWS_SOURCES.map(source => fetchAndParseRSS(source));
  const results = await Promise.all(allArticlesPromises);

  let allArticles: Article[] = results.flat();
  
  // Filter out articles that STILL have garbage characters in title or summary after normalization
  allArticles = allArticles.filter(article => 
    !article.title.includes('\uFFFD') && 
    !article.summary.includes('\uFFFD')
  );
  
  // Filter out articles with insufficient summaries (already done in fetchAndParseRSS, but as a safeguard)
  allArticles = allArticles.filter(article => {
    const summaryLower = article.summary.toLowerCase();
    return summaryLower.length >= 15 && summaryLower !== "no summary available." && summaryLower !== "...";
  });


  const uniqueArticlesMap = new Map<string, Article>();
  for (const article of allArticles) {
    if (!article.title || !article.sourceLink || article.sourceLink === '#') {
        continue; 
    }

    let normalizedTitleKey = article.title.toLowerCase().replace(/\s+/g, ' ').substring(0, 80).trim();
    
    let normalizedLinkKey = article.sourceLink;
    try {
        const url = new URL(article.sourceLink);
        const paramsToRemove = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid', 'msclkid', 'mc_cid', 'mc_eid', 'rssfeed', 'source', 'medium', 'campaign', 'ref', 'oc', '_gl', 'ftcamp', 'ft_orig', 'assetType', 'variant', 'trc', 'trk', 'spot_im_highlight_immediate', 'spot_im_platform', 'spot_im_鑑定'];
        paramsToRemove.forEach(param => url.searchParams.delete(param));
        normalizedLinkKey = `${url.hostname}${url.pathname}${url.search}`.replace(/^www\./, '').replace(/\/$/, '').toLowerCase();
    } catch (e) { 
        normalizedLinkKey = article.sourceLink.toLowerCase().replace(/^www\./, '').replace(/\/$/, '').trim();
    }

    const uniqueKey = `${normalizedTitleKey}|${normalizedLinkKey}`;
    const existingArticle = uniqueArticlesMap.get(uniqueKey);

    if (!existingArticle) {
        uniqueArticlesMap.set(uniqueKey, article);
    } else {
        let keepNew = false;
        if (article.imageUrl && !existingArticle.imageUrl) {
            keepNew = true;
        } else if (!article.imageUrl && existingArticle.imageUrl) {
            // keep existing
        } else if (article.content && (!existingArticle.content || article.content.length > (existingArticle.content.length + 50))) { 
            keepNew = true;
        } else if (!article.content && existingArticle.content) {
           // keep existing
        } else if (article.category !== existingArticle.category && 
                   (article.category.toLowerCase() !== 'general' && !article.category.toLowerCase().includes('news') && !article.category.toLowerCase().includes('top stories')) &&
                   (existingArticle.category.toLowerCase() === 'general' || existingArticle.category.toLowerCase().includes('news') || existingArticle.category.toLowerCase().includes('top stories'))) {
            keepNew = true; 
        }
        
        if (keepNew) {
            uniqueArticlesMap.set(uniqueKey, article);
        }
    }
  }
  allArticles = Array.from(uniqueArticlesMap.values());

  allArticles.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return allArticles.slice(0, 150); 
}
    
