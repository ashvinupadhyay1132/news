
import { NextResponse, type NextRequest } from 'next/server';
import { updateArticlesFromRssAndSaveToDb } from '@/lib/placeholder-data';

export const dynamic = 'force-dynamic'; // Ensure this route is always dynamically rendered

export async function GET(request: NextRequest) {
  console.log('[Cron API] Received request to trigger news fetch.');

  // Secure the endpoint
  if (process.env.NODE_ENV === 'production') {
    const authHeader = request.headers.get('authorization');
    if (!process.env.CRON_SECRET) {
      console.error('[Cron API] CRITICAL: CRON_SECRET is not set in the production environment. Aborting cron job. Please set this environment variable in Vercel.');
      return NextResponse.json({ success: false, error: 'Configuration error: CRON_SECRET missing.' }, { status: 500 });
    }
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.warn(`[Cron API] Unauthorized attempt to trigger news fetch. Auth header: "${authHeader ? authHeader.substring(0, 15) + '...' : 'Not provided'}"`);
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    console.log('[Cron API] Authorization successful in production environment.');
  } else {
    console.log('[Cron API] Running in non-production environment (e.g., local development). Skipping CRON_SECRET check.');
  }

  try {
    console.log('[Cron API] Starting updateArticlesFromRssAndSaveToDb function...');
    await updateArticlesFromRssAndSaveToDb();
    console.log('[Cron API] updateArticlesFromRssAndSaveToDb function completed successfully.');
    return NextResponse.json({ success: true, message: 'News fetch job processed successfully.' });
  } catch (error) {
    console.error('[Cron API] Error occurred during the news fetch process:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during the news fetch';
    return NextResponse.json({ success: false, error: 'Failed to process news fetch job', details: errorMessage }, { status: 500 });
  }
}
