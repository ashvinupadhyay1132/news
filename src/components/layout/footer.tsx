
import Link from 'next/link';
import { Github, Linkedin, Mail, Info, Newspaper } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const email = "ashvinupadhyay1132@gmail.com";

  return (
    <footer className="bg-card border-t border-border text-muted-foreground">
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center justify-center md:justify-start">
              <Newspaper className="mr-2 h-5 w-5" />
              NewsHunt
            </h3>
            <p className="text-sm">
              Your daily digest of trending news from around the world. Stay informed, stay ahead.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center justify-center md:justify-start">
              <Info className="mr-2 h-5 w-5" />
              Quick Links
            </h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="hover:text-primary transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center justify-center md:justify-start">
              <Mail className="mr-2 h-5 w-5" />
              Get In Touch
            </h3>
            <p className="text-sm mb-1">
              <a href={`mailto:${email}`} className="hover:text-primary transition-colors break-all">
                {email}
              </a>
            </p>
            <div className="flex justify-center md:justify-start space-x-4 mt-3">
              <Link href="https://github.com/ashvinupadhyay1132" aria-label="GitHub" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                <Github size={24} />
              </Link>
              <Link href="https://www.linkedin.com/in/ashvin-upadhyay" aria-label="LinkedIn" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                <Linkedin size={24} />
              </Link>
            </div>
          </div>
        </div>

        <Separator className="my-8" />
        <div className="text-center text-sm">
          <p>&copy; {currentYear} NewsHunt. All rights reserved.</p>
          <p className="mt-1">Developed by Ashvin Upadhyay.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
