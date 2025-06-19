
import type { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Target, Lightbulb } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About NewsHunt',
  description: 'Learn more about NewsHunt, our mission, and what drives us to deliver the best news aggregation experience.',
  openGraph: {
    title: 'About NewsHunt',
    description: 'Learn more about NewsHunt, our mission, and what drives us.',
  }
};

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <header className="text-center mb-12">
        <h1 className="text-4xl sm:text-5xl font-bold text-primary tracking-tight">
          About NewsHunt
        </h1>
        <p className="mt-4 text-xl text-muted-foreground">
          Your trusted source for aggregated news, curated for clarity and relevance.
        </p>
      </header>

      <div className="space-y-10">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <div className="flex items-center mb-3">
              <Target className="h-8 w-8 text-primary mr-3" />
              <CardTitle className="text-2xl">Our Mission</CardTitle>
            </div>
            <CardDescription className="text-base">
              To simplify how you consume news by bringing together diverse sources and perspectives into one accessible platform. We aim to help you stay informed efficiently.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-foreground/90">
              In a world overflowing with information, finding reliable and relevant news can be challenging. NewsHunt is designed to cut through the noise, offering a streamlined experience. We believe in the power of informed citizens and strive to provide a platform that is both comprehensive and easy to navigate.
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
             <div className="flex items-center mb-3">
              <Lightbulb className="h-8 w-8 text-primary mr-3" />
              <CardTitle className="text-2xl">What We Do</CardTitle>
            </div>
            <CardDescription className="text-base">
              NewsHunt aggregates news articles from various reputable sources across the web. Our platform organizes this content into intuitive categories, making it easy for you to find news on topics that matter most to you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-foreground/90">
              <li>Categorize news from multiple global and local sources.</li>
              <li>Provide a clean, user-friendly interface for easy reading.</li>
              <li>Offer quick summaries and direct links to original articles.</li>
              <li>Continuously work to improve content relevance and user experience.</li>
            </ul>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
             <div className="flex items-center mb-3">
              <Users className="h-8 w-8 text-primary mr-3" />
              <CardTitle className="text-2xl">Our Team</CardTitle>
            </div>
             <CardDescription className="text-base">
              NewsHunt is developed and maintained by a passionate individual dedicated to leveraging technology for better information access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-foreground/90">
              This platform is a project by Ashvin Upadhyay, driven by an interest in web development and the flow of information in the digital age. 
              We are committed to maintaining a high-quality service and welcome feedback for improvement.
            </p>
             <div className="mt-6 text-center">
              <Button asChild size="lg">
                <Link href="/contact">Get in Touch</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-16 text-center">
        <Button asChild size="lg" variant="outline">
          <Link href="/">Back to Home</Link>
        </Button>
      </div>
    </div>
  );
}
