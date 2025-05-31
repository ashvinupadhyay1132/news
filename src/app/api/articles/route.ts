
import { NextResponse, type NextRequest } from 'next/server';
import { getArticles, type Article } from '@/lib/placeholder-data';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const searchTerm = searchParams.get('q') || undefined;
    const category = searchParams.get('category') || undefined;
    const skipOg = searchParams.get('skipOg') === 'true';

    // Pass !skipOg as fetchOgImagesParam to getArticles
    // isForCategoriesOnly is false here because we need full article data for the grid
    const articles: Article[] = await getArticles(searchTerm, category, false, !skipOg);
    return NextResponse.json(articles);
  } catch (error) {
    console.error("Error in /api/articles:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch articles', details: errorMessage }, { status: 500 });
  }
}
