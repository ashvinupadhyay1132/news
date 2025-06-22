import Link from 'next/link';
import Image from 'next/image';
import { Github, Linkedin } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();
<<<<<<< Updated upstream
  const email = "codecraft390@gmail.com";
=======
>>>>>>> Stashed changes

  return (
    <footer className="bg-card border-t border-border text-muted-foreground mt-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Left Side: Logo and Copyright */}
          <div className="text-center sm:text-left">
            <Link href="/" className="flex items-center justify-center sm:justify-start gap-2 mb-2 text-foreground hover:text-primary transition-colors">
              <Image src="/logo.svg" alt="NewsHunt Logo" width={20} height={20} className="h-5 w-5" />
              <span className="font-semibold">NewsHunt</span>
            </Link>
            <p className="text-sm">
              &copy; {currentYear} All rights reserved.
            </p>
          </div>

          {/* Right Side: Links and Developer Credit */}
          <div className="flex flex-col items-center sm:items-end gap-3">
            <div className="flex items-center gap-x-4 sm:gap-x-6">
              <div className="flex items-center gap-x-3">
                <Link href="https://github.com/ashvinupadhyay1132" aria-label="GitHub" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                  <Github size={20} />
                </Link>
                <Link href="https://www.linkedin.com/in/ashvin-upadhyay" aria-label="LinkedIn" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                  <Linkedin size={20} />
                </Link>
              </div>
            </div>
            <p className="text-xs">
              Developed by Ashvin Upadhyay.
            </p>
          </div>

        </div>
      </div>
    </footer>
  );
};

export default Footer;
