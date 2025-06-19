
import type { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, MessageSquare, Github, Linkedin } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Contact NewsHunt',
  description: 'Get in touch with NewsHunt. We welcome your feedback, questions, and suggestions.',
   openGraph: {
    title: 'Contact NewsHunt',
    description: 'Reach out to the NewsHunt team.',
  }
};

const email = "ashvinupadhyay1132@gmail.com";
const githubLink = "https://github.com/ashvinupadhyay1132";
const linkedinLink = "https://www.linkedin.com/in/ashvin-upadhyay";

export default function ContactPage() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <header className="text-center mb-12">
        <h1 className="text-4xl sm:text-5xl font-bold text-primary tracking-tight">
          Contact Us
        </h1>
        <p className="mt-4 text-xl text-muted-foreground">
          We&apos;d love to hear from you! Whether you have a question, feedback, or a suggestion, feel free to reach out.
        </p>
      </header>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center mb-3">
            <MessageSquare className="h-8 w-8 text-primary mr-3" />
            <CardTitle className="text-2xl">Send Us a Message</CardTitle>
          </div>
          <CardDescription className="text-base">
            The best way to reach us is via email. We&apos;ll do our best to respond as quickly as possible.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start space-x-3">
            <Mail className="h-6 w-6 text-muted-foreground mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-foreground">Email</h3>
              <a href={`mailto:${email}`} className="text-primary hover:underline break-all">
                {email}
              </a>
              <p className="text-sm text-muted-foreground mt-1">
                For general inquiries, support, or feedback.
              </p>
            </div>
          </div>

          <div className="border-t pt-6 space-y-3">
             <h3 className="text-lg font-semibold text-foreground">Connect with the Developer</h3>
            <div className="flex items-center space-x-4">
                <Button variant="outline" asChild>
                    <Link href={githubLink} target="_blank" rel="noopener noreferrer">
                        <Github className="mr-2 h-5 w-5" /> GitHub
                    </Link>
                </Button>
                <Button variant="outline" asChild>
                    <Link href={linkedinLink} target="_blank" rel="noopener noreferrer">
                        <Linkedin className="mr-2 h-5 w-5" /> LinkedIn
                    </Link>
                </Button>
            </div>
          </div>
        </CardContent>
      </Card>

       <div className="mt-12 text-center">
        <p className="text-muted-foreground mb-4">
          Your input helps us make NewsHunt better. Thank you for your interest!
        </p>
        <Button asChild size="lg" variant="outline">
          <Link href="/">Back to Home</Link>
        </Button>
      </div>
    </div>
  );
}
