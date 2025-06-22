
import { getArticles, getCategories } from '@/lib/placeholder-data';
import { MetadataRoute } from 'next';

const SITE_BASE_URL = 'https://www.newshunt.blog';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Fetch all articles to generate article pages.
  // A high limit is used to ensure all articles are included.
  const { articles } = await getArticles(undefined, undefined, 1, 5000); 

  const articleEntries: MetadataRoute.Sitemap = articles.map(({ link, date, fetchedAt }) => ({
    url: `${SITE_BASE_URL}${link}`,
    lastModified: fetchedAt ? new Date(fetchedAt) : new Date(date),
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  // Fetch all categories to generate category pages.
  const categories = await getCategories();
  const categoryEntries: MetadataRoute.Sitemap = categories
    .filter(category => category !== 'All') // Exclude the "All" virtual category.
    .map(category => ({
      url: `${SITE_BASE_URL}/?category=${encodeURIComponent(category)}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    }));

  return [
    {
      url: SITE_BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    ...categoryEntries,
    ...articleEntries,
  ];
}
