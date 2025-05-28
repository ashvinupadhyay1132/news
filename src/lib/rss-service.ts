
// @ts-nocheck
// Disabling TypeScript checks for this file due to the dynamic nature of RSS feed structures
// and the use of xml2js which can lead to complex type definitions.
'use server';

import { Parser } from 'xml2js';
import type { Article } from './placeholder-data';
import { slugify, generateAiHintFromTitle, getNestedValue } from './utils';
import he from 'he';
import iconv from 'iconv-lite';
import { load as cheerioLoad } from 'cheerio';


interface NewsSource {
  name: string;
  rssUrl: string;
  defaultCategory?: string;
}

const NEWS_SOURCES: NewsSource[] = [
  // Mint (India) - Various categories
  { name: "Mint - Latest News", rssUrl: "https://www.livemint.com/rss/latestnews", defaultCategory: "India News" },
  { name: "Mint - Companies", rssUrl: "https://www.livemint.com/rss/companies", defaultCategory: "Business" },
  { name: "Mint - Money", rssUrl: "https://www.livemint.com/rss/money", defaultCategory: "Finance" },
  { name: "Mint - Opinion", rssUrl: "https://www.livemint.com/rss/opinion", defaultCategory: "Opinion" },
  { name: "Mint - Politics", rssUrl: "https://www.livemint.com/rss/politics", defaultCategory: "Politics"},

  // Hindustan Times (India) - Various categories
  { name: "Hindustan Times - Top News", rssUrl: "https://www.hindustantimes.com/rss/topnews/rssfeed.xml", defaultCategory: "Top News" },
  { name: "Hindustan Times - Main News", rssUrl: "https://www.hindustantimes.com/rss/news", defaultCategory: "India News" },
  { name: "Hindustan Times - Business", rssUrl: "https://www.hindustantimes.com/business/rss/feed", defaultCategory: "Business" },
  { name: "Hindustan Times - Tech (HT Tech)", rssUrl: "https://tech.hindustantimes.com/rss/tech/rssfeed.xml", defaultCategory: "Technology" },
  { name: "Hindustan Times - Entertainment", rssUrl: "https://www.hindustantimes.com/rss/entertainment/rssfeed.xml", defaultCategory: "Entertainment" },
  { name: "Hindustan Times - Sports", rssUrl: "https://www.hindustantimes.com/rss/sports/rssfeed.xml", defaultCategory: "Sports" },
  { name: "Hindustan Times - Auto", rssUrl: "https://auto.hindustantimes.com/rss/rssfeed.xml", defaultCategory: "Auto" },
  
  // Times of India
  { name: "Times of India - Top Stories", rssUrl: "https://timesofindia.indiatimes.com/rssfeedstopstories.cms", defaultCategory: "India News" },
  { name: "Times of India - Business", rssUrl: "https://timesofindia.indiatimes.com/rssfeeds/1898055.cms", defaultCategory: "Business"},
  { name: "Times of India - Tech", rssUrl: "https://timesofindia.indiatimes.com/rssfeeds/5880659.cms", defaultCategory: "Technology"},
  
  // RSSHub proxied BBC News
  { name: "BBC - All World News (RSSHub)", rssUrl: "https://rsshub.app/bbc/world", defaultCategory: "World News" },
  { name: "BBC - News Front Page (RSSHub)", rssUrl: "https://rsshub.app/bbc/index", defaultCategory: "Top Stories" },
  { name: "BBC - Business (RSSHub)", rssUrl: "https://rsshub.app/bbc/business", defaultCategory: "Business" },
  { name: "BBC - Entertainment & Arts (RSSHub)", rssUrl: "https://rsshub.app/bbc/entertainment_and_arts", defaultCategory: "Entertainment" },
  { name: "BBC - Science & Environment (RSSHub)", rssUrl: "https://rsshub.app/bbc/science_and_environment", defaultCategory: "Science" },
  { name: "BBC - Technology (RSSHub)", rssUrl: "https://rsshub.app/bbc/technology", defaultCategory: "Technology" },
];


const parser = new Parser({ explicitArray: false, ignoreAttrs: false, mergeAttrs: true });

async function fetchOgImageFromUrl(articleUrl: string): Promise<string | null> {
  if (!articleUrl || !articleUrl.startsWith('http')) {
    // console.warn(`Invalid article URL for meta image fetching: ${articleUrl}`);
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
      // console.error(`Failed to fetch HTML for meta image from ${articleUrl}: ${response.status}`);
      return null;
    }

    const htmlContent = await response.text();
    const $ = cheerioLoad(htmlContent);

    let ogImageUrl = 
        $('meta[property="og:image"]').attr('content') ||
        $('meta[name="og:image"]').attr('content') ||
        $('meta[property="twitter:image"]').attr('content') ||
        $('meta[name="twitter:image"]').attr('content');
    
    if (ogImageUrl && ogImageUrl.startsWith('/')) {
        const urlObject = new URL(articleUrl);
        ogImageUrl = `${urlObject.protocol}//${urlObject.hostname}${ogImageUrl}`;
    }
    return he.decode(ogImageUrl || null);
  } catch (error) {
    // console.error(`Error fetching or parsing HTML for meta image from ${articleUrl}:`, error.message || error);
    return null;
  }
}


function extractImageUrl(item: any, articleTitle: string, articleCategory?: string): string | null {
  let imageUrl = null;
  
  if (item['media:content']) {
    const mediaContents = Array.isArray(item['media:content']) ? item['media:content'] : [item['media:content']];
    for (const content of mediaContents) {
      if (content && content.url && (content.medium === 'image' || (String(content.type).startsWith('image/')) || (content.type && String(content.type).includes('image')))) {
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
      if (content && content.url && (content.medium === 'image' || (content.type && String(content.type).startsWith('image/')))) {
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
  
  if (!imageUrl && (getNestedValue(item, 'source._', '').includes("Times of India") || getNestedValue(item, 'source._', '').includes("Hindustan Times")) ) {
    const description = normalizeContent(getNestedValue(item, 'description'));
    if (description) {
        const imgMatch = description.match(/<img[^>]+src="([^">]+)"/);
        if (imgMatch && imgMatch[1]) {
            imageUrl = imgMatch[1];
        }
    }
  }

  if (!imageUrl) {
    const contentFieldsToSearch = [
      getNestedValue(item, 'content:encoded'), 
      getNestedValue(item, 'description'),
      getNestedValue(item, 'content'),
      getNestedValue(item, 'content._'),
      getNestedValue(item, 'summary'), 
    ];
    for (const field of contentFieldsToSearch) {
      const normalizedField = normalizeContent(field); 
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
        const baseLink = getNestedValue(item, 'link');
        if (baseLink && typeof baseLink === 'string' && baseLink.startsWith('http')) {
            try {
                const baseUrlObject = new URL(baseLink);
                return new URL(imageUrl, baseUrlObject.origin).href;
            } catch (e) {
                return null; 
            }
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
    const encodedContent = getNestedValue(contentInput, 'content:encoded');
    if (typeof encodedContent === 'string' && encodedContent.trim() !== '') {
        text = encodedContent;
    } else if (encodedContent && typeof encodedContent._ === 'string' && encodedContent._.trim() !== '') {
        text = encodedContent._;
    } else {
        const potentialValues = [
        getNestedValue(contentInput, 'content'),
        getNestedValue(contentInput, 'description'),
        getNestedValue(contentInput, 'summary'),
        ];
        for (const val of potentialValues) {
        if (typeof val === 'string' && val.trim() !== '') {
            text = val;
            break;
        } else if (val && typeof val._ === 'string' && val._.trim() !== '') {
            text = val._;
            break;
        }
        }
    }
  }
  
  if (text) {
    // Decode HTML entities first
    text = he.decode(text.trim());
    // Then, remove any Unicode Replacement Characters () that might have resulted from earlier decoding issues or were in the source
    text = text.replace(/\uFFFD/g, ''); 
  }
  return text || '';
}

function normalizeSummary(descriptionInput: any, fullContentInput?: any, sourceName?: string): string {
  let textToSummarize = '';
  let descriptionText = normalizeContent(descriptionInput); 
  const fullContentText = normalizeContent(fullContentInput); 

  if (sourceName && sourceName.toLowerCase().includes("reddit")) {
    descriptionText = descriptionText
        .replace(/<p>submitted by.*?<\/p>/gi, '') 
        .replace(/<a href="[^"]*">\[comments\]<\/a>/gi, '') 
        .replace(/<a href="[^"]*">\[link\]<\/a>/gi, '')    
        .replace(/<a[^>]*?>\[\d+ comments?\]<\/a>/gi, '') 
        .replace(/<p><a href="[^"]*">.*?read more.*?<\/a><\/p>/gi, '') 
        .replace(/<img[^>]*?>/gi, '');              
  }

  if (fullContentText && fullContentText.length > (descriptionText?.length || 0) + 50) { 
    textToSummarize = fullContentText;
  } else if (descriptionText) {
    textToSummarize = descriptionText;
  } else if (fullContentText) { 
    textToSummarize = fullContentText;
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


async function fetchAndParseRSS(source: NewsSource): Promise<Article[]> {
  try {
    const fetchResponse = await fetch(source.rssUrl, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/rss+xml,application/xml,application/atom+xml;q=0.9,text/xml;q=0.8,*/*;q=0.7' 
      },
      next: { revalidate: 300 } // 5 minutes
    });

    if (!fetchResponse.ok) {
      // console.error(`Failed to fetch RSS from ${source.name} (${source.rssUrl}): ${fetchResponse.status} ${fetchResponse.statusText}`);
      return [];
    }

    const arrayBuffer = await fetchResponse.arrayBuffer();
    const rawDataBuffer = Buffer.from(arrayBuffer);
    
    let feedXmlString: string;

    // Attempt 1: Decode as UTF-8
    const utf8Decoded = iconv.decode(rawDataBuffer, 'utf-8', { stripBOM: true });
    const utf8ReplacementCharCount = (utf8Decoded.match(/\uFFFD/g) || []).length;

    // Attempt 2: Decode as Windows-1252 (if UTF-8 seems problematic)
    if (utf8ReplacementCharCount > 0 && (utf8ReplacementCharCount > 2 || utf8ReplacementCharCount / utf8Decoded.length > 0.005)) { // Adjusted threshold
      // console.warn(`UTF-8 decoding for ${source.name} resulted in ${utf8ReplacementCharCount} replacement characters. Trying Windows-1252.`);
      feedXmlString = iconv.decode(rawDataBuffer, 'windows-1252', { stripBOM: true });
    } else {
      feedXmlString = utf8Decoded;
    }

    // Final cleanup of the XML string before parsing:
    // 1. Remove common control characters (excluding tab, LF, CR).
    feedXmlString = feedXmlString.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    // 2. Explicitly remove any remaining U+FFFD () characters.
    feedXmlString = feedXmlString.replace(/\uFFFD/g, '');


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
      // console.warn(`No items found in RSS feed for ${source.name} (${source.rssUrl}) after parsing.`);
      return [];
    }

    const processedItems: Article[] = [];

    for (const [index, item] of items.entries()) {
      const rawTitle = normalizeContent(getNestedValue(item, 'title', 'Untitled Article'));
      const title = rawTitle; 

      let originalLink = '#';
      const linkField = getNestedValue(item, 'link');

      if (typeof linkField === 'string') {
        originalLink = linkField;
      } else if (typeof linkField === 'object' && linkField?.href) { 
        originalLink = linkField.href;
      } else if (typeof linkField === 'object' && !linkField?.href && linkField?._) { 
        originalLink = linkField._;
      } else if (Array.isArray(linkField)) { 
        const alternateLink = linkField.find(l => typeof l === 'object' && l.rel === 'alternate' && l.href);
        originalLink = alternateLink ? alternateLink.href : ( (typeof linkField[0] === 'object' && linkField[0]?.href) || (typeof linkField[0] === 'string' ? linkField[0] : '#') );
      }
      
      if (source.name.toLowerCase().includes("reddit") && item.content && (item.content._ || typeof item.content === 'string')) {
          const contentStr = item.content._ || item.content;
          const linkMatch = String(contentStr).match(/<a href="([^"]+)">\[link\]<\/a>/);
          if (linkMatch && linkMatch[1]) originalLink = linkMatch[1];
      }
      originalLink = typeof originalLink === 'string' ? he.decode(originalLink.trim()) : '#'; 
      
      if (originalLink === '#' && item.guid && typeof item.guid === 'string' && (item.guid.startsWith('http') || (typeof item.guid === 'object' && item.guid.isPermaLink !== 'false'))) {
        originalLink = he.decode(typeof item.guid === 'object' ? item.guid._ : item.guid);
      }
      if (originalLink === '#' && item.id && typeof item.id === 'string' && item.id.startsWith('http')) {
        originalLink = he.decode(item.id); 
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

      let imageUrl = extractImageUrl(item, title, finalCategory);
      
      if (!imageUrl && source.name.toLowerCase().includes("mint") && originalLink && originalLink !== '#') {
        // console.log(`Mint article "${title}" missing image from feed. Attempting og:image fetch...`);
        try {
          const ogImage = await fetchOgImageFromUrl(originalLink);
          if (ogImage) {
            imageUrl = ogImage;
            // console.log(`Successfully fetched og:image for Mint article: ${title}`);
          } else {
            // console.log(`No og:image found for Mint article: ${title}`);
          }
        } catch (ogError) {
          // console.error(`Error fetching og:image for ${title}:`, ogError);
        }
      }
      
      let itemContent = normalizeContent(getNestedValue(item, 'content:encoded', getNestedValue(item, 'content', getNestedValue(item, 'description', getNestedValue(item, 'summary')))));
      if (source.name.toLowerCase().includes("reddit")) {
          const redditDescription = normalizeContent(getNestedValue(item, 'description'));
          if (redditDescription && (!itemContent || itemContent.length < redditDescription.length + 20)) {
              itemContent = redditDescription;
          }
      }
      const summaryText = normalizeSummary(getNestedValue(item, 'description', getNestedValue(item, 'summary')), itemContent, source.name);

      const internalArticleLink = `/${slugify(finalCategory)}/${id}`;

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
    return processedItems.filter(article => article.title && article.title !== 'Untitled Article' && !article.title.includes("reddit.com Store") && article.sourceLink && article.sourceLink !== '#');
  } catch (error) {
    // console.error(`Error processing RSS feed for ${source.name} (${source.rssUrl}):`, error);
    return [];
  }
}

export async function fetchArticlesFromAllSources(): Promise<Article[]> {
  const allArticlesPromises = NEWS_SOURCES.map(source => fetchAndParseRSS(source));
  const results = await Promise.all(allArticlesPromises);

  let allArticles: Article[] = results.flat();

  // Filter out articles with empty or insufficient summaries
  allArticles = allArticles.filter(article => {
    const summaryText = article.summary ? article.summary.trim() : "";
    return summaryText.length >= 25 && 
           summaryText.toLowerCase() !== "no summary available." &&
           summaryText.toLowerCase() !== "..." &&
           !summaryText.toLowerCase().includes("submitted by"); 
  });
  
  // De-duplicate articles
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
                   (article.category.toLowerCase() !== 'general' && article.category.toLowerCase() !== 'top news' && article.category.toLowerCase() !== 'world news') &&
                   (existingArticle.category.toLowerCase() === 'general' || existingArticle.category.toLowerCase() === 'top news' || existingArticle.category.toLowerCase() === 'world news')) {
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
