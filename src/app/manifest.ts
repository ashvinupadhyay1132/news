
import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NewsHunt - Your Daily News Digest',
    short_name: 'NewsHunt',
    description: 'Stay updated with the latest trending news from NewsHunt, covering technology, business, sports, and more from around the world.',
    start_url: '/',
    display: 'standalone',
    background_color: '#fafafa',
    theme_color: '#fafafa',
    icons: [
      {
        src: '/logo.svg',
        sizes: '48x48 72x72 96x96 128x128 256x256 512x512',
        type: 'image/svg+xml',
        purpose: 'any maskable'
      },
    ],
  }
}
