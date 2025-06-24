
import { getArticles, type Article } from '@/lib/placeholder-data';
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
  // Site URL is now hardcoded
  const siteUrl = "https://www.newshunt.blog"; 
  
  // Fetch live articles
  // Fetch up to 20 most recent articles. getArticles sorts by date descending by default.
  const { articles: articlesResult } = await getArticles(undefined, undefined, 1, 20); 
  const articlesToInclude = articlesResult; 

  const feedItems = articlesToInclude
    .map((article: Article) => {
      const internalArticleUrl = `${siteUrl}${article.link}`; 

      return `
        <item>
          <title>${escapeXml(article.title)}</title>
          <link>${escapeXml(internalArticleUrl)}</link> 
          <description>${escapeXml(article.summary)}</description>
          <pubDate>${new Date(article.date).toUTCString()}</pubDate>
          <guid isPermaLink="true">${escapeXml(internalArticleUrl)}</guid> 
          <category>${escapeXml(article.category)}</category>
          ${article.imageUrl && article.imageUrl !== 'https://placehold.co/600x400.png' ? `<enclosure url="${escapeXml(article.imageUrl)}" type="${article.imageUrl.endsWith('.png') ? 'image/png' : article.imageUrl.endsWith('.jpg') || article.imageUrl.endsWith('.jpeg') ? 'image/jpeg' : 'image/gif'}" />` : ''}
        </item>
      `;
    })
    .join('');

  const rssFeed = `
    <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/">
      <channel>
        <title>NewsHunt - Latest Articles</title>
        <link>${siteUrl}</link>
        <description>Stay updated with the latest trending news from NewsHunt, all in one place.</description>
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
