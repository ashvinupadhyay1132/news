
import Head from 'next/head';
import { useEffect, useState } from 'react';
// Note: This page uses client-side fetching. For SSR/SSG, consider `getServerSideProps` or `getStaticProps`.

export default function NewsPage() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchNews() {
      try {
        setLoading(true);
        const res = await fetch('/api/mint');
        if (!res.ok) {
          throw new Error(`Failed to fetch news: ${res.status}`);
        }
        const data = await res.json();
        setArticles(data);
      } catch (err) {
        setError(err.message);
        console.error("Error fetching news:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchNews();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'Date not available';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (e) {
      return 'Invalid date';
    }
  };

  const placeholderImageSrc = 'https://placehold.co/600x400.png';

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-center">Loading Mint News...</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="bg-white dark:bg-neutral-800 shadow-lg rounded-lg p-4 animate-pulse">
              <div className="w-full h-48 bg-neutral-300 dark:bg-neutral-700 rounded mb-4"></div>
              <div className="h-6 bg-neutral-300 dark:bg-neutral-700 rounded mb-2 w-3/4"></div>
              <div className="h-4 bg-neutral-300 dark:bg-neutral-700 rounded mb-1 w-full"></div>
              <div className="h-4 bg-neutral-300 dark:bg-neutral-700 rounded mb-1 w-5/6"></div>
              <div className="h-4 bg-neutral-300 dark:bg-neutral-700 rounded w-1/2 mt-2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-3xl font-bold mb-4 text-red-600">Error</h1>
        <p className="text-neutral-700 dark:text-neutral-300">Could not load news: {error}</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Mint News Feed</title>
        <meta name="description" content="Latest news from Mint, processed and cleaned." />
      </Head>
      <div className="bg-neutral-100 dark:bg-neutral-900 min-h-screen py-8">
        <div className="container mx-auto px-4">
          <header className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-neutral-800 dark:text-neutral-100">
              Mint News Feed
            </h1>
          </header>

          {articles.length === 0 && !loading && (
            <p className="text-center text-neutral-600 dark:text-neutral-400 text-xl">
              No articles found or unable to fetch the feed at this moment.
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.map((article, index) => (
              <div 
                key={article.link || index} 
                className="bg-white dark:bg-neutral-800 shadow-xl rounded-lg overflow-hidden flex flex-col transform transition-all duration-300 hover:scale-105"
              >
                {article.image ? (
                  <img 
                    src={article.image} 
                    alt={article.title || 'Article image'} 
                    className="w-full h-56 object-cover" 
                    data-ai-hint="news article image"
                    onError={(e) => {
                        e.currentTarget.onerror = null; // prevents looping
                        e.currentTarget.src = placeholderImageSrc;
                        e.currentTarget.alt = 'Placeholder image';
                    }}
                  />
                ) : (
                  <img 
                    src={placeholderImageSrc} 
                    alt="Placeholder image" 
                    className="w-full h-56 object-cover bg-neutral-200 dark:bg-neutral-700"
                    data-ai-hint="news placeholder"
                  />
                )}
                <div className="p-6 flex flex-col flex-grow">
                  <h2 className="text-xl font-semibold mb-3 text-neutral-800 dark:text-neutral-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    <a href={article.link} target="_blank" rel="noopener noreferrer">
                      {article.title || 'Untitled Article'}
                    </a>
                  </h2>
                  <p className="text-neutral-600 dark:text-neutral-300 text-sm mb-4 flex-grow line-clamp-4">
                    {article.description || 'No description available.'}
                  </p>
                  <div className="mt-auto pt-3 border-t border-neutral-200 dark:border-neutral-700">
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                       Published: {formatDate(article.pubDate)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
