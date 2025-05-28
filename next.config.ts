
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      // RSSHub itself
      {
        protocol: 'https',
        hostname: 'rsshub.app',
        port: '',
        pathname: '/**',
      },
      // BBC via RSSHub or direct
      {
        protocol: 'https',
        hostname: 'ichef.bbci.co.uk',
        port: '',
        pathname: '/**',
      },
      { 
        protocol: 'http',
        hostname: 'ichef.bbci.co.uk',
        port: '',
        pathname: '/**',
      },
      { 
        protocol: 'https',
        hostname: 'news.bbcimg.co.uk',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'news.bbcimg.co.uk',
        port: '',
        pathname: '/**',
      },
       // Flipboard & its CDNs / aggregated content (keeping in case RSSHub uses them)
      {
        protocol: 'https',
        hostname: '**.flipboard.com', 
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'flipboard.com',
        port: '',
        pathname: '/**',
      },
      // Common image CDNs
      {
        protocol: 'https',
        hostname: '**.wp.com', 
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.imgix.net', 
        port: '',
        pathname: '/**',
      },
      // Google News & other Google services (might be linked by other feeds)
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
       {
        protocol: 'https',
        hostname: 'news.google.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com', 
        port: '',
        pathname: '/**',
      },
      // The Guardian (keeping in case)
      {
        protocol: 'https',
        hostname: 'i.guim.co.uk',
        port: '',
        pathname: '/**',
      },
      // CNBC (keeping in case)
      {
        protocol: 'https',
        hostname: '*.cnbcfm.com', 
        port: '',
        pathname: '/**',
      },
       {
        protocol: 'https',
        hostname: 'fm.cnbc.com',
        port: '',
        pathname: '/**',
      },
      // New addition for the-independent.com images (keeping in case)
      {
        protocol: 'https',
        hostname: 'static.the-independent.com',
        port: '',
        pathname: '/**',
      },
      // New addition for images.wsj.net (keeping in case)
      {
        protocol: 'https',
        hostname: 'images.wsj.net',
        port: '',
        pathname: '/**',
      },
      // Mint (livemint.com)
      {
        protocol: 'https',
        hostname: 'images.livemint.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.livemint.com', 
        port: '',
        pathname: '/**',
      },
      // Hindustan Times (hindustantimes.com)
      {
        protocol: 'https',
        hostname: 'images.hindustantimes.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.hindustantimes.com', 
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'tech.hindustantimes.com', 
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'auto.hindustantimes.com', 
        port: '',
        pathname: '/**',
      },
      // Times of India (timesofindia.indiatimes.com)
      {
        protocol: 'https',
        hostname: 'static.toiimg.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'timesofindia.indiatimes.com', 
        port: '',
        pathname: '/**',
      },
      // Other generic CDNs that might be used
      {
        protocol: 'https',
        hostname: 'media.zenfs.com', // Yahoo/Verizon Media
        port: '',
        pathname: '/**',
      },
      // Bing images (often used by RSSHub Bing news)
      {
        protocol: 'https',
        hostname: '*.bing.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'th.bing.com',
        port: '',
        pathname: '/**',
      },
      // ESPN images (common CDN a.espncdn.com) - though RSSHub might proxy
       {
        protocol: 'https',
        hostname: 'a.espncdn.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.espncdn.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
