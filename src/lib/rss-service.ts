
// @ts-nocheck
// Disabling TypeScript checks for this file due to the dynamic nature of RSS feed structures
// and the use of xml2js which can lead to complex type definitions.
'use server';

import { Parser } from 'xml2js';
import type { Article } from './placeholder-data';
import { slugify, getNestedValue, generateAiHintFromTitle } from './utils';

interface NewsSource {
  name: string;
  rssUrl: string;
  defaultCategory?: string;
}

// Curated list based on recent request
const NEWS_SOURCES: NewsSource[] = [
  // Mint
  { name: "Mint - Latest News", rssUrl: "https://www.livemint.com/rss/latestnews", defaultCategory: "India News" },
  { name: "Mint - Companies", rssUrl: "https://www.livemint.com/rss/companies", defaultCategory: "Business" },
  { name: "Mint - Technology", rssUrl: "https://www.livemint.com/rss/technology", defaultCategory: "Technology" },
  // Hindustan Times
  { name: "Hindustan Times - Top News", rssUrl: "https://www.hindustantimes.com/rss/topnews/rssfeed.xml", defaultCategory: "India News" },
  { name: "Hindustan Times - Tech", rssUrl: "https://tech.hindustantimes.com/rss", defaultCategory: "Technology" },
  // Times of India
  { name: "Times of India - Top Stories", rssUrl: "https://timesofindia.indiatimes.com/rssfeedstopstories.cms", defaultCategory: "India News" },
  // BBC
  { name: "BBC - World News", rssUrl: "http://feeds.bbci.co.uk/news/world/rss.xml", defaultCategory: "World News" },
  { name: "BBC - Technology", rssUrl: "http://feeds.bbci.co.uk/news/technology/rss.xml", defaultCategory: "Technology" },
  { name: "BBC - Business", rssUrl: "http://feeds.bbci.co.uk/news/business/rss.xml", defaultCategory: "Business" },
];


const parser = new Parser({ explicitArray: false, ignoreAttrs: false, mergeAttrs: true });

function extractImageUrl(item: any, articleTitle: string, articleCategory?: string): string | null {
  let imageUrl = null;

  // Priority 1: media:group containing media:content (often high quality)
  if (item['media:group'] && item['media:group']['media:content']) {
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
  
  // Priority 2: Direct media:content (common in many feeds like Mint, BBC)
  if (!imageUrl && item['media:content']) {
    const mediaContents = Array.isArray(item['media:content']) ? item['media:content'] : [item['media:content']];
    for (const content of mediaContents) {
      if (content && content.url && (content.medium === 'image' || (String(content.type).startsWith('image/')))) {
        imageUrl = content.url;
        break;
      }
    }
  }
  
  // Priority 3: Enclosure (standard RSS way for media)
  if (!imageUrl && item.enclosure && item.enclosure.url && item.enclosure.type && String(item.enclosure.type).startsWith('image/')) {
    imageUrl = item.enclosure.url;
  }

  // Priority 4: media:thumbnail
  if (!imageUrl && item['media:thumbnail'] && item['media:thumbnail'].url) {
    imageUrl = item['media:thumbnail'].url;
  }
  
  // Priority 5: For specific Indian news sites - often in description as img src
  if (!imageUrl && (item.source?.includes("Times of India") || item.source?.includes("Hindustan Times")) ) {
    const description = normalizeContent(getNestedValue(item, 'description'));
    if (description) {
        const imgMatch = description.match(/<img[^>]+src="([^">]+)"/);
        if (imgMatch && imgMatch[1]) {
            imageUrl = imgMatch[1];
        }
    }
  }

  // Last Resort: Look for image in HTML content (description or content field)
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
    imageUrl = imageUrl.trim();
    if (imageUrl.startsWith('//')) {
      return `https:${imageUrl}`;
    }
    if (imageUrl.startsWith('/')) {
        const baseLink = getNestedValue(item, 'link');
        if (baseLink && typeof baseLink === 'string' && baseLink.startsWith('http')) {
            try {
                const baseUrl = new URL(baseLink);
                return new URL(imageUrl, baseUrl.origin).href;
            } catch (e) {
                // console.warn("Error constructing absolute URL for relative image path:", imageUrl, e);
                return null;
            }
        }
        return null; 
    }
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
        // console.warn("Image URL does not start with http/https:", imageUrl);
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
    // Attempt to extract from common object structures if direct string properties fail
    text = String(getNestedValue(contentInput, 'content', getNestedValue(contentInput, 'description', getNestedValue(contentInput, '$t', ''))));
  }
  return text.trim();
}

function normalizeSummary(descriptionInput: any, fullContentInput?: any): string {
  let textToSummarize = '';
  const descriptionText = normalizeContent(descriptionInput);
  const fullContentText = normalizeContent(fullContentInput);

  // Prefer full content if it's substantially longer or description is short/missing
  if (fullContentText && fullContentText.length > (descriptionText?.length || 0) + 100) { 
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
    
  // If initial plainText is empty, but fullContentText had something different (e.g., only HTML)
  if (!plainText && fullContentText && fullContentText !== textToSummarize) { 
      const plainFullContent = fullContentText
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\[link\]|\[comments\]/gi, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return plainFullContent.substring(0, 250) + (plainFullContent.length > 250 ? '...' : '');
  }
  if (plainText.length === 0) return "No summary available.";
  return plainText.substring(0, 250) + (plainText.length > 250 ? '...' : '');
}


async function fetchAndParseRSS(source: NewsSource): Promise<Article[]> {
  try {
    const response = await fetch(source.rssUrl, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/rss+xml,application/xml,text/xml;q=0.9,*/*;q=0.8' 
      },
      next: { revalidate: 300 } // Revalidate every 5 minutes
    });

    if (!response.ok) {
      console.error(`Failed to fetch RSS from ${source.name} (${source.rssUrl}): ${response.status} ${response.statusText}`);
      return [];
    }
    const xmlText = await response.text();
    const result = await parser.parseStringPromise(xmlText);

    let items = getNestedValue(result, 'rss.channel.item', []);
    if (!items || (Array.isArray(items) && items.length === 0)) {
      items = getNestedValue(result, 'feed.entry', []); // For Atom feeds
    }
     if (!items || (Array.isArray(items) && items.length === 0)) { // For RDF feeds
      items = getNestedValue(result, 'rdf:RDF.item', []); 
    }


    if (!Array.isArray(items)) {
      items = items ? [items] : []; // Ensure items is an array
    }

    if (items.length === 0) {
      // console.warn(`No items found in RSS feed for ${source.name} (${source.rssUrl})`);
      return [];
    }

    return items.map((item: any, index: number) => {
      const title = normalizeContent(getNestedValue(item, 'title', 'Untitled Article'));

      let originalLink = '#';
      const linkField = getNestedValue(item, 'link');

      if (typeof linkField === 'string') {
        originalLink = linkField;
      } else if (typeof linkField === 'object' && linkField?.href) { // Atom feeds often use <link href="..."/>
        originalLink = linkField.href;
      } else if (typeof linkField === 'object' && !linkField?.href && linkField?._) { // Handle cases where link is like { _: "url" }
        originalLink = linkField._;
      } else if (Array.isArray(linkField)) { // Handle multiple link tags (e.g., in Atom)
        const alternateLink = linkField.find(l => typeof l === 'object' && l.rel === 'alternate' && l.href);
        originalLink = alternateLink ? alternateLink.href : ( (typeof linkField[0] === 'object' && linkField[0]?.href) || (typeof linkField[0] === 'string' ? linkField[0] : '#') );
      }
      
      // Special handling for Reddit links if they are embedded in content
      if (source.name.includes("Reddit") && item.content && (item.content._ || typeof item.content === 'string')) {
          const contentStr = item.content._ || item.content;
          const linkMatch = String(contentStr).match(/<a href="([^"]+)">\[link\]<\/a>/);
          if (linkMatch && linkMatch[1]) originalLink = linkMatch[1];
      }
      originalLink = typeof originalLink === 'string' ? originalLink.trim() : '#';
      
      // Fallback to item.id if originalLink is still '#' and id is a valid URL
      if (originalLink === '#' && item.id && typeof item.id === 'string' && item.id.startsWith('http')) {
        originalLink = item.id;
      }


      const pubDateSource = getNestedValue(item, 'pubDate') || getNestedValue(item, 'published') || getNestedValue(item, 'updated') || getNestedValue(item, 'dc:date');
      const date = pubDateSource ? new Date(normalizeContent(pubDateSource)).toISOString() : new Date().toISOString();

      let guidValue = getNestedValue(item, 'guid');
      if (typeof guidValue === 'object') {
          // Check for isPermaLink attribute, common in RSS
          if (guidValue.isPermaLink === 'false' || guidValue.ispermalink === 'false') { 
              guidValue = originalLink; // If not a permalink, use the original link as GUID
          } else {
              // Otherwise, try to get the text content of the guid
              guidValue = normalizeContent(getNestedValue(guidValue, '_', getNestedValue(guidValue, '#text', originalLink)));
          }
      } else {
          // If guid is a string or not present, fall back to item.id (common in Atom) or originalLink
          guidValue = normalizeContent(guidValue || getNestedValue(item, 'id'));
      }
      
      const idInput = (typeof guidValue === 'string' && guidValue.trim() !== '' && guidValue.trim() !== '#') ? guidValue : (originalLink + source.name + index);
      const idSuffix = source.name.replace(/[^a-zA-Z0-9]/g, '').slice(0,10); // Short, alphanumeric suffix from source name
      // Ensure idBase is not overly long and slugify it
      const idBase = idInput.length > 75 ? idInput.substring(0, 75) : idInput;
      const id = slugify(idBase) + '-' + idSuffix;


      // Category extraction
      let categoryFromFeed = getNestedValue(item, 'category', source.defaultCategory || 'General');
      if (Array.isArray(categoryFromFeed)) {
          // If category is an array, map through it. Handle objects with 'term' (Atom) or string categories.
          categoryFromFeed = categoryFromFeed.map(cat => {
            if (typeof cat === 'object') return cat.term || cat._ || cat['#text'] || cat.label || cat.name || cat.$; // Atom uses 'term', also check common alternatives
            return cat;
          }).filter(Boolean).join(', ') || source.defaultCategory || 'General';
      } else if (typeof categoryFromFeed === 'object') {
          // If category is an object, extract 'term' (Atom), or other common properties.
          categoryFromFeed = categoryFromFeed.term || categoryFromFeed._ || categoryFromFeed['#text'] || categoryFromFeed.label || categoryFromFeed.name || categoryFromFeed.$;
      }
      const finalCategory = typeof categoryFromFeed === 'string' ? categoryFromFeed.trim().split(',')[0].trim() : (source.defaultCategory || 'General');

      const imageUrl = extractImageUrl(item, title, finalCategory);
      
      // Full content is often in 'content:encoded', fallback to 'content', then 'description'/'summary'
      const rawContent = normalizeContent(getNestedValue(item, 'content:encoded', getNestedValue(item, 'content', getNestedValue(item, 'description', getNestedValue(item, 'summary')))));
      const summaryText = normalizeSummary(getNestedValue(item, 'description', getNestedValue(item, 'summary')), rawContent);


      const internalArticleLink = `/${slugify(finalCategory)}/${id}`;

      return {
        id,
        title,
        summary: summaryText, // This can be "No summary available." if nothing better is found
        date,
        source: source.name,
        category: finalCategory,
        imageUrl: imageUrl,
        link: internalArticleLink,
        sourceLink: originalLink,
        content: rawContent || summaryText, // Provide raw content if available, else summary
      };
    }).filter(article => article.title && article.title !== 'Untitled Article' && !article.title.includes("reddit.com Store") && article.sourceLink && article.sourceLink !== '#');
  } catch (error) {
    console.error(`Error processing RSS feed for ${source.name} (${source.rssUrl}):`, error);
    return [];
  }
}

export async function fetchArticlesFromAllSources(): Promise<Article[]> {
  const allArticlesPromises = NEWS_SOURCES.map(source => fetchAndParseRSS(source));
  const results = await Promise.all(allArticlesPromises);

  let allArticles: Article[] = results.flat();

  // Filter out articles with empty or uninformative summaries
  allArticles = allArticles.filter(article => {
    const summaryText = article.summary ? article.summary.trim() : "";
    return summaryText.length > 25 && // Ensure summary has meaningful content (e.g., > 25 chars)
           summaryText.toLowerCase() !== "no summary available." &&
           summaryText !== "..."; // Check for common "empty" placeholder from normalizeSummary
  });
  
  // De-duplicate articles based on a composite key of title and source link
  const uniqueArticlesMap = new Map<string, Article>();
  for (const article of allArticles) {
    // Normalize title and link for more robust de-duplication
    let normalizedTitleKey = article.title.toLowerCase().replace(/\s+/g, ' ').substring(0, 80).trim();
    
    let normalizedLinkKey = article.sourceLink;
    try {
      const url = new URL(article.sourceLink);
      // Use hostname + pathname, remove www, remove trailing slash, lowercase
      normalizedLinkKey = `${url.hostname}${url.pathname}`.replace(/^www\./, '').replace(/\/$/, '').toLowerCase();
    } catch (e) { /* if not a valid URL, use as is, though unlikely at this stage */ }

    const uniqueKey = `${normalizedTitleKey}|${normalizedLinkKey}`;
    
    const existingArticle = uniqueArticlesMap.get(uniqueKey);
    // Prefer articles with more content or an image if a duplicate is found
    if (!existingArticle || 
        (article.content && existingArticle.content && (article.content.length > existingArticle.content.length)) || 
        (article.imageUrl && !existingArticle.imageUrl)) { 
      uniqueArticlesMap.set(uniqueKey, article);
    }
  }
  allArticles = Array.from(uniqueArticlesMap.values());

  // Sort by date, newest first
  allArticles.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return allArticles.slice(0, 100); // Limit to the latest 100 unique articles
}
