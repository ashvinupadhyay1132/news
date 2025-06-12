
import type { Metadata, ResolvingMetadata } from 'next';
import { getArticleById, type Article } from '@/lib/placeholder-data';

type Props = {
  params: { id: string; category: string }; // category from URL, though article.category is preferred for consistency
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const articleId = params.id;
  const articleData: Article | undefined = await getArticleById(articleId);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.newshunt.blog';

  if (!articleData) {
    return {
      title: 'Article Not Found',
      description: 'The article you are looking for could not be found.',
      robots: { index: false, follow: false } // Important for 404-like pages
    };
  }

  const parentMetadata = await parent;
  const previousImages = parentMetadata.openGraph?.images || [];

  // Ensure articleData.link is root-relative before prepending siteUrl
  const articlePath = articleData.link.startsWith('/') ? articleData.link : `/${articleData.link}`;
  const canonicalUrl = `${siteUrl}${articlePath}`;
  
  const articleImageUrl = articleData.imageUrl && articleData.imageUrl.startsWith('http') 
    ? articleData.imageUrl 
    : `${siteUrl}/default-og-image.png`; // Ensure you have a default-og-image.png in your /public folder

  const keywords = [
    articleData.category, 
    articleData.source, 
    ...articleData.title.toLowerCase().split(/\s+/).filter(w => w.length > 3 && !['the', 'and', 'for', 'new', 'news'].includes(w)).slice(0, 5)
  ].filter(Boolean);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": articleData.title,
    "description": articleData.summary.substring(0, 250), // Max length for description in structured data can be longer
    "image": [articleImageUrl],
    "datePublished": articleData.date,
    "dateModified": articleData.fetchedAt || articleData.date,
    "author": {
      "@type": "Organization", // Assuming source is an organization
      "name": articleData.source,
      ...(articleData.sourceLink && articleData.sourceLink !== '#' && articleData.sourceLink.startsWith('http') && { "url": articleData.sourceLink })
    },
    "publisher": {
      "@type": "Organization",
      "name": "NewsHunt", // Your application's name
      "logo": {
        "@type": "ImageObject",
        "url": `${siteUrl}/default-og-image.png` // URL to your site's logo
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": canonicalUrl
    }
  };

  return {
    title: articleData.title,
    description: articleData.summary.substring(0, 160), // Standard meta description length
    keywords: keywords,
    authors: [{ name: articleData.source, url: (articleData.sourceLink && articleData.sourceLink !== '#' && articleData.sourceLink.startsWith('http')) ? articleData.sourceLink : siteUrl }],
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: articleData.title,
      description: articleData.summary.substring(0, 160),
      url: canonicalUrl,
      siteName: 'NewsHunt',
      images: [
        {
          url: articleImageUrl,
          width: 1200,
          height: 630,
          alt: articleData.title,
        },
        ...previousImages,
      ],
      type: 'article',
      publishedTime: articleData.date,
      authors: [articleData.source],
    },
    twitter: {
      card: 'summary_large_image',
      title: articleData.title,
      description: articleData.summary.substring(0, 160),
      images: [articleImageUrl],
    },
    robots: { 
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    // Add JSON-LD structured data using the scripts property
    scripts: [
      {
        id: 'article-jsonld',
        type: 'application/ld+json',
        dangerouslySetInnerHTML: {
          __html: JSON.stringify(jsonLd),
        },
      },
    ],
  };
}
