
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
      // Google News & other Google services
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // Common for Google images
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
        hostname: '*.googleusercontent.com', // Broader pattern for user content
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
        hostname: '*.ndtvimg.com', // Broader pattern for ndtvimg.com subdomains
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
      // Add other general CDNs if observed frequently
      // Example: Akamai
      // {
      //   protocol: 'https',
      //   hostname: '*.akamaihd.net',
      //   port: '',
      //   pathname: '/**',
      // },
    ],
  },
};

export default nextConfig;
