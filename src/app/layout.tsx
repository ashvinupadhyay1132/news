
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

const siteUrlString = process.env.NEXT_PUBLIC_SITE_URL || "https://www.newshunt.blog";
let metadataBaseUrl: URL; // Ensure it's always a URL object
try {
  metadataBaseUrl = new URL(siteUrlString);
} catch (e) {
  console.error(`[Layout] Invalid NEXT_PUBLIC_SITE_URL for metadataBase: "${siteUrlString}". Error: ${(e as Error).message}. Falling back to default.`);
  metadataBaseUrl = new URL("https://www.newshunt.blog"); // Fallback to a known good default
}

const defaultOgImageRelativePath = '/default-og-image.png';
// For OpenGraph images, Next.js will resolve relative paths using metadataBase
// For Twitter images, an absolute URL is often safer / required by some validators.
const absoluteDefaultOgImageUrl = new URL(defaultOgImageRelativePath, metadataBaseUrl).toString();


export const metadata: Metadata = {
  metadataBase: metadataBaseUrl,
  title: {
    default: 'NewsHunt - Your Daily News Digest',
    template: '%s | NewsHunt',
  },
  description: 'Stay updated with the latest trending news and articles from around the world, curated by NewsHunt.',
  keywords: ['news', 'headlines', 'latest news', 'world news', 'technology', 'sports', 'business', 'entertainment', 'india news', 'current affairs', 'newshunt'],
  authors: [{ name: 'NewsHunt Team', url: metadataBaseUrl.toString() }],
  creator: 'NewsHunt Team',
  publisher: 'NewsHunt',
  alternates: {
    canonical: '/',
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
    url: '/', // Relative to metadataBase
    siteName: 'NewsHunt',
    images: [
      {
        url: defaultOgImageRelativePath, // Relative to metadataBase
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
    images: [absoluteDefaultOgImageUrl],
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
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
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0A' },
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
