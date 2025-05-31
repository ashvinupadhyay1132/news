
import Link from 'next/link';
import { Github, Twitter, Linkedin } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border py-10 text-center text-muted-foreground">
      <div className="container mx-auto px-4">
        <Separator className="my-6 sm:my-8" />
        <p className="mb-6 text-sm">&copy; {new Date().getFullYear()} TrendingNewsFeed.in. All rights reserved.</p>
        <div className="flex justify-center space-x-6 mb-6">
          <Link href="#" aria-label="GitHub" className="hover:text-primary transition-colors">
            <Github size={24} />
          </Link>
          <Link href="#" aria-label="Twitter" className="hover:text-primary transition-colors">
            <Twitter size={24} />
          </Link>
          <Link href="#" aria-label="LinkedIn" className="hover:text-primary transition-colors">
            <Linkedin size={24} />
          </Link>
        </div>
        <p className="text-xs">
          Built with Next.js and Tailwind CSS.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
