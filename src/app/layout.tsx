
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
const DEFAULT_OG_IMAGE_URL = `${SITE_BASE_URL}/default-og-image.png`; // Create a default OG image for your site

export const metadata: Metadata = {
  metadataBase: new URL(SITE_BASE_URL), // Important for resolving relative image paths
  title: {
    default: 'NewsHunt - Your Daily News Digest',
    template: '%s | NewsHunt', // For page-specific titles
  },
  description: 'Stay updated with the latest trending news from NewsHunt, covering technology, business, sports, and more from around the world.',
  keywords: ['news', 'headlines', 'latest news', 'world news', 'tech news', 'business news', 'sports news', 'india news', 'current events'],
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
    // site: '@YourTwitterHandle', // Optional: Your Twitter handle
    // creator: '@YourTwitterHandle', // Optional: Creator's Twitter handle
    images: [DEFAULT_OG_IMAGE_URL], 
  },
  robots: { // Basic robots directive
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
  // Verification for search engines (optional, can be done via DNS or HTML file too)
  // verification: {
  //   google: 'YOUR_GOOGLE_SITE_VERIFICATION_CODE',
  //   yandex: 'YOUR_YANDEX_VERIFICATION_CODE', 
  // },
};

const HeaderFallback = () => (
  <header className="bg-card border-b border-border/60 sticky top-0 z-50">
    <div className="container mx-auto px-4 py-3 flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0">
      <div className="flex items-center space-x-2.5">
        <Skeleton className="h-7 w-7 rounded" />
        <Skeleton className="h-7 w-24 rounded" />
      </div>
      <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-3 sm:gap-x-4 gap-y-2 w-full sm:w-auto">
        <Skeleton className="h-10 w-40 xs:w-52 sm:w-64 rounded-md" /> {/* Search bar placeholder */}
        <Skeleton className="h-10 w-10 rounded-full" /> {/* Mode toggle placeholder */}
        <Skeleton className="h-10 w-24 rounded-md" /> {/* Login/Admin buttons placeholder */}
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
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Favicon links - ensure you have these files in your /public folder */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" /> 
        <meta name="google-site-verification" content="Tbzc8VnJxfh99RdXM_4sthXFogATcvdjM6a8LOv2BTc" />
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
