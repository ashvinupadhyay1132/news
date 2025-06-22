
import { NextResponse, type NextRequest } from 'next/server';
import { getAdminAuthStatus } from '@/lib/jwt';
import { getArticles as getAllArticles, type Article } from '@/lib/placeholder-data';
import { getArticlesCollection } from '@/lib/mongodb';
import { z } from 'zod';
import { slugify } from '@/lib/utils';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

function handleUnauthorized(auth: { success: boolean; reason?: string }): NextResponse | null {
    if (auth.success) return null;

    let message = 'Forbidden: Admin access required.';
    switch (auth.reason) {
        case 'NO_TOKEN':
            message = 'Forbidden: Authentication token not found.';
            break;
        case 'INVALID_TOKEN':
            message = 'Forbidden: Invalid or expired token.';
            break;
        case 'NOT_ADMIN':
            message = 'Forbidden: User does not have admin privileges.';
            break;
    }
    return NextResponse.json({ success: false, message }, { status: 403 });
}


// GET all articles for the admin panel
export async function GET(request: NextRequest) {
  const auth = getAdminAuthStatus();
  const unauthorizedResponse = handleUnauthorized(auth);
  if (unauthorizedResponse) return unauthorizedResponse;

  const searchParams = request.nextUrl.searchParams;
  const countOnly = searchParams.get('countOnly') === 'true';

  try {
    const articlesCollection = await getArticlesCollection();
    
    if (countOnly) {
        const totalArticles = await articlesCollection.countDocuments();
        return NextResponse.json({ success: true, totalArticles });
    }

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '15', 10);
    
    const { articles, totalArticles } = await getAllArticles(undefined, undefined, page, limit);

    return NextResponse.json({ success: true, articles, totalArticles });

  } catch (error: any) {
    console.error('[API Admin GET Articles] Error:', error);
    return NextResponse.json({ success: false, message: 'Failed to retrieve articles.', error: error.message }, { status: 500 });
  }
}

// POST a new article
export async function POST(request: NextRequest) {
  const auth = getAdminAuthStatus();
  const unauthorizedResponse = handleUnauthorized(auth);
  if (unauthorizedResponse) return unauthorizedResponse;
  
  try {
    const json = await request.json();
    const articleFormSchema = z.object({
        title: z.string().min(10).max(200),
        summary: z.string().min(20).max(500),
        content: z.string().optional(),
        category: z.string().min(2),
        source: z.string().min(2),
        sourceLink: z.string().url(),
        imageUrl: z.string().url().optional().or(z.literal('')),
    });
    
    const parsedData = articleFormSchema.safeParse(json);

    if (!parsedData.success) {
        return NextResponse.json({ success: false, message: 'Invalid data provided.', errors: parsedData.error.flatten().fieldErrors }, { status: 400 });
    }
    
    const { title, summary, content, category, source, sourceLink, imageUrl } = parsedData.data;

    const articlesCollection = await getArticlesCollection();
    
    // Generate unique ID and link
    const uniqueIdPart = randomUUID();
    const slugTitle = slugify(title);
    const finalId = `${slugTitle.substring(0, 80)}-${uniqueIdPart}`;
    const finalLink = `/${slugify(category)}/${finalId}`;
    
    const newArticle = {
        id: finalId,
        title: title.trim(),
        summary,
        content: content || summary,
        category,
        source,
        sourceLink,
        imageUrl: imageUrl || null,
        link: finalLink,
        date: new Date(),
        fetchedAt: new Date(),
        createdAt: new Date()
    };

    const insertResult = await articlesCollection.insertOne(newArticle);

    if (!insertResult.acknowledged || !insertResult.insertedId) {
        throw new Error('Failed to insert article into the database.');
    }
    
    const createdArticle = await articlesCollection.findOne({ _id: insertResult.insertedId });

    return NextResponse.json({ success: true, message: 'Article created successfully.', article: createdArticle }, { status: 201 });

  } catch (error: any) {
    console.error('[API Admin Create Article] Error:', error);
    if (error.code === 11000) { // MongoDB duplicate key error
        return NextResponse.json({ success: false, message: 'An article with a similar title or link may already exist.' }, { status: 409 });
    }
    return NextResponse.json({ success: false, message: 'Failed to create article.', error: error.message }, { status: 500 });
  }
}
