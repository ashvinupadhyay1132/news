
// Using require for CommonJS compatibility as this is a .js file
const axios = require('axios');
const RssParser = require('rss-parser');
const he = require('he');
const iconv = require('iconv-lite');
const cheerio = require('cheerio');

const MINT_RSS_URL = 'https://www.livemint.com/rss/news';

/**
 * Fetches the HTML of an article and extracts the og:image or twitter:image URL.
 * @param {string} articleUrl - The URL of the article.
 * @returns {Promise<string|null>} The image URL or null if not found.
 */
async function fetchArticleMetaImage(articleUrl) {
  if (!articleUrl || !articleUrl.startsWith('http')) {
    console.warn(`[fetchMintFeed] Invalid article URL for meta image fetching: ${articleUrl}`);
    return null;
  }
  try {
    const { data: htmlContent } = await axios.get(articleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      },
      timeout: 8000, // 8-second timeout
    });

    const $ = cheerio.load(htmlContent);

    let imageUrl = $('meta[property="og:image"]').attr('content') ||
                   $('meta[name="og:image"]').attr('content') ||
                   $('meta[property="twitter:image"]').attr('content') ||
                   $('meta[name="twitter:image"]').attr('content');
    
    if (imageUrl && typeof imageUrl === 'string') {
        imageUrl = he.decode(imageUrl.trim());
        if (imageUrl.startsWith('/')) {
            const urlObject = new URL(articleUrl);
            imageUrl = `${urlObject.protocol}//${urlObject.hostname}${imageUrl}`;
        }
        if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
            return null; // Invalid image URL scheme
        }
        return imageUrl;
    }
    return null;

  } catch (error) {
    console.error(`[fetchMintFeed] Error fetching/parsing HTML for meta image from ${articleUrl}: ${error.message}`);
    return null;
  }
}

/**
 * Fetches and processes the Mint RSS feed.
 * @returns {Promise<Array<object>>} A list of processed articles.
 */
async function fetchAndProcessMintFeed() {
  try {
    const response = await axios.get(MINT_RSS_URL, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/rss+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: 10000, // 10-second timeout for RSS feed
    });

    let feedXmlString;
    const utf8String = iconv.decode(Buffer.from(response.data), 'utf-8');

    if (utf8String.includes('\uFFFD')) { // Check for Unicode Replacement Character
      console.warn('[fetchMintFeed] Malformed characters detected with UTF-8 decoding for Mint. Trying Windows-1252.');
      feedXmlString = iconv.decode(Buffer.from(response.data), 'windows-1252');
    } else {
      feedXmlString = utf8String;
    }
    
    feedXmlString = feedXmlString.replace(/[\uFFFD]/g, ''); // Remove any remaining replacement characters

    const parser = new RssParser();
    const feed = await parser.parseString(feedXmlString);
    const processedArticles = [];

    for (const item of feed.items) {
      const title = item.title ? he.decode(item.title.trim()) : 'No Title Provided';
      
      let rawDescription = item.contentSnippet || item.content || '';
      if (typeof rawDescription !== 'string') rawDescription = '';
      
      const description = he.decode(rawDescription.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()).substring(0, 300) + (rawDescription.length > 300 ? '...' : '');

      const link = item.link || null;
      const pubDate = item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString();
      let image = null;

      if (item.enclosure && item.enclosure.url && item.enclosure.type && item.enclosure.type.startsWith('image/')) {
        image = item.enclosure.url;
      } else if (item['media:content'] && item['media:content'].$ && item['media:content'].$.url && item['media:content'].$.type && item['media:content'].$.type.startsWith('image')) {
        image = item['media:content'].$.url;
      } else if (item['media:content'] && Array.isArray(item['media:content'])) {
         const mediaImage = item['media:content'].find(mc => mc.$ && mc.$.url && mc.$.medium === 'image');
         if (mediaImage) image = mediaImage.$.url;
      }


      if (!image && link) {
        // console.log(`[fetchMintFeed] Feed did not provide image for "${title}". Fetching article page...`);
        image = await fetchArticleMetaImage(link);
      }
      
      // Final cleanup for description, ensure it's meaningful
      const finalDescription = description.length < 20 || description.toLowerCase() === 'no summary available.' || description.toLowerCase() === "..." ? 'Summary not available.' : description;

      // Filter out articles that still have the replacement character in title or description after cleaning
      if (title.includes('\uFFFD') || finalDescription.includes('\uFFFD')) {
        console.warn(`[fetchMintFeed] Skipping article due to persistent garbage characters: "${title}"`);
        continue;
      }
      if (finalDescription === 'Summary not available.' && !image) { // Be stricter if no image and no summary
          // console.log(`[fetchMintFeed] Skipping article with no image and no summary: "${title}"`);
          // continue; // Optionally skip these entirely
      }


      processedArticles.push({
        title,
        description: finalDescription,
        link,
        pubDate,
        image: image || null, // Ensure image is null if not found
      });
    }
    return processedArticles;
  } catch (error) {
    console.error('[fetchMintFeed] Error processing Mint RSS feed:', error.message);
    return []; // Return empty array on error
  }
}

module.exports = { fetchAndProcessMintFeed };
