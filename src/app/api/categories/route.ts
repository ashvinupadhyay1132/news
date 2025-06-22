
import { NextResponse } from 'next/server';
import { getCategories } from '@/lib/placeholder-data';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const categories: string[] = await getCategories();
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error in /api/categories:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch categories', details: errorMessage }, { status: 500 });
  }
}
