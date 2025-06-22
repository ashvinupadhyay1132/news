
import type { Metadata, ResolvingMetadata } from 'next';
import { getArticleById, getArticles, type Article } from '@/lib/placeholder-data';
import ArticlePageClientContent from '@/components/article-page-client-content';
import { NewspaperIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link'; // For the fallback "Not Found" state

const SITE_BASE_URL = 'https://www.newshunt.blog';
const DEFAULT_OG_IMAGE_URL = 'https://placehold.co/1200x630.png'; // Updated to use a placeholder

type Props = {
  params: { id: string; category: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

export async function generateMetadata(
  { params }: Props,
  _parent: ResolvingMetadata
): Promise<Metadata> {
  const id = params.id;
  const article = await getArticleById(id);

  if (!article) {
    return {
      title: 'Article Not Found | NewsHunt',
      description: 'The article you are looking for could not be found.',
      alternates: {
        canonical: `${SITE_BASE_URL}/${params.category}/${params.id}/not-found`,
      },
      openGraph: {
        title: 'Article Not Found | NewsHunt',
        description: 'The article you are looking for could not be found.',
        url: `${SITE_BASE_URL}/${params.category}/${params.id}/not-found`,
        images: [{ url: DEFAULT_OG_IMAGE_URL, width: 1200, height: 630, alt: 'NewsHunt - Article Not Found' }],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Article Not Found | NewsHunt',
        description: 'The article you are looking for could not be found.',
        images: [DEFAULT_OG_IMAGE_URL],
      },
    };
  }

  const ogImage = (article.imageUrl && article.imageUrl.startsWith('http')) ? article.imageUrl : DEFAULT_OG_IMAGE_URL;
  const pageUrl = `${SITE_BASE_URL}${article.link}`; // Use article.link which is /category/id

  return {
    title: `${article.title} | NewsHunt`, // Simplified title
    description: article.summary.substring(0, 160),
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title: `${article.title} | NewsHunt`,
      description: article.summary.substring(0, 200),
      url: pageUrl,
      siteName: 'NewsHunt',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: article.title,
        },
      ],
      locale: 'en_US',
      type: 'article',
      publishedTime: new Date(article.date).toISOString(),
      authors: [article.source],
      // section: article.category, // Could add if desired
    },
    twitter: {
      card: 'summary_large_image',
      title: `${article.title} | NewsHunt`,
      description: article.summary.substring(0, 200),
      images: [ogImage],
    },
  };
}

export default async function ArticlePageContainer({ params }: Props) {
  const article = await getArticleById(params.id);

  if (!article) {
    // Fallback UI if article not found, consistent with generateMetadata
    return (
      <div className="text-center py-12 max-w-2xl mx-auto">
        <NewspaperIcon className="mx-auto h-16 w-16 text-muted-foreground mb-6" />
        <h1 className="text-3xl font-semibold mb-4">Article Not Found</h1>
        <p className="text-muted-foreground mb-8">
          The article you were looking for (ID: {params.id}) does not exist or may have been moved.
        </p>
        <Button asChild className="group flex items-center text-sm mx-auto">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" /> Go to Homepage
          </Link>
        </Button>
      </div>
    );
  }

  // Fetch relevant articles: 4 articles from the same category, excluding the current one.
  const { articles: relevantArticles } = await getArticles(undefined, article.category, 1, 4, article.id);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    image: article.imageUrl ? [article.imageUrl] : [DEFAULT_OG_IMAGE_URL],
    datePublished: new Date(article.date).toISOString(),
    dateModified: article.fetchedAt ? new Date(article.fetchedAt).toISOString() : new Date(article.date).toISOString(),
    author: {
      '@type': 'Organization', // Or 'Person' if you have author names
      name: article.source,
    },
    publisher: {
      '@type': 'Organization',
      name: 'NewsHunt',
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_BASE_URL}/logo.svg`, // Assuming you have a logo
      },
    },
    description: article.summary.substring(0, 250), // Longer summary for LD-JSON
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_BASE_URL}${article.link}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ArticlePageClientContent article={article} relevantArticles={relevantArticles} />
    </>
  );
}
