
import { NextResponse, type NextRequest } from 'next/server';
import { getArticleById, type Article } from '@/lib/placeholder-data';

// The second argument provides { params }, which we destructure.
// The type { params: { id: string } } ensures `params` exists and `params.id` is a string.
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } } 
) {
  try {
    const id = params.id; // `id` is guaranteed to be a string by the type signature.

    // Now, we only need to check if the id (which is a string) is empty after trimming.
    if (!id.trim()) {
      console.error("Error in /api/articles/[id]: ID is an empty string.", { params });
      return NextResponse.json({ error: 'Article ID cannot be an empty string.' }, { status: 400 });
    }
    
    const article: Article | undefined = await getArticleById(id);

    if (article) {
      return NextResponse.json(article);
    } else {
      // Log when an article isn't found for a valid ID format.
      console.warn(`API: Article with ID ${id} not found via getArticleById.`);
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }
  } catch (error) {
    // `params.id` should be available here due to the function signature.
    const articleIdForLog = params?.id || "unknown_id_in_error_handler";
    console.error(`API Error in /api/articles/[id] for ID ${articleIdForLog}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error occurred';
    return NextResponse.json({ error: 'Failed to fetch article', details: errorMessage }, { status: 500 });
  }
}
