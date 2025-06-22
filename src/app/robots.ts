import { type MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  const SITE_BASE_URL = 'https://www.newshunt.blog';
 
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/'],
      },
    ],
    sitemap: `${SITE_BASE_URL}/sitemap.xml`,
  }
}
