
import type { Metadata, ResolvingMetadata } from 'next';
import { getArticleById, type Article } from '@/lib/placeholder-data';

type Props = {
  params: { id: string; category: string };
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const articleId = params.id;
  const articleData: Article | undefined = await getArticleById(articleId);

  const siteUrlString = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.newshunt.blog';
  let metadataBaseUrl: URL;
  try {
    metadataBaseUrl = new URL(siteUrlString);
  } catch (e) {
    console.error(`[Article Metadata] Invalid NEXT_PUBLIC_SITE_URL: "${siteUrlString}". Error: ${(e as Error).message}. Falling back to default.`);
    metadataBaseUrl = new URL("https://www.newshunt.blog"); // Fallback
  }


  if (!articleData) {
    return {
      title: 'Article Not Found',
      description: 'The article you are looking for could not be found.',
      robots: { index: false, follow: false }
    };
  }

  const parentMetadata = await parent;
  const previousImages = parentMetadata.openGraph?.images || [];

  const articlePath = articleData.link.startsWith('/') ? articleData.link : `/${articleData.link}`;
  const canonicalUrl = new URL(articlePath, metadataBaseUrl).toString();
  
  const defaultOgImageRelativePath = '/default-og-image.png';
  const articleImageUrl = articleData.imageUrl && articleData.imageUrl.startsWith('http') 
    ? articleData.imageUrl 
    : new URL(defaultOgImageRelativePath, metadataBaseUrl).toString();

  const keywords = [
    articleData.category, 
    articleData.source, 
    ...articleData.title.toLowerCase().split(/\s+/).filter(w => w.length > 3 && !['the', 'and', 'for', 'new', 'news'].includes(w)).slice(0, 5)
  ].filter(Boolean);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": articleData.title,
    "description": articleData.summary.substring(0, 250),
    "image": [articleImageUrl],
    "datePublished": articleData.date,
    "dateModified": articleData.fetchedAt || articleData.date,
    "author": {
      "@type": "Organization",
      "name": articleData.source,
      ...(articleData.sourceLink && articleData.sourceLink !== '#' && articleData.sourceLink.startsWith('http') && { "url": articleData.sourceLink })
    },
    "publisher": {
      "@type": "Organization",
      "name": "NewsHunt",
      "logo": {
        "@type": "ImageObject",
        "url": new URL(defaultOgImageRelativePath, metadataBaseUrl).toString()
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": canonicalUrl
    }
  };

  return {
    title: articleData.title,
    description: articleData.summary.substring(0, 160),
    keywords: keywords,
    authors: [{ name: articleData.source, url: (articleData.sourceLink && articleData.sourceLink !== '#' && articleData.sourceLink.startsWith('http')) ? articleData.sourceLink : siteUrlString }],
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
