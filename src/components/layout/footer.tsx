import Link from 'next/link';
import { Github, Twitter, Linkedin } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border py-8 text-center text-muted-foreground">
      <div className="container mx-auto px-4">
        <p className="mb-4">&copy; {new Date().getFullYear()} NewsFlash. All rights reserved.</p>
        <div className="flex justify-center space-x-4 mb-4">
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
        <p className="text-sm">
          Built with Next.js and Tailwind CSS.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
