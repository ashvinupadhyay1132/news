
import { NextResponse, type NextRequest } from 'next/server';
import { getArticles } from '@/lib/placeholder-data';

export async function GET(request: NextRequest) {
  console.log("API: /api/articles - Request received.");
  try {
    const searchParams = request.nextUrl.searchParams;
    const searchTerm = searchParams.get('q') || undefined;
    const category = searchParams.get('category') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '9', 10); // Default limit to 9

    console.log(`API: /api/articles - Parsed params: searchTerm: '${searchTerm}', category: '${category}', page: ${page}, limit: ${limit}`);

    const result = await getArticles(searchTerm, category, page, limit);

    console.log(`API: /api/articles - getArticles returned: ${result.articles.length} articles. Total in query: ${result.totalArticles}, HasMore: ${result.hasMore}. First title: ${result.articles[0]?.title.substring(0,50)}`);

    return NextResponse.json(result);
  } catch (error) {
    console.error("API ERROR in /api/articles route handler:", error);
    return NextResponse.json({ error: 'Failed to fetch articles', details: 'An internal server error occurred in API route.' }, { status: 500 });
  }
}
