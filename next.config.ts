
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
      // BBC
      {
        protocol: 'https',
        hostname: 'ichef.bbci.co.uk',
        port: '',
        pathname: '/**',
      },
      { // Also http for some older BBC images
        protocol: 'http',
        hostname: 'ichef.bbci.co.uk',
        port: '',
        pathname: '/**',
      },
      { // news.bbcimg.co.uk also used
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
       // Flipboard & its CDNs / aggregated content
      {
        protocol: 'https',
        hostname: '**.flipboard.com', // Wildcard for flipboard CDNs
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
        hostname: '*.googleusercontent.com', // Wildcard for googleusercontent
        port: '',
        pathname: '/**',
      },
      // The Guardian
      {
        protocol: 'https',
        hostname: 'i.guim.co.uk',
        port: '',
        pathname: '/**',
      },
      // CNBC
      {
        protocol: 'https',
        hostname: '*.cnbcfm.com', // Wildcard for cnbcfm.com
        port: '',
        pathname: '/**',
      },
       {
        protocol: 'https',
        hostname: 'fm.cnbc.com',
        port: '',
        pathname: '/**',
      },
      // New addition for the-independent.com images
      {
        protocol: 'https',
        hostname: 'static.the-independent.com',
        port: '',
        pathname: '/**',
      },
      // New addition for images.wsj.net
      {
        protocol: 'https',
        hostname: 'images.wsj.net',
        port: '',
        pathname: '/**',
      },
      // Reddit images
      {
        protocol: 'https',
        hostname: 'i.redd.it',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'external-preview.redd.it',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'preview.redd.it',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'styles.redditmedia.com', 
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
        hostname: 'www.livemint.com', // For images directly on their domain
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
        hostname: 'www.hindustantimes.com', // For images directly on their domain
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'tech.hindustantimes.com', // For tech section images
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'auto.hindustantimes.com', // For auto section images
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
        hostname: 'timesofindia.indiatimes.com', // For images directly on their domain
        port: '',
        pathname: '/**',
      },
      // Other generic CDNs that might be used
      {
        protocol: 'https',
        hostname: 'media.zenfs.com', // Yahoo/Verizon Media
        port: '',
        pathname: '/**',
      }
    ],
  },
};

export default nextConfig;

