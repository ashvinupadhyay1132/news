
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
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
        hostname: '**.wp.com', // e.g., i0.wp.com, s.w.org (often used by TechCrunch)
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
        hostname: '**.toiimg.com', // Changed from static.toiimg.com
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.timesofindia.indiatimes.com',
        port: '',
        pathname: '/**',
      },
      // Indian Express
      {
        protocol: 'https',
        hostname: 'indianexpress.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.indianexpress.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.indianexpress.com',
        port: '',
        pathname: '/**',
      },
      // Economic Times
      {
        protocol: 'https',
        hostname: 'economictimes.indiatimes.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img.etimg.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.economictimes.indiatimes.com',
        port: '',
        pathname: '/**',
      },
      // RSSHub (generic, often used for proxying)
      {
        protocol: 'https',
        hostname: 'rsshub.app',
        port: '',
        pathname: '/**',
      },
      // Bing (for RSSHub - Bing Sports)
      {
        protocol: 'https',
        hostname: 'th.bing.com', // Common for Bing images
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.bing.com', // General Bing
        port: '',
        pathname: '/**',
      },
      // ESPN (for RSSHub - ESPN, though might be proxied by RSSHub directly)
      {
        protocol: 'https',
        hostname: 'a.espncdn.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.espncdn.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  /*
  experimental: {
    // Add the allowedDevOrigins configuration here
    allowedDevOrigins: ["https://6000-firebase-studio-1748421122628.cluster-ys234awlzbhwoxmkkse6qo3fz6.cloudworkstations.dev"],
  },
  */
};

export default nextConfig;
