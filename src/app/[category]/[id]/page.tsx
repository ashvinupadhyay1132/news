
// No "use client" here - this is now a Server Component

import type { Metadata, ResolvingMetadata } from 'next';
import { getArticleById } from '@/lib/placeholder-data';
import ArticlePageClientContent from '@/components/article-page-client-content';

const SITE_BASE_URL = 'https://www.newshunt.blog'; // Ensure this matches your actual site URL

type Props = {
  params: { id: string; category: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

export async function generateMetadata(
  { params }: Props,
  _parent: ResolvingMetadata // Renamed parent to _parent as it's not used
): Promise<Metadata> {
  const id = params.id;
  // Fetching article directly here. Ensure getArticleById is server-compatible.
  const article = await getArticleById(id); 
  const placeholderImageSrc = `${SITE_BASE_URL}/default-og-image.png`; // Use default OG image

  if (!article) {
    return {
      title: 'Article Not Found | NewsHunt',
      description: 'The article you are looking for could not be found.',
      alternates: {
        canonical: `${SITE_BASE_URL}/${params.category}/${params.id}/not-found`, // More specific canonical for error
      },
      openGraph: {
        title: 'Article Not Found | NewsHunt',
        description: 'The article you are looking for could not be found.',
        url: `${SITE_BASE_URL}/${params.category}/${params.id}/not-found`,
        images: [
          {
            url: placeholderImageSrc,
            width: 1200,
            height: 630,
            alt: 'NewsHunt - Article Not Found',
          }
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Article Not Found | NewsHunt',
        description: 'The article you are looking for could not be found.',
        images: [placeholderImageSrc],
      },
    };
  }

  const ogImage = article.imageUrl && article.imageUrl.startsWith('http') ? article.imageUrl : placeholderImageSrc;
  const pageUrl = `${SITE_BASE_URL}/${params.category}/${params.id}`;

  return {
    title: `${article.title} | ${article.category} | NewsHunt`,
    description: article.summary.substring(0, 160), // Standard description length
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title: `${article.title} | NewsHunt`,
      description: article.summary.substring(0, 200), // Slightly longer for OG
      url: pageUrl,
      siteName: 'NewsHunt',
      images: [
        {
          url: ogImage,
          width: 1200, // Standard OG image width
          height: 630, // Standard OG image height
          alt: article.title,
        },
      ],
      locale: 'en_US',
      type: 'article',
      publishedTime: new Date(article.date).toISOString(),
      authors: [article.source], 
      // Potentially add tags/keywords here if available in article data:
      // tags: article.tags, 
    },
    twitter: {
      card: 'summary_large_image',
      title: `${article.title} | NewsHunt`,
      description: article.summary.substring(0, 200),
      images: [ogImage],
      // site: '@YourTwitterHandle', // Add your site's Twitter handle
      // creator: '@AuthorTwitterHandle', // If author has a Twitter handle
    },
  };
}

// This is the default export for the page, now a Server Component
export default function ArticlePageContainer() {
  // This component can fetch server-side data if needed and pass to client component
  // For now, ArticlePageClientContent uses useParams, so no props needed here for ID
  return <ArticlePageClientContent />;
}
