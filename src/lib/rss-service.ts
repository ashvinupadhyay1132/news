
// @ts-nocheck
// Disabling TypeScript checks for this file due to the dynamic nature of RSS feed structures
// and the use of xml2js which can lead to complex type definitions.
'use server';

import { Parser } from 'xml2js';
import type { Article } from './placeholder-data';
import { slugify, getNestedValue, generateAiHintFromTitle } from './utils'; // Ensure this import is correct

interface NewsSource {
  name: string;
  rssUrl: string;
  defaultCategory?: string;
}

// Curated list based on recent request
const NEWS_SOURCES: NewsSource[] = [
  { name: "Mint - Latest News", rssUrl: "https://www.livemint.com/rss/latestnews", defaultCategory: "India News" },
  { name: "Mint - Companies", rssUrl: "https://www.livemint.com/rss/companies", defaultCategory: "Business" },
  { name: "Mint - Opinion", rssUrl: "https://www.livemint.com/rss/opinion", defaultCategory: "Opinion" },
  { name: "Hindustan Times - Top News", rssUrl: "https://www.hindustantimes.com/rss/topnews/rssfeed.xml", defaultCategory: "India News" },
  { name: "Hindustan Times - Tech", rssUrl: "https://tech.hindustantimes.com/rss", defaultCategory: "Technology" },
  { name: "Times of India - Top Stories", rssUrl: "https://timesofindia.indiatimes.com/rssfeedstopstories.cms", defaultCategory: "India News" },
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
  
  // Priority 2: Direct media:content (common in many feeds)
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
  
  // Priority 5: For Times of India, Hindustan Times - often in description as img src
  if (!imageUrl && (item.source === "Times of India - Top Stories" || item.source === "Hindustan Times - Top News" || item.source === "Hindustan Times - Tech") ) {
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
      getNestedValue(item, 'content:encoded'), // Often contains full HTML, good for images
      getNestedValue(item, 'description'),
      getNestedValue(item, 'content'),
      getNestedValue(item, 'content._'),
      getNestedValue(item, 'summary'), // Atom feeds use summary
    ];
    for (const field of contentFieldsToSearch) {
      const normalizedField = normalizeContent(field); // Ensure we get a string
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
    text = String(getNestedValue(contentInput, 'content', getNestedValue(contentInput, 'description', getNestedValue(contentInput, '$t', ''))));
  }
  return text.trim();
}

function normalizeSummary(descriptionInput: any, fullContentInput?: any): string {
  let textToSummarize = '';
  const descriptionText = normalizeContent(descriptionInput);
  const fullContentText = normalizeContent(fullContentInput);

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
  return plainText.substring(0, 250) + (plainText.length > 250 ? '...' : '');
}


async function fetchAndParseRSS(source: NewsSource): Promise<Article[]> {
  try {
    const response = await fetch(source.rssUrl, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (compatible; TrendingNewsFeedApp/1.0; +https://trendingnewsfeed.in/bot.html)',
        'Accept': 'application/rss+xml,application/xml,text/xml;q=0.9,*/*;q=0.8' 
      },
      next: { revalidate: 300 } 
    });

    if (!response.ok) {
      console.error(`Failed to fetch RSS from ${source.name} (${source.rssUrl}): ${response.status} ${response.statusText}`);
      return [];
    }
    const xmlText = await response.text();
    const result = await parser.parseStringPromise(xmlText);

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

    return items.map((item: any, index: number) => {
      const title = normalizeContent(getNestedValue(item, 'title', 'Untitled Article'));

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
      
      if (source.name.includes("Reddit") && item.content && (item.content._ || typeof item.content === 'string')) {
          const contentStr = item.content._ || item.content;
          const linkMatch = String(contentStr).match(/<a href="([^"]+)">\[link\]<\/a>/);
          if (linkMatch && linkMatch[1]) originalLink = linkMatch[1];
      }
      originalLink = typeof originalLink === 'string' ? originalLink.trim() : '#';
      if (originalLink === '#' && item.id && typeof item.id === 'string' && item.id.startsWith('http')) {
        originalLink = item.id;
      }


      const pubDateSource = getNestedValue(item, 'pubDate') || getNestedValue(item, 'published') || getNestedValue(item, 'updated') || getNestedValue(item, 'dc:date');
      const date = pubDateSource ? new Date(normalizeContent(pubDateSource)).toISOString() : new Date().toISOString();

      let guidValue = getNestedValue(item, 'guid');
      if (typeof guidValue === 'object') {
          if (guidValue.isPermaLink === 'false' || guidValue.ispermalink === 'false') { 
              guidValue = originalLink;
          } else {
              guidValue = normalizeContent(getNestedValue(guidValue, '_', getNestedValue(guidValue, '#text', originalLink)));
          }
      } else {
          guidValue = normalizeContent(guidValue || getNestedValue(item, 'id'));
      }
      
      const idInput = (typeof guidValue === 'string' && guidValue.trim() !== '' && guidValue.trim() !== '#') ? guidValue : (originalLink + source.name + index);
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
      const finalCategory = typeof categoryFromFeed === 'string' ? categoryFromFeed.trim().split(',')[0].trim() : (source.defaultCategory || 'General');

      const imageUrl = extractImageUrl(item, title, finalCategory);
      
      const rawContent = normalizeContent(getNestedValue(item, 'content:encoded', getNestedValue(item, 'content', getNestedValue(item, 'description', getNestedValue(item, 'summary')))));
      const summaryText = normalizeSummary(getNestedValue(item, 'description', getNestedValue(item, 'summary')), rawContent);


      const internalArticleLink = `/${slugify(finalCategory)}/${id}`;

      return {
        id,
        title,
        summary: summaryText || "No summary available.",
        date,
        source: source.name,
        category: finalCategory,
        imageUrl: imageUrl, // This can be null
        link: internalArticleLink,
        sourceLink: originalLink,
        content: rawContent || summaryText || "Full content not available in feed.",
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

  const uniqueArticlesMap = new Map<string, Article>();
  for (const article of allArticles) {
    let normalizedTitleKey = article.title.toLowerCase().replace(/\s+/g, ' ').substring(0, 80).trim();
    
    let normalizedLinkKey = article.sourceLink;
    try {
      const url = new URL(article.sourceLink);
      normalizedLinkKey = `${url.hostname}${url.pathname}`.replace(/^www\./, '').replace(/\/$/, '').toLowerCase();
    } catch (e) {/* use as is if not valid URL */}

    const uniqueKey = `${normalizedTitleKey}|${normalizedLinkKey}`;
    
    const existingArticle = uniqueArticlesMap.get(uniqueKey);
    if (!existingArticle || 
        (article.content && existingArticle.content && (article.content.length > existingArticle.content.length)) || 
        (article.imageUrl && !existingArticle.imageUrl)) { 
      uniqueArticlesMap.set(uniqueKey, article);
    }
  }
  allArticles = Array.from(uniqueArticlesMap.values());

  allArticles.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return allArticles.slice(0, 100); 
}

// The generateAiHintFromTitle function definition should NOT be here.
// It should be imported from './utils'
