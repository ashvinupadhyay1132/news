
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
      // Google News & other Google services (covers lh3.googleusercontent.com, news.google.com images etc.)
      {
        protocol: 'https',
        hostname: '**.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
       {
        protocol: 'https',
        hostname: 'news.google.com', // For images directly hosted or linked by news.google.com
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
        hostname: '**.ndtvimg.com', // Broader pattern for ndtvimg.com subdomains
        port: '',
        pathname: '/**',
      },
      // General CDNs that might be used by various news outlets - add cautiously
      // Example: Add Akamai if you notice many feeds use it.
      // {
      //   protocol: 'https',
      //   hostname: '**.akamaihd.net',
      //   port: '',
      //   pathname: '/**',
      // },
      // Keeping some of the previously added ones if they are common patterns
      { 
        protocol: 'https',
        hostname: '**.cnn.com', 
        port: '',
        pathname: '/**',
      },
      { 
        protocol: 'https',
        hostname: '**.reuters.com',
        port: '',
        pathname: '/**',
      },
      { 
        protocol: 'https',
        hostname: 'i.guim.co.uk',
        port: '',
        pathname: '/**',
      },
      { 
        protocol: 'https',
        hostname: '**.cnbcfm.com',
        port: '',
        pathname: '/**',
      },
       { 
        protocol: 'https',
        hostname: 'fm.cnbc.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
