
import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.newshunt.blog";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl), // Essential for resolving relative asset paths
  title: {
    default: 'NewsHunt - Your Daily News Digest',
    template: '%s | NewsHunt',
  },
  description: 'Stay updated with the latest trending news and articles from around the world, curated by NewsHunt.',
  keywords: ['news', 'headlines', 'latest news', 'world news', 'technology', 'sports', 'business', 'entertainment', 'india news', 'current affairs', 'newshunt'],
  authors: [{ name: 'NewsHunt Team', url: siteUrl }],
  creator: 'NewsHunt Team',
  publisher: 'NewsHunt',
  alternates: {
    canonical: '/', // Canonical for the homepage
    types: {
      'application/rss+xml': [{ url: '/api/rss', title: 'NewsHunt RSS Feed' }],
    },
  },
  openGraph: {
    title: {
      default: 'NewsHunt - Your Daily News Digest',
      template: '%s | NewsHunt',
    },
    description: 'Stay updated with the latest trending news and articles from around the world, curated by NewsHunt.',
    url: siteUrl, // Base URL for Open Graph
    siteName: 'NewsHunt',
    images: [
      {
        url: '/default-og-image.png', // Relative to metadataBase
        width: 1200,
        height: 630,
        alt: 'NewsHunt - Your Daily News Digest',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: {
      default: 'NewsHunt - Your Daily News Digest',
      template: '%s | NewsHunt',
    },
    description: 'Stay updated with the latest trending news and articles from around the world, curated by NewsHunt.',
    // siteId: '@yourtwitterhandle', // Optional: Your Twitter ID
    // creator: '@yourtwitterhandle', // Optional: Creator's Twitter ID
    images: [`${siteUrl}/default-og-image.png`], // Must be an absolute URL for Twitter
  },
  icons: {
    icon: '/favicon.ico', // Relative to metadataBase
    shortcut: '/favicon-16x16.png', // Relative to metadataBase
    apple: '/apple-touch-icon.png', // Relative to metadataBase
  },
  manifest: '/site.webmanifest', // Relative to metadataBase
  robots: { // Default robots policy
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
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F0F4F8' },
    { media: '(prefers-color-scheme: dark)', color: '#1A202C' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* RSS feed link in head is good practice */}
        <link rel="alternate" type="application/rss+xml" title="NewsHunt RSS Feed" href="/api/rss" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen bg-background text-foreground`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Header />
          <main className="flex-grow container mx-auto px-4 py-8">
            {children}
          </main>
          <Footer />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
