
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
      // TechCrunch
      {
        protocol: 'https',
        hostname: 'techcrunch.com',
        port: '',
        pathname: '/**',
      },
      { // Common CDN for TechCrunch images
        protocol: 'https',
        hostname: '**.wp.com', // e.g., i0.wp.com, s.w.org (for plugins, etc.)
        port: '',
        pathname: '/**',
      },
      // Reuters
      {
        protocol: 'https',
        hostname: '**.reuters.com', // covers www.reuters.com, static.reuters.com etc.
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http', // Reuters sometimes uses http for images in feeds
        hostname: '**.reuters.com',
        port: '',
        pathname: '/**',
      },
      // NDTV
      {
        protocol: 'https',
        hostname: 'c.ndtvimg.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.ndtvimg.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'movies.ndtv.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'sports.ndtv.com',
        port: '',
        pathname: '/**',
      },
      // BBC
      {
        protocol: 'https',
        hostname: 'ichef.bbci.co.uk',
        port: '',
        pathname: '/**',
      },
      { 
        protocol: 'http', // BBC sometimes uses http in feeds
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
      // Live Science (Future PLC CDN)
      {
        protocol: 'https',
        hostname: 'cdn.mos.cms.futurecdn.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'vanilla.futurecdn.net', // Another Future PLC CDN
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.livescience.com', // Base domain for potential relative paths in content
        port: '',
        pathname: '/**',
      },
       // RSSHub itself (if any BBC feeds were still routed through it, though we switched to direct BBC)
      {
        protocol: 'https',
        hostname: 'rsshub.app',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;

    