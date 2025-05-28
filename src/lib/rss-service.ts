
// @ts-nocheck
// Disabling TypeScript checks for this file due to the dynamic nature of RSS feed structures
// and the use of xml2js which can lead to complex type definitions.
'use server';

import { Parser } from 'xml2js';
import type { Article } from './placeholder-data';
import { slugify, getNestedValue, generateAiHintFromTitle } from './utils';
import he from 'he';
import iconv from 'iconv-lite';
import { load as cheerioLoad } from 'cheerio';

interface NewsSource {
  name: string;
  rssUrl: string;
  defaultCategory?: string;
  fetchOgImageFallback?: boolean; // New flag to control og:image fetching
}

const NEWS_SOURCES: NewsSource[] = [
  { name: "TechCrunch", rssUrl: "https://techcrunch.com/feed/", defaultCategory: "Technology", fetchOgImageFallback: true },
  { name: "Reuters - Business", rssUrl: "https://feeds.reuters.com/reuters/businessNews", defaultCategory: "Finance", fetchOgImageFallback: true },
  { name: "NDTV - Movies", rssUrl: "https://movies.ndtv.com/rss", defaultCategory: "Entertainment", fetchOgImageFallback: true },
  { name: "NDTV - Sports", rssUrl: "https://sports.ndtv.com/rss/all", defaultCategory: "Sports", fetchOgImageFallback: true },
  { name: "BBC - World News", rssUrl: "http://feeds.bbci.co.uk/news/world/rss.xml", defaultCategory: "World News", fetchOgImageFallback: true },
  { name: "Live Science", rssUrl: "https://www.livescience.com/home/feed/site.xml", defaultCategory: "Science", fetchOgImageFallback: true },
];

const parser = new Parser({ 
  explicitArray: false, 
  ignoreAttrs: false, 
  mergeAttrs: true, 
  trim: true // Added trim
});

async function fetchOgImageFromUrl(articleUrl: string): Promise<string | null> {
    if (!articleUrl || !articleUrl.startsWith('http')) {
      // console.warn(`[RSS Service] Invalid article URL for meta image fetching: ${articleUrl}`);
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
        // console.error(`[RSS Service] Failed to fetch HTML for meta image from ${articleUrl}: ${response.status}`);
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
              // console.warn(`[RSS Service] Invalid og:image URL scheme from meta: ${ogImageUrl}`);
              return null; // Invalid image URL scheme
          }
          return ogImageUrl;
      }
      return null;
    } catch (error) {
      // console.error(`[RSS Service] Error fetching/parsing HTML for meta image from ${articleUrl}:`, error.message || error);
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
        if (typeof contentInput[key] === 'string') {
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
        // Remove Unicode Replacement Character and common control characters
        decodedText = decodedText.replace(/[\uFFFD\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); 
        return decodedText;
    } catch (e) {
        // Fallback if he.decode fails, just return the trimmed and control-char-cleaned text
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
  
  if (sourceName && sourceName.toLowerCase().includes("reddit")) { // Kept for potential future re-addition of Reddit
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
    .replace(/<[^>]+>/g, ' ') 
    .replace(/\[link\]|\[comments\]/gi, '') 
    .replace(/&nbsp;/gi, ' ') 
    .replace(/\s+/g, ' ')    
    .trim();
    
  if (!plainText && fullContentText && fullContentText !== textToSummarize) { 
      const plainFullContent = fullContentText
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
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
  
  // 1. Try media:content (often highest quality)
  if (item['media:content']) {
    const mediaContents = Array.isArray(item['media:content']) ? item['media:content'] : [item['media:content']];
    for (const content of mediaContents) {
      if (content && content.url && (content.medium === 'image' || (String(getNestedValue(content, 'type', '')).startsWith('image/')) || (getNestedValue(content, 'type', '').includes('image')))) {
        imageUrl = content.url;
        break;
      }
    }
  }

  // 2. Try media:group -> media:content
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
  
  // 3. Try enclosure (common for podcasts but also images)
  if (!imageUrl && item.enclosure && item.enclosure.url && item.enclosure.type && String(item.enclosure.type).startsWith('image/')) {
    imageUrl = item.enclosure.url;
  }

  // 4. Try media:thumbnail
  if (!imageUrl && item['media:thumbnail'] && item['media:thumbnail'].url) {
    imageUrl = item['media:thumbnail'].url;
  }
   // 4.1. Try item.image (seen in some feeds like TechCrunch)
  if (!imageUrl && item.image && item.image.url) {
    imageUrl = item.image.url;
  } else if (!imageUrl && item.image && typeof item.image === 'string' && item.image.startsWith('http')) {
    imageUrl = item.image;
  }
  
  // 5. Try parsing from description or content fields (HTML img src)
  const descriptionForImageSearch = normalizeContent(getNestedValue(item, 'description'));
  if (!imageUrl && descriptionForImageSearch ) {
    const imgMatch = descriptionForImageSearch.match(/<img[^>]+src="([^">]+)"/);
    if (imgMatch && imgMatch[1]) {
        imageUrl = imgMatch[1];
    }
  }

  if (!imageUrl) {
    const contentFieldsToSearch = [
      getNestedValue(item, 'content:encoded'), 
      getNestedValue(item, 'content'),
      getNestedValue(item, 'content._'),
      // getNestedValue(item, 'summary'), // summary is often plain text, less likely to contain <img>
    ];
    for (const field of contentFieldsToSearch) {
      const normalizedField = normalizeContent(field); // Use normalizeContent which handles HTML structure better
      if (normalizedField && typeof normalizedField === 'string') {
        const imgMatch = normalizedField.match(/<img[^>]+src="([^">]+)"/);
        if (imgMatch && imgMatch[1]) {
          imageUrl = imgMatch[1];
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
            } catch (e) { /* console.warn(`[RSS Service] Could not construct absolute URL for relative image ${imageUrl} from base ${articleLink}`); */ return null; }
        }
        // console.warn(`[RSS Service] Skipping relative image URL without a valid base: ${imageUrl}`);
        return null; 
    }
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
        // console.warn(`[RSS Service] Skipping invalid image URL scheme: ${imageUrl}`);
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/rss+xml,application/xml,application/atom+xml;q=0.9,text/xml;q=0.8,*/*;q=0.7' 
      },
      signal: AbortSignal.timeout(15000), 
      next: { revalidate: 300 } 
    });

    if (!fetchResponse.ok) {
      // console.error(`[RSS Service] Failed to fetch RSS from ${source.name} (${source.rssUrl}): ${fetchResponse.status} ${fetchResponse.statusText}`);
      return [];
    }

    const arrayBuffer = await fetchResponse.arrayBuffer();
    const rawDataBuffer = Buffer.from(arrayBuffer);
    
    let feedXmlString: string;
    let utf8Decoded = iconv.decode(rawDataBuffer, 'utf-8', { stripBOM: true });
    const utf8ReplacementCharCount = (utf8Decoded.match(/\uFFFD/g) || []).length;

    if (utf8ReplacementCharCount > 0 && (utf8ReplacementCharCount > 5 || utf8ReplacementCharCount / (utf8Decoded.length || 1) > 0.01)) {
      // console.warn(`[RSS Service] UTF-8 decoding for ${source.name} resulted in ${utf8ReplacementCharCount} replacement characters. Trying Windows-1252.`);
      feedXmlString = iconv.decode(rawDataBuffer, 'windows-1252', { stripBOM: true });
    } else {
      feedXmlString = utf8Decoded;
    }
    
    feedXmlString = feedXmlString.replace(/[\uFFFD\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');


    const result = await parser.parseStringPromise(feedXmlString);

    let items = getNestedValue(result, 'rss.channel.item', []);
    if (!items || (Array.isArray(items) && items.length === 0)) { // Atom feeds
      items = getNestedValue(result, 'feed.entry', []); 
    }
     if (!items || (Array.isArray(items) && items.length === 0)) { // RDF feeds
      items = getNestedValue(result, 'rdf:RDF.item', []); 
    }

    if (!Array.isArray(items)) {
      items = items ? [items] : []; 
    }

    if (items.length === 0) {
      // console.warn(`[RSS Service] No items found in RSS feed for ${source.name} (${source.rssUrl}) after parsing.`);
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

      let categoryFromFeed = getNestedValue(item, 'category', source.defaultCategory || 'General');
      if (Array.isArray(categoryFromFeed)) {
          categoryFromFeed = categoryFromFeed.map(cat => {
            if (typeof cat === 'object') return cat.term || cat._ || cat['#text'] || cat.label || cat.name || cat.$; 
            return cat;
          }).filter(Boolean).join(', ') || source.defaultCategory || 'General';
      } else if (typeof categoryFromFeed === 'object') {
          categoryFromFeed = categoryFromFeed.term || categoryFromFeed._ || categoryFromFeed['#text'] || categoryFromFeed.label || categoryFromFeed.name || categoryFromFeed.$;
      }
      const finalCategory = typeof categoryFromFeed === 'string' ? he.decode(categoryFromFeed.trim().split(',')[0].trim()) : (source.defaultCategory || 'General');

      let imageUrl = extractImageUrl(item, title, finalCategory, source.name, originalLink);
      
      if (!imageUrl && source.fetchOgImageFallback && originalLink && originalLink !== '#') {
        try {
          // console.log(`[RSS Service] Feed item "${title}" from ${source.name} missing image, attempting og:image fetch from ${originalLink}`);
          const ogImage = await fetchOgImageFromUrl(originalLink);
          if (ogImage) imageUrl = ogImage;
        } catch (ogError) { /* error already logged by fetchOgImageFromUrl */ }
      }
      
      let itemContent = normalizeContent(getNestedValue(item, 'content:encoded', getNestedValue(item, 'content', getNestedValue(item, 'description', getNestedValue(item, 'summary')))));
      const summaryText = normalizeSummary(getNestedValue(item, 'description', getNestedValue(item, 'summary')), itemContent, source.name);

      const internalArticleLink = `/${slugify(finalCategory)}/${id}`;

      // Final check for garbage characters in critical fields
      if (title.includes('\uFFFD') || summaryText.includes('\uFFFD')) {
        // console.warn(`[RSS Service] Skipping article due to persistent garbage characters after all cleaning: "${title}" from ${source.name}`);
        continue;
      }
      // Filter out articles with insufficient summaries or placeholder text
      if (!summaryText || summaryText.length < 20 || summaryText.toLowerCase() === "no summary available." || summaryText.toLowerCase() === "...") {
        // console.warn(`[RSS Service] Skipping article with insufficient summary: "${title}" from ${source.name}`);
        continue;
      }


      processedItems.push({
        id,
        title,
        summary: summaryText, 
        date,
        source: source.name,
        category: finalCategory,
        imageUrl: imageUrl, 
        link: internalArticleLink, 
        sourceLink: originalLink, 
        content: itemContent || summaryText, 
      });
    }
    return processedItems.filter(article => article.title && article.title !== 'Untitled Article' && article.sourceLink && article.sourceLink !== '#');
  } catch (error) {
    // console.error(`[RSS Service] Error processing RSS feed for ${source.name} (${source.rssUrl}):`, error);
    return [];
  }
}

export async function fetchArticlesFromAllSources(): Promise<Article[]> {
  const allArticlesPromises = NEWS_SOURCES.map(source => fetchAndParseRSS(source));
  const results = await Promise.all(allArticlesPromises);

  let allArticles: Article[] = results.flat();
  
  // De-duplication logic
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
                   (article.category.toLowerCase() !== 'general' && !article.category.toLowerCase().includes('news')) &&
                   (existingArticle.category.toLowerCase() === 'general' || existingArticle.category.toLowerCase().includes('news'))) {
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

    