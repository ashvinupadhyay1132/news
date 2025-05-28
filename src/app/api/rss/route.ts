
import { placeholderArticles, type Article } from '@/lib/placeholder-data';
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
  const siteUrl = "https://trendingnewsfeed.in";
  // Ensure articles are sorted by date, newest first (already done in placeholder-data)
  const articlesToInclude = placeholderArticles.slice(0, 20); // Limit to latest 20 articles

  const feedItems = articlesToInclude
    .map((article: Article) => {
      const articleUrl = `${siteUrl}${article.link}`;
      return `
        <item>
          <title>${escapeXml(article.title)}</title>
          <link>${articleUrl}</link>
          <description>${escapeXml(article.summary)}</description>
          <pubDate>${new Date(article.date).toUTCString()}</pubDate>
          <guid isPermaLink="true">${articleUrl}</guid>
          <category>${escapeXml(article.category)}</category>
        </item>
      `;
    })
    .join('');

  const rssFeed = `
    <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
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
      'Cache-Control': 's-maxage=3600, stale-while-revalidate', // Cache for 1 hour on CDN, revalidate in background
    },
  });
}
