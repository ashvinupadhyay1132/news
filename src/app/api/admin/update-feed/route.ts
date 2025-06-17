import { NextResponse, type NextRequest } from 'next/server';
import { updateArticlesFromRssAndSaveToDb, type ArticleUpdateStats } from '@/lib/placeholder-data';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log('[API /admin/update-feed] Received request to update feed.');
  console.log(`[API /admin/update-feed] Proceeding with feed update (no server-side session check).`);

  try {
    const stats: ArticleUpdateStats | undefined = await updateArticlesFromRssAndSaveToDb();
    
    const newArticlesCount = stats?.newlyAddedCount || 0;
    const message = newArticlesCount > 0 
      ? `Feed update process completed. ${newArticlesCount} new articles added.`
      : 'Feed is already up-to-date. No new articles found.';

    console.log(`[API /admin/update-feed] ${message}`);
    
    return NextResponse.json({
      success: true,
      message: message,
      newArticlesCount: newArticlesCount,
      details: stats 
        ? `Processed: ${stats.processedInBatch}, Skipped (Link): ${stats.skippedBySourceLink}, Skipped (Title): ${stats.skippedByTitle}` 
        : 'No detailed stats available.'
    });
  } catch (error: any) {
    console.error('[API /admin/update-feed] Error during feed update process:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update feed.', error: error.message, newArticlesCount: 0 },
      { status: 500 }
    );
  }
}
