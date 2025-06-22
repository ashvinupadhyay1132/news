
import { NextResponse, type NextRequest } from 'next/server';
import { getAdminAuthStatus } from '@/lib/jwt';
import { getArticlesCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { slugify } from '@/lib/utils';

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

// DELETE an article
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = getAdminAuthStatus();
  const unauthorizedResponse = handleUnauthorized(auth);
  if (unauthorizedResponse) return unauthorizedResponse;

  const articleId = params.id;
  if (!articleId) {
     return NextResponse.json({ success: false, message: 'Article ID is required.' }, { status: 400 });
  }

  try {
    const articlesCollection = await getArticlesCollection();
    
    // Find by custom 'id' field first, then by MongoDB '_id' if it's a valid ObjectId
    const query = ObjectId.isValid(articleId) 
      ? { $or: [{ id: articleId }, { _id: new ObjectId(articleId) }] }
      : { id: articleId };
      
    const deleteResult = await articlesCollection.deleteOne(query);

    if (deleteResult.deletedCount === 0) {
      return NextResponse.json({ success: false, message: 'Article not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Article deleted successfully.' });

  } catch (error: any) {
    console.error(`[API Admin Delete Article ID: ${articleId}] Error:`, error);
    return NextResponse.json({ success: false, message: 'An internal server error occurred.', error: error.message }, { status: 500 });
  }
}

// Schema for updating an article
const articleUpdateSchema = z.object({
  title: z.string().min(10).max(200),
  summary: z.string().min(20).max(500),
  content: z.string().optional(),
  category: z.string().min(2),
  source: z.string().min(2),
  sourceLink: z.string().url(),
  imageUrl: z.string().url().optional().or(z.literal('')),
});

// UPDATE an article
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = getAdminAuthStatus();
  const unauthorizedResponse = handleUnauthorized(auth);
  if (unauthorizedResponse) return unauthorizedResponse;

  const articleId = params.id;
  if (!articleId) {
     return NextResponse.json({ success: false, message: 'Article ID is required.' }, { status: 400 });
  }

  try {
    const json = await request.json();
    const parsedData = articleUpdateSchema.safeParse(json);

    if (!parsedData.success) {
        return NextResponse.json({ success: false, message: 'Invalid data provided.', errors: parsedData.error.flatten().fieldErrors }, { status: 400 });
    }

    const { title, summary, content, category, source, sourceLink, imageUrl } = parsedData.data;

    // The internal link depends on the category and ID. The ID itself shouldn't change, but if the category changes, the link should be updated.
    const finalLink = `/${slugify(category)}/${articleId}`;

    const updateData = {
        title: title.trim(),
        summary,
        content: content || summary,
        category,
        source,
        sourceLink,
        imageUrl: imageUrl || null,
        link: finalLink, // Update the link in case category changed
    };

    const articlesCollection = await getArticlesCollection();
    
    const query = ObjectId.isValid(articleId) 
      ? { $or: [{ id: articleId }, { _id: new ObjectId(articleId) }] }
      : { id: articleId };

    const updateResult = await articlesCollection.updateOne(
        query,
        { $set: updateData }
    );

    if (updateResult.matchedCount === 0) {
        return NextResponse.json({ success: false, message: 'Article not found.' }, { status: 404 });
    }

    const updatedArticle = await articlesCollection.findOne(query);
    if (updateResult.modifiedCount === 0) {
        return NextResponse.json({ success: true, message: 'No changes detected, but request was successful.', article: updatedArticle });
    }

    return NextResponse.json({ success: true, message: 'Article updated successfully.', article: updatedArticle });

  } catch (error: any) {
    console.error(`[API Admin Update Article ID: ${articleId}] Error:`, error);
    return NextResponse.json({ success: false, message: 'An internal server error occurred.', error: error.message }, { status: 500 });
  }
}
