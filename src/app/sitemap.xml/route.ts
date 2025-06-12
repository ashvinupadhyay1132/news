
import { NextResponse } from 'next/server';
import { getAllArticlesForSitemap, getCategories } from '@/lib/placeholder-data';
import { slugify } from '@/lib/utils';

export const revalidate = 3600; // Revalidate sitemap every hour

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.newshunt.blog";

  let sitemapEntriesXml = '';

  // Homepage
  sitemapEntriesXml += `
    <url>
      <loc>${siteUrl}</loc>
      <lastmod>${new Date().toISOString()}</lastmod>
      <changefreq>daily</changefreq>
      <priority>1.0</priority>
    </url>`;

  // Category pages
  try {
    const categories = await getCategories();
    categories.forEach(category => {
      if (category !== "All") { // "All" is typically the homepage or handled by it
        const categorySlug = slugify(category);
        if (categorySlug) {
          sitemapEntriesXml += `
    <url>
      <loc>${siteUrl}/?category=${encodeURIComponent(category)}</loc> 
      <lastmod>${new Date().toISOString()}</lastmod>
      <changefreq>daily</changefreq>
      <priority>0.8</priority>
    </url>`;
        }
      }
    });
  } catch (error) {
    console.error("[Sitemap] Error fetching categories for sitemap:", error);
  }
  
  // Article pages
  try {
    const articles = await getAllArticlesForSitemap();
    articles.forEach(article => {
      // Ensure link is root-relative before prepending siteUrl
      const articlePath = article.link.startsWith('/') ? article.link : `/${article.link}`;
      sitemapEntriesXml += `
    <url>
      <loc>${siteUrl}${articlePath}</loc>
      <lastmod>${article.lastModified}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>0.7</priority>
    </url>`;
    });
  } catch (error) {
    console.error("[Sitemap] Error fetching articles for sitemap:", error);
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  ${sitemapEntriesXml}
</urlset>`;

  return new NextResponse(sitemap.trim(), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate', // Cache for 1 hour
    },
  });
}
