
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
      // BBC News
      {
        protocol: 'https',
        hostname: 'ichef.bbci.co.uk',
        port: '',
        pathname: '/**',
      },
      // RSSHub (might proxy images or link to various sources)
      {
        protocol: 'https',
        hostname: 'rsshub.app', // For images proxied by RSSHub itself
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http', // RSSHub might link to http images
        hostname: 'rsshub.app',
        port: '',
        pathname: '/**',
      },
       // Flipboard & its CDNs / aggregated content
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
      // Common image CDNs often used by news sites aggregated by Flipboard/RSSHub
      {
        protocol: 'https',
        hostname: '**.wp.com', // WordPress images (e.g., i0.wp.com, i1.wp.com)
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.imgix.net', // Imgix CDN
        port: '',
        pathname: '/**',
      },
      // Bing often uses these for images
      {
        protocol: 'https',
        hostname: '**.bing.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'th.bing.com', // Specifically for Bing image thumbnails
        port: '',
        pathname: '/**',
      },
      // Google News & other Google services (kept as Bing might link to them)
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
      // NDTV (kept in case Bing News links to it, though primary feed removed)
      {
        protocol: 'https',
        hostname: 'c.ndtvimg.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.ndtvimg.com',
        port: '',
        pathname: '/**',
      },
      // Common CDNs that might be used by various news outlets
      { 
        protocol: 'https',
        hostname: '*.cnn.com', 
        port: '',
        pathname: '/**',
      },
      { 
        protocol: 'https',
        hostname: '*.reuters.com',
        port: '',
        pathname: '/**',
      },
      { 
        protocol: 'https',
        hostname: 'i.guim.co.uk', // The Guardian
        port: '',
        pathname: '/**',
      },
      { 
        protocol: 'https',
        hostname: '*.cnbcfm.com', // CNBC
        port: '',
        pathname: '/**',
      },
       { 
        protocol: 'https',
        hostname: 'fm.cnbc.com', // CNBC
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;

