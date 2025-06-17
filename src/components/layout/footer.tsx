
import Link from 'next/link';
import { Github, Linkedin } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border py-10 text-center text-muted-foreground">
      <div className="container mx-auto px-4">
        <Separator className="my-6 sm:my-8" />
        <p className="mb-6 text-sm">&copy; {new Date().getFullYear()} newshunt.blog. All rights reserved.</p>
        <p className="mb-6 text-sm">developed by Ashvin Upadhyay</p>
        <div className="flex justify-center space-x-6 mb-6">
          <Link href="https://github.com/ashvinupadhyay1132" aria-label="GitHub" className="hover:text-primary transition-colors">
            <Github size={24} />
          </Link>

          <Link href="https://www.linkedin.com/in/ashvin-upadhyay" aria-label="LinkedIn" className="hover:text-primary transition-colors">
            <Linkedin size={24} />
          </Link>
        </div>

      </div>
    </footer>
  );
};

export default Footer;

