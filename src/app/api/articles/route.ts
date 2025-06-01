
import { NextResponse, type NextRequest } from 'next/server';
import { getArticles, type Article } from '@/lib/placeholder-data';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const searchTerm = searchParams.get('q') || undefined;
    const category = searchParams.get('category') || undefined;

    // Use the centralized getArticles function from placeholder-data.ts
    // This function handles fetching from MongoDB, including necessary query logic and error handling.
    const articles: Article[] = await getArticles(searchTerm, category);

    return NextResponse.json(articles);
  } catch (error) {
    console.error("Error in /api/articles:", error);
    // Log the full error object for better debugging
    console.error("Full error details:", error);
    return NextResponse.json({ error: 'Failed to fetch articles', details: 'An internal server error occurred.' }, { status: 500 });
  }
}
