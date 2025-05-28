
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
  
  // Hindustan Times (India)
  { name: "Hindustan Times - Top News", rssUrl: "https://www.hindustantimes.com/rss/topnews/rssfeed.xml", defaultCategory: "Top News" },
  { name: "Hindustan Times - Main News", rssUrl: "https://www.hindustantimes.com/rss/news", defaultCategory: "India News" },
  { name: "Hindustan Times - Business", rssUrl: "https://www.hindustantimes.com/business/rss/feed", defaultCategory: "Business" },
  { name: "Hindustan Times - Tech (HT Tech)", rssUrl: "https://tech.hindustantimes.com/rss", defaultCategory: "Technology" },
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

function extractImageUrl(item: any, articleTitle: string, articleCategory?: string): string | null {
  let imageUrl = null;
  
  // Prioritize media:content as it often contains more detailed image info
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
    // This might be a lower quality thumbnail, so it's a lower priority
    imageUrl = item['media:thumbnail'].url;
  }
  
  // Specific for Times of India / Hindustan Times if other methods fail
  if (!imageUrl && (item.source?.includes("Times of India") || item.source?.includes("Hindustan Times")) ) {
    const description = normalizeContent(getNestedValue(item, 'description'));
    if (description) {
        const imgMatch = description.match(/<img[^>]+src="([^">]+)"/);
        if (imgMatch && imgMatch[1]) {
            imageUrl = imgMatch[1];
        }
    }
  }

  // Generic search in content/description for an <img> tag
  if (!imageUrl) {
    const contentFieldsToSearch = [
      getNestedValue(item, 'content:encoded'), 
      getNestedValue(item, 'description'),
      getNestedValue(item, 'content'),
      getNestedValue(item, 'content._'), // For Reddit's structure sometimes
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
                const baseUrlObject = new URL(baseLink);
                return new URL(imageUrl, baseUrlObject.origin).href;
            } catch (e) {
                // console.warn(`Could not construct absolute URL for relative image path: ${imageUrl} with base: ${baseLink}`);
                return null; 
            }
        }
        // console.warn(`Could not construct absolute URL for relative image path: ${imageUrl} as baseLink is invalid.`);
        return null; 
    }
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
        // console.warn(`Image URL does not start with http/https: ${imageUrl}`);
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
    // Try common object structures for content
    const potentialValues = [
      getNestedValue(contentInput, 'content:encoded'),
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
  return text.trim();
}

function normalizeSummary(descriptionInput: any, fullContentInput?: any, sourceName?: string): string {
  let textToSummarize = '';
  let descriptionText = normalizeContent(descriptionInput);
  const fullContentText = normalizeContent(fullContentInput);

  if (sourceName && sourceName.toLowerCase().includes("reddit")) {
    // More aggressive cleaning for Reddit descriptions
    descriptionText = descriptionText
        .replace(/<p>submitted by.*?<\/p>/gi, '') // Remove "submitted by..." paragraph
        .replace(/<a href="[^"]*">\[comments\]<\/a>/gi, '') // Remove [comments] anchor
        .replace(/<a href="[^"]*">\[link\]<\/a>/gi, '')    // Remove [link] anchor
        .replace(/<a[^>]*?>\[\d+ comments?\]<\/a>/gi, '') // Remove comment count links like [100 comments]
        .replace(/<p><a href="[^"]*">.*?read more.*?<\/a><\/p>/gi, '') // Remove "read more" paragraphs
        .replace(/<img[^>]*?>/gi, '');              // Remove any image tags from description
  }

  // Prefer full content if it's substantially longer or if description is minimal
  if (fullContentText && fullContentText.length > (descriptionText?.length || 0) + 50) { 
    textToSummarize = fullContentText;
  } else if (descriptionText) {
    textToSummarize = descriptionText;
  } else if (fullContentText) { // Fallback to full content if description is empty
    textToSummarize = fullContentText;
  }
  
  // General cleanup: remove HTML, extra whitespace, etc.
  const plainText = textToSummarize
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') 
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') 
    .replace(/<[^>]+>/g, ' ') // Strip all HTML tags
    .replace(/\[link\]|\[comments\]/gi, '') // Remove [link] and [comments] text
    .replace(/&nbsp;/gi, ' ') 
    .replace(/\s+/g, ' ')
    .trim();
    
  if (!plainText && fullContentText && fullContentText !== textToSummarize) { 
      // If plainText is empty but fullContentText was available and different (e.g., description was just HTML fluff)
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
        'Accept': 'application/rss+xml,application/xml,application/atom+xml;q=0.9,text/xml;q=0.8,*/*;q=0.7' 
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
      items = getNestedValue(result, 'feed.entry', []); // For Atom feeds
    }
     if (!items || (Array.isArray(items) && items.length === 0)) { 
      items = getNestedValue(result, 'rdf:RDF.item', []); // For RDF feeds
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
          // Reddit often has the true article link inside the description/content as "[link]"
          const linkMatch = String(contentStr).match(/<a href="([^"]+)">\[link\]<\/a>/);
          if (linkMatch && linkMatch[1]) originalLink = linkMatch[1];
      }
      originalLink = typeof originalLink === 'string' ? originalLink.trim() : '#';
      
      // Fallback if link is still '#' and guid is a permalink
      if (originalLink === '#' && item.guid && typeof item.guid === 'string' && (item.guid.startsWith('http') || (typeof item.guid === 'object' && item.guid.isPermaLink !== 'false'))) {
        originalLink = typeof item.guid === 'object' ? item.guid._ : item.guid;
      }
      // Atom feeds often use <id> as the permalink
      if (originalLink === '#' && item.id && typeof item.id === 'string' && item.id.startsWith('http')) {
        originalLink = item.id; 
      }


      const pubDateSource = getNestedValue(item, 'pubDate') || getNestedValue(item, 'published') || getNestedValue(item, 'updated') || getNestedValue(item, 'dc:date');
      const date = pubDateSource ? new Date(normalizeContent(pubDateSource)).toISOString() : new Date().toISOString();

      let guidValue = getNestedValue(item, 'guid');
      if (typeof guidValue === 'object') {
          if (guidValue.isPermaLink === 'false' || guidValue.ispermalink === 'false') { 
              // If not a permalink, use the originalLink we derived, or a composite ID
              guidValue = originalLink !== '#' ? originalLink : (title + source.name + index); 
          } else {
              // If it is a permalink, use its content
              guidValue = normalizeContent(getNestedValue(guidValue, '_', getNestedValue(guidValue, '#text', originalLink)));
          }
      } else {
          guidValue = normalizeContent(guidValue || getNestedValue(item, 'id')); // Use <id> from Atom as a fallback for guid
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
      const finalCategory = typeof categoryFromFeed === 'string' ? categoryFromFeed.trim().split(',')[0].trim() : (source.defaultCategory || 'General');

      const imageUrl = extractImageUrl(item, title, finalCategory);
      
      let rawContent = normalizeContent(getNestedValue(item, 'content:encoded', getNestedValue(item, 'content', getNestedValue(item, 'description', getNestedValue(item, 'summary')))));
      // For Reddit, description might be cleaner for rawContent if content:encoded is just boilerplate
      if (source.name.toLowerCase().includes("reddit")) {
          const redditDescription = normalizeContent(getNestedValue(item, 'description'));
          if (redditDescription && (!rawContent || rawContent.length < redditDescription.length + 20)) {
              rawContent = redditDescription;
          }
      }
      const summaryText = normalizeSummary(getNestedValue(item, 'description', getNestedValue(item, 'summary')), rawContent, source.name);

      const internalArticleLink = `/${slugify(finalCategory)}/${id}`;

      return {
        id,
        title,
        summary: summaryText, 
        date,
        source: source.name,
        category: finalCategory,
        imageUrl: imageUrl, 
        link: internalArticleLink, 
        sourceLink: originalLink, 
        content: rawContent || summaryText, 
      };
    }).filter(article => article.title && article.title !== 'Untitled Article' && !article.title.includes("reddit.com Store") && article.sourceLink && article.sourceLink !== '#');
  } catch (error) {
    // console.error(`Error processing RSS feed for ${source.name} (${source.rssUrl}):`, error);
    return [];
  }
}

export async function fetchArticlesFromAllSources(): Promise<Article[]> {
  const allArticlesPromises = NEWS_SOURCES.map(source => fetchAndParseRSS(source));
  const results = await Promise.all(allArticlesPromises);

  let allArticles: Article[] = results.flat();

  // First, filter out articles with insufficient summaries
  allArticles = allArticles.filter(article => {
    const summaryText = article.summary ? article.summary.trim() : "";
    return summaryText.length >= 25 && 
           summaryText.toLowerCase() !== "no summary available." &&
           summaryText.toLowerCase() !== "..." &&
           !summaryText.toLowerCase().includes("submitted by"); // Further filter out Reddit "submitted by" if it slips through
  });
  
  // Then, de-duplicate
  const uniqueArticlesMap = new Map<string, Article>();
  for (const article of allArticles) {
    if (!article.title || !article.sourceLink || article.sourceLink === '#') {
        continue; 
    }

    let normalizedTitleKey = article.title.toLowerCase().replace(/\s+/g, ' ').substring(0, 80).trim();
    
    let normalizedLinkKey = article.sourceLink;
    try {
        const url = new URL(article.sourceLink);
        // More robust query param removal
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
        // Preference logic: keep the one with an image, or more content, or more specific category
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
            keepNew = true; // Prefer a more specific category
        }
        
        if (keepNew) {
            uniqueArticlesMap.set(uniqueKey, article);
        }
    }
  }
  allArticles = Array.from(uniqueArticlesMap.values());

  // Sort by date as the final step
  allArticles.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return allArticles.slice(0, 150); // Limit to 150 articles after de-duplication
}
