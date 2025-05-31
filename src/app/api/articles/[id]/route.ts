
import { NextResponse, type NextRequest } from 'next/server';
import { getArticleById, type Article } from '@/lib/placeholder-data';

interface Context {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, context: Context) {
  try {
    const { id } = context.params;
    if (!id) {
      return NextResponse.json({ error: 'Article ID is required' }, { status: 400 });
    }
    const article: Article | undefined = await getArticleById(id as string);
    if (article) {
      return NextResponse.json(article);
    } else {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }
  } catch (error) {
    console.error(`Error in /api/articles/[id] for ID ${context.params.id}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch article', details: errorMessage }, { status: 500 });
  }
}
