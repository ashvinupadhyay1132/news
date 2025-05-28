
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

const NEWS_SOURCES: NewsSource[] = [
  // Mint (India)
  { name: "Mint - Latest News", rssUrl: "https://www.livemint.com/rss/latestnews", defaultCategory: "India News" },
  { name: "Mint - Companies", rssUrl: "https://www.livemint.com/rss/companies", defaultCategory: "Business" },
  { name: "Mint - Money", rssUrl: "https://www.livemint.com/rss/money", defaultCategory: "Finance" },
  { name: "Mint - Opinion", rssUrl: "https://www.livemint.com/rss/opinion", defaultCategory: "Opinion" },
  { name: "Mint - Politics", rssUrl: "https://www.livemint.com/rss/politics", defaultCategory: "Politics"},
  { name: "Mint - Science", rssUrl: "https://www.livemint.com/rss/science", defaultCategory: "Science"},
  
  // Hindustan Times (India)
  { name: "Hindustan Times - Top News", rssUrl: "https://www.hindustantimes.com/rss/topnews/rssfeed.xml", defaultCategory: "Top News" },
  { name: "Hindustan Times - Main News", rssUrl: "https://www.hindustantimes.com/rss/news", defaultCategory: "India News" },
  { name: "Hindustan Times - Business", rssUrl: "https://www.hindustantimes.com/business/rss/feed", defaultCategory: "Business" },
  { name: "Hindustan Times - Tech (HT Tech)", rssUrl: "https://tech.hindustantimes.com/rss", defaultCategory: "Technology" }, // Changed from tech.hindustantimes.com/rss/tech/rssfeed.xml
  { name: "Hindustan Times - Entertainment", rssUrl: "https://www.hindustantimes.com/rss/entertainment/rssfeed.xml", defaultCategory: "Entertainment" },
  { name: "Hindustan Times - Sports", rssUrl: "https://www.hindustantimes.com/rss/sports/rssfeed.xml", defaultCategory: "Sports" },
  { name: "Hindustan Times - Auto", rssUrl: "https://auto.hindustantimes.com/rss/rssfeed.xml", defaultCategory: "Auto" },


  // Times of India
  { name: "Times of India - Top Stories", rssUrl: "https://timesofindia.indiatimes.com/rssfeedstopstories.cms", defaultCategory: "India News" },
  { name: "Times of India - Business", rssUrl: "https://timesofindia.indiatimes.com/rssfeeds/1898055.cms", defaultCategory: "Business"},
  { name: "Times of India - Tech", rssUrl: "https://timesofindia.indiatimes.com/rssfeeds/5880659.cms", defaultCategory: "Technology"},

  // BBC (International)
  { name: "BBC - Top Stories", rssUrl: "http://feeds.bbci.co.uk/news/rss.xml", defaultCategory: "World News" },
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
  
  // Priority 2: Direct media:content (common in many feeds like Mint, BBC, HT)
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
                // console.error("Error constructing absolute image URL from relative path:", e);
                return null; 
            }
        }
        // console.warn("Cannot construct absolute image URL: base link missing or invalid for relative path", imageUrl);
        return null; 
    }
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
        // console.warn("Invalid image URL (not http/https):", imageUrl);
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
    const potentialValues = [
      getNestedValue(contentInput, 'content:encoded'),
      getNestedValue(contentInput, 'content'),
      getNestedValue(contentInput, 'description'),
      getNestedValue(contentInput, 'summary'),
      // contentInput.toString() // Avoid generic toString on objects if not helpful
    ];
    for (const val of potentialValues) {
      if (typeof val === 'string' && val.trim() !== '') {
        text = val;
        break;
      } else if (val && typeof val._ === 'string' && val._.trim() !== '') { // Handle CDATA like objects
        text = val._;
        break;
      }
    }
  }
  return text.trim();
}

function normalizeSummary(descriptionInput: any, fullContentInput?: any): string {
  let textToSummarize = '';
  const descriptionText = normalizeContent(descriptionInput);
  const fullContentText = normalizeContent(fullContentInput);

  // Prefer full content if it's substantially longer or description is minimal
  if (fullContentText && fullContentText.length > (descriptionText?.length || 0) + 50) { 
    textToSummarize = fullContentText;
  } else if (descriptionText) {
    textToSummarize = descriptionText;
  } else if (fullContentText) { // Fallback to full content if description is entirely missing
    textToSummarize = fullContentText;
  }
  
  // Strip HTML tags, [link], [comments], &nbsp;, and excessive whitespace
  const plainText = textToSummarize
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') 
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') 
    .replace(/<[^>]+>/g, ' ') 
    .replace(/\[link\]|\[comments\]/gi, '') 
    .replace(/&nbsp;/gi, ' ') 
    .replace(/\s+/g, ' ')
    .trim();
    
  // If stripping HTML resulted in empty, but original full content was different (e.g., image-only description)
  // try to get some text from the full content again if it wasn't the primary source.
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
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', // Common bot User-Agent
        'Accept': 'application/rss+xml,application/xml,application/atom+xml,text/xml;q=0.9,*/*;q=0.8' 
      },
      next: { revalidate: 300 } // 5 minutes
    });

    if (!response.ok) {
      console.error(`Failed to fetch RSS from ${source.name} (${source.rssUrl}): ${response.status} ${response.statusText}`);
      return [];
    }
    const xmlText = await response.text();
    const result = await parser.parseStringPromise(xmlText);

    let items = getNestedValue(result, 'rss.channel.item', []);
    if (!items || (Array.isArray(items) && items.length === 0)) {
      items = getNestedValue(result, 'feed.entry', []); // Atom feed check
    }
     if (!items || (Array.isArray(items) && items.length === 0)) { 
      items = getNestedValue(result, 'rdf:RDF.item', []); // RDF feed check
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
      } else if (typeof linkField === 'object' && linkField?.href) { // Atom link object
        originalLink = linkField.href;
      } else if (typeof linkField === 'object' && !linkField?.href && linkField?._) { // Other object link
        originalLink = linkField._;
      } else if (Array.isArray(linkField)) { // Array of links (Atom)
        const alternateLink = linkField.find(l => typeof l === 'object' && l.rel === 'alternate' && l.href);
        originalLink = alternateLink ? alternateLink.href : ( (typeof linkField[0] === 'object' && linkField[0]?.href) || (typeof linkField[0] === 'string' ? linkField[0] : '#') );
      }
      
      // Specific handling for Reddit "View article" links if standard link is to comments
      if (source.name.includes("Reddit") && item.content && (item.content._ || typeof item.content === 'string')) {
          const contentStr = item.content._ || item.content;
          const linkMatch = String(contentStr).match(/<a href="([^"]+)">\[link\]<\/a>/);
          if (linkMatch && linkMatch[1]) originalLink = linkMatch[1];
      }
      originalLink = typeof originalLink === 'string' ? originalLink.trim() : '#';
      
      if (originalLink === '#' && item.id && typeof item.id === 'string' && item.id.startsWith('http')) {
        originalLink = item.id; // Use Atom ID as link if it's a URL and link is missing
      }

      const pubDateSource = getNestedValue(item, 'pubDate') || getNestedValue(item, 'published') || getNestedValue(item, 'updated') || getNestedValue(item, 'dc:date');
      const date = pubDateSource ? new Date(normalizeContent(pubDateSource)).toISOString() : new Date().toISOString();

      let guidValue = getNestedValue(item, 'guid');
      if (typeof guidValue === 'object') {
          // If guid isPermaLink="false", it's not the article URL. Prefer originalLink.
          if (guidValue.isPermaLink === 'false' || guidValue.ispermalink === 'false') { 
              guidValue = originalLink; 
          } else {
              guidValue = normalizeContent(getNestedValue(guidValue, '_', getNestedValue(guidValue, '#text', originalLink)));
          }
      } else {
          guidValue = normalizeContent(guidValue || getNestedValue(item, 'id')); // Fallback to Atom ID for guid
      }
      
      const idInput = (typeof guidValue === 'string' && guidValue.trim() !== '' && guidValue.trim() !== '#') ? guidValue : (originalLink + source.name + index);
      const idSuffix = source.name.replace(/[^a-zA-Z0-9]/g, '').slice(0,10); 
      const idBase = idInput.length > 75 ? idInput.substring(0, 75) : idInput; 
      const id = slugify(idBase) + '-' + idSuffix;

      let categoryFromFeed = getNestedValue(item, 'category', source.defaultCategory || 'General');
      if (Array.isArray(categoryFromFeed)) {
          categoryFromFeed = categoryFromFeed.map(cat => {
            if (typeof cat === 'object') return cat.term || cat._ || cat['#text'] || cat.label || cat.name || cat.$; // Atom category term
            return cat;
          }).filter(Boolean).join(', ') || source.defaultCategory || 'General';
      } else if (typeof categoryFromFeed === 'object') {
          categoryFromFeed = categoryFromFeed.term || categoryFromFeed._ || categoryFromFeed['#text'] || categoryFromFeed.label || categoryFromFeed.name || categoryFromFeed.$;
      }
      const finalCategory = typeof categoryFromFeed === 'string' ? categoryFromFeed.trim().split(',')[0].trim() : (source.defaultCategory || 'General');

      const imageUrl = extractImageUrl(item, title, finalCategory);
      
      const rawContent = normalizeContent(getNestedValue(item, 'content:encoded', getNestedValue(item, 'content', getNestedValue(item, 'description', getNestedValue(item, 'summary')))));
      const summaryText = normalizeSummary(getNestedValue(item, 'description', getNestedValue(item, 'summary')), rawContent);

      const internalArticleLink = `/${slugify(finalCategory)}/${id}`;

      return {
        id,
        title,
        summary: summaryText, 
        date,
        source: source.name,
        category: finalCategory,
        imageUrl: imageUrl, 
        link: internalArticleLink, // Internal app link
        sourceLink: originalLink, // Original article link
        content: rawContent || summaryText, // Fullest content available from feed
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

  // Filter out articles with empty, placeholder, or very short summaries BEFORE de-duplication
  allArticles = allArticles.filter(article => {
    const summaryText = article.summary ? article.summary.trim() : "";
    return summaryText.length >= 25 && 
           summaryText.toLowerCase() !== "no summary available." &&
           summaryText !== "..."; 
  });
  
  // De-duplicate articles
  const uniqueArticlesMap = new Map<string, Article>();
  for (const article of allArticles) {
    if (!article.title || !article.sourceLink || article.sourceLink === '#') {
        // console.warn("Skipping article due to missing title or sourceLink:", article);
        continue; 
    }

    // Normalize title: lowercase, remove extra spaces, take first 80 chars
    let normalizedTitleKey = article.title.toLowerCase().replace(/\s+/g, ' ').substring(0, 80).trim();
    
    // Normalize link: remove protocol, www, trailing slash, common tracking params
    let normalizedLinkKey = article.sourceLink;
    try {
        const url = new URL(article.sourceLink);
        // Remove common query parameters that don't change content
        const paramsToRemove = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid', 'msclkid', 'mc_cid', 'mc_eid', 'rssfeed'];
        paramsToRemove.forEach(param => url.searchParams.delete(param));
        normalizedLinkKey = `${url.hostname}${url.pathname}${url.search}`.replace(/^www\./, '').replace(/\/$/, '').toLowerCase();
    } catch (e) { 
        // console.warn("Could not parse URL for de-duplication:", article.sourceLink, e);
        normalizedLinkKey = article.sourceLink.toLowerCase().replace(/^www\./, '').replace(/\/$/, '').trim();
    }

    const uniqueKey = `${normalizedTitleKey}|${normalizedLinkKey}`;
    const existingArticle = uniqueArticlesMap.get(uniqueKey);

    if (!existingArticle) {
        uniqueArticlesMap.set(uniqueKey, article);
    } else {
        // Preference logic for duplicates
        let keepNew = false;
        // Prefer article with image if current one doesn't have it
        if (article.imageUrl && !existingArticle.imageUrl) {
            keepNew = true;
        } else if (!article.imageUrl && existingArticle.imageUrl) {
            // keep existing (already has image)
        }
        // Prefer article with (more) content
        else if (article.content && (!existingArticle.content || article.content.length > (existingArticle.content.length + 50))) { // +50 to avoid minor diffs
            keepNew = true;
        } else if (!article.content && existingArticle.content) {
            // keep existing (already has content)
        }
        // If both have similar content length and image status, prefer the one with a more specific category if different
        else if (article.category !== existingArticle.category && (article.category !== 'General' && article.category !== 'Top News' && existingArticle.category === 'General' || existingArticle.category === 'Top News')) {
            keepNew = true;
        }
        // Prefer article from a non-"Top News" or "General" category if the existing one is
        else if (existingArticle.category && (existingArticle.category.toLowerCase().includes("top news") || existingArticle.category.toLowerCase().includes("general")) && 
                 article.category && !(article.category.toLowerCase().includes("top news") || article.category.toLowerCase().includes("general"))){
            keepNew = true;
        }
        
        if (keepNew) {
            uniqueArticlesMap.set(uniqueKey, article);
        }
    }
  }
  allArticles = Array.from(uniqueArticlesMap.values());

  // Sort by date, newest first
  allArticles.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return allArticles.slice(0, 100); // Limit to 100 articles for performance
}
