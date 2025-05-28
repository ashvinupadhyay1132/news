
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
      { 
        protocol: 'https',
        hostname: '**.wp.com', // e.g., i0.wp.com, s.w.org 
        port: '',
        pathname: '/**',
      },
      // Reuters
      {
        protocol: 'https',
        hostname: '**.reuters.com', 
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http', 
        hostname: '**.reuters.com',
        port: '',
        pathname: '/**',
      },
      { // Reuters media cdn
        protocol: 'https',
        hostname: 'static.reuters.com',
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
       {
        protocol: 'https',
        hostname: 'www.ndtv.com',
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
      // Live Science (Future PLC CDN)
      {
        protocol: 'https',
        hostname: 'cdn.mos.cms.futurecdn.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'vanilla.futurecdn.net', 
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.livescience.com', 
        port: '',
        pathname: '/**',
      },
      // Times of India
      {
        protocol: 'https',
        hostname: 'timesofindia.indiatimes.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'static.toiimg.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.timesofindia.indiatimes.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
    
