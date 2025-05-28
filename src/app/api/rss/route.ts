
import { getArticles, type Article } from '@/lib/placeholder-data'; // Updated to use getArticles
import { NextResponse } from 'next/server';

// Helper function to escape XML characters
function escapeXml(unsafe: string): string {
    if (typeof unsafe !== 'string') {
        return '';
    }
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
}

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://trendingnewsfeed.in"; // Use env var or fallback
  
  // Fetch live articles
  const articles = await getArticles(); 
  const articlesToInclude = articles.slice(0, 20); // Limit to latest 20 articles from the fetched & sorted list

  const feedItems = articlesToInclude
    .map((article: Article) => {
      // The article.link from rss-service should be the original article link
      // For the <link> tag in RSS, we use the original source link.
      // For <guid>, if the article.link is the original, use it.
      // If your app has its own page for each article (e.g. /category/id), you might use that for guid.
      // For now, we'll use the article.link which should be the source's link.
      const articleUrl = article.link.startsWith('http') ? article.link : `${siteUrl}${article.link}`; // Prefer original link
      const internalArticleUrl = `${siteUrl}${article.link}`; // This should point to *your site's page* for the article

      return `
        <item>
          <title>${escapeXml(article.title)}</title>
          <link>${escapeXml(articleUrl)}</link> 
          <description>${escapeXml(article.summary)}</description>
          <pubDate>${new Date(article.date).toUTCString()}</pubDate>
          <guid isPermaLink="false">${escapeXml(internalArticleUrl)}</guid> 
          <category>${escapeXml(article.category)}</category>
          ${article.imageUrl && article.imageUrl !== 'https://placehold.co/600x400.png' ? `<enclosure url="${escapeXml(article.imageUrl)}" type="image/png" />` : ''}
        </item>
      `;
    })
    .join('');

  const rssFeed = `
    <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/">
      <channel>
        <title>TrendingNewsFeed.in - Latest Articles</title>
        <link>${siteUrl}</link>
        <description>Stay updated with the latest trending news from TrendingNewsFeed.in, all in one place.</description>
        <language>en-us</language>
        <lastBuildDate>${new Date(articlesToInclude[0]?.date || Date.now()).toUTCString()}</lastBuildDate>
        <atom:link href="${siteUrl}/api/rss" rel="self" type="application/rss+xml" />
        <generator>Next.js & Firebase Studio</generator>
        ${feedItems}
      </channel>
    </rss>
  `.trim();

  return new NextResponse(rssFeed, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 's-maxage=300, stale-while-revalidate', // Cache for 5 minutes on CDN
    },
  });
}

// Add a POST method or revalidate hook if you want to trigger cache updates externally.
// For now, revalidation relies on `next: { revalidate: ... }` in fetch calls or Cache-Control header.
