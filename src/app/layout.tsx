
import type {Metadata} from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import {ThemeProvider} from "@/components/theme-provider";
import { AuthProvider } from '@/context/AuthContext';
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from 'react';
import { Skeleton } from "@/components/ui/skeleton";

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const SITE_BASE_URL = 'https://www.newshunt.blog';
// Using a placeholder for the default OG image to prevent 404 errors.
const DEFAULT_OG_IMAGE_URL = 'https://placehold.co/1200x630.png'; 

export const metadata: Metadata = {
  metadataBase: new URL(SITE_BASE_URL),
  title: {
    default: 'NewsHunt - Your Daily News Digest',
    template: '%s | NewsHunt',
  },
  description: 'Stay updated with the latest trending news from NewsHunt, covering technology, business, sports, and more from around the world.',
  keywords: ['news', 'headlines', 'latest news', 'world news', 'tech news', 'business news', 'sports news', 'india news', 'current events', 'NewsHunt', 'News Hunt', 'news hunt'],
  alternates: {
    canonical: '/',
    types: {
      'application/rss+xml': [{ url: '/api/rss', title: 'NewsHunt RSS Feed' }],
    },
  },
  openGraph: {
    siteName: 'NewsHunt',
    type: 'website',
    locale: 'en_US',
    title: {
        default: 'NewsHunt - Your Daily News Digest',
        template: '%s | NewsHunt',
    },
    description: 'Stay updated with the latest trending news from NewsHunt.',
    url: SITE_BASE_URL,
    images: [
      {
        url: DEFAULT_OG_IMAGE_URL,
        width: 1200,
        height: 630,
        alt: 'NewsHunt - Daily News Digest',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: {
        default: 'NewsHunt - Your Daily News Digest',
        template: '%s | NewsHunt',
    },
    description: 'Stay updated with the latest trending news from NewsHunt.',
    images: [DEFAULT_OG_IMAGE_URL],
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
  verification: {
    google: 'qv4COP0z8EyCeMstpGr7YH327vGzsCPrJAAhsTJm2Ww',
  },
};

const HeaderFallback = () => (
  <header className="bg-card border-b border-border/60 sticky top-0 z-50">
    <div className="container mx-auto px-4 py-3 flex flex-col gap-3">
      <div className="flex justify-between items-center w-full">
        <div className="flex items-center space-x-2.5">
          <Skeleton className="h-7 w-7 rounded" />
          <Skeleton className="h-7 w-24 rounded" />
        </div>
        <div className="flex items-center gap-x-2 md:gap-x-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-10 w-36 rounded-md" />
        </div>
      </div>
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
        <Skeleton className="h-10 flex-grow rounded-md" />
        <Skeleton className="h-10 w-full sm:w-32 rounded-md" />
      </div>
    </div>
  </header>
);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  console.log('[RootLayout] Server-side rendering started for RootLayout.');
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'NewsHunt',
    url: SITE_BASE_URL,
    logo: `${SITE_BASE_URL}/logo.svg`,
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <link rel="icon" href="/logo.svg" type="image/svg+xml" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}>
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <Suspense fallback={<HeaderFallback />}>
              <Header />
            </Suspense>
            <main className="flex-grow container mx-auto px-4 py-8">
              {children}
            </main>
            <Footer />
            <Toaster />
          </ThemeProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
