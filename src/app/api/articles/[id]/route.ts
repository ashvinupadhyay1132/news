
import { NextResponse, type NextRequest } from 'next/server';
import { getArticleById, type Article } from '@/lib/placeholder-data';

interface RouteContext {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    // Check if context, context.params are defined, and if id is a non-empty string
    if (!context || !context.params || typeof context.params.id !== 'string' || !context.params.id.trim()) {
      console.error("Error in /api/articles/[id]: Route params or id is missing or invalid.", { params: context?.params });
      return NextResponse.json({ error: 'Article ID is missing or invalid in request parameters.' }, { status: 400 });
    }
    
    const { id } = context.params;

    const article: Article | undefined = await getArticleById(id);

    if (article) {
      return NextResponse.json(article);
    } else {
      // Log when an article isn't found for a valid ID format.
      console.log(`API: Article with ID ${id} not found via getArticleById.`);
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }
  } catch (error) {
    // Safely access id for logging.
    const articleIdForLog = context?.params?.id || "unknown_or_missing_id_in_context";
    console.error(`API Error in /api/articles/[id] for ID ${articleIdForLog}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error occurred';
    return NextResponse.json({ error: 'Failed to fetch article', details: errorMessage }, { status: 500 });
  }
}
