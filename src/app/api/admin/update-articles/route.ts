
import { NextResponse, type NextRequest } from 'next/server';
import { updateArticlesFromRssAndSaveToDb } from '@/lib/placeholder-data';

export async function GET(request: NextRequest) {
  console.log("API: /api/admin/update-articles - Request received.");
  const secret = request.nextUrl.searchParams.get('secret');
  if (process.env.UPDATE_SECRET && secret !== process.env.UPDATE_SECRET) {
    console.warn("API: /api/admin/update-articles - Unauthorized attempt. Missing or incorrect secret.");
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log("API: /api/admin/update-articles - Update process starting...");
    await updateArticlesFromRssAndSaveToDb();
    console.log("API: /api/admin/update-articles - Update process finished successfully.");
    return NextResponse.json({ message: 'Article update process triggered and completed successfully.' });
  } catch (error) {
    console.error("API: /api/admin/update-articles - Error during article update process:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during article update.';
    return NextResponse.json({ error: 'Failed to update articles', details: errorMessage }, { status: 500 });
  }
}
