
import { NextResponse, type NextRequest } from 'next/server';
import { getArticles } from '@/lib/placeholder-data';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const searchTerm = searchParams.get('q') || undefined;
    const category = searchParams.get('category') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '9', 10); // Default limit to 9

    // Use the centralized getArticles function from placeholder-data.ts
    // This function handles fetching from MongoDB, including necessary query logic and error handling.
    const result = await getArticles(searchTerm, category, page, limit);

    return NextResponse.json(result); // This will return { articles, totalArticles, hasMore }
  } catch (error) {
    console.error("Error in /api/articles:", error);
    // Log the full error object for better debugging
    console.error("Full error details:", error);
    return NextResponse.json({ error: 'Failed to fetch articles', details: 'An internal server error occurred.' }, { status: 500 });
  }
}
