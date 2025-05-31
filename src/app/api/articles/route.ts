
import { NextResponse, type NextRequest } from 'next/server';
import { getArticles, type Article } from '@/lib/placeholder-data';
import type { ParsedUrlQuery } from 'querystring';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query: ParsedUrlQuery = {};
    if (searchParams.has('q')) {
      query.q = searchParams.get('q') as string;
    }
    if (searchParams.has('category')) {
      query.category = searchParams.get('category') as string;
    }

    const articles: Article[] = await getArticles(query);
    return NextResponse.json(articles);
  } catch (error) {
    console.error("Error in /api/articles:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch articles', details: errorMessage }, { status: 500 });
  }
}
