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
      {
        protocol: 'https',
        hostname: 'ichef.bbci.co.uk',
        port: '',
        pathname: '/**',
      },
      { // For CNN
        protocol: 'https',
        hostname: '**.cnn.com', 
        port: '',
        pathname: '/**',
      },
      { // For Reuters
        protocol: 'https',
        hostname: '**.reuters.com',
        port: '',
        pathname: '/**',
      },
      { // For Google News (common pattern)
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      { // For The Guardian
        protocol: 'https',
        hostname: 'i.guim.co.uk',
        port: '',
        pathname: '/**',
      },
      { // For CNBC (common pattern for images)
        protocol: 'https',
        hostname: '**.cnbcfm.com',
        port: '',
        pathname: '/**',
      },
       { // For CNBC (another common pattern for images)
        protocol: 'https',
        hostname: 'fm.cnbc.com',
        port: '',
        pathname: '/**',
      },
      { // For NDTV
        protocol: 'https',
        hostname: '**.ndtvimg.com',
        port: '',
        pathname: '/**',
      },
      { // For NDTV (another pattern)
        protocol: 'https',
        hostname: 'c.ndtvimg.com',
        port: '',
        pathname: '/**',
      },
      // Add more specific patterns if general ones above are too broad or don't work
      // e.g. for The Guardian if i.guim.co.uk isn't enough:
      // { protocol: 'https', hostname: 'static.guim.co.uk', pathname: '/**' },
    ],
  },
};

export default nextConfig;
