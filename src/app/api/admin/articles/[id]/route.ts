
import { NextResponse, type NextRequest } from 'next/server';
import { getAdminAuthStatus } from '@/lib/jwt';
import { getArticlesCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { slugify } from '@/lib/utils';
import { revalidatePath } from 'next/cache';

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

    // Revalidate relevant paths
    revalidatePath('/');
    revalidatePath('/[category]/[id]', 'layout');
    revalidatePath('/sitemap.xml');
    revalidatePath('/api/rss');

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
  category: z.string().optional(),
  source: z.string().optional(),
  sourceLink: z.string().url().optional().or(z.literal('')),
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

    const updateData: { [key: string]: any } = {
        title: title.trim(),
        summary,
        content: content || summary,
    };
    
    // Only add optional fields to the update object if they were provided
    if (category) {
      updateData.category = category;
      // If category changes, the internal link must be updated as well
      updateData.link = `/${slugify(category)}/${articleId}`;
    }
    if (source) updateData.source = source;
    if (sourceLink) updateData.sourceLink = sourceLink;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl || null;


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

    // Revalidate relevant paths
    if (updatedArticle) {
        revalidatePath('/');
        revalidatePath(`/${updatedArticle.category}/${updatedArticle.id}`);
        revalidatePath('/sitemap.xml');
        revalidatePath('/api/rss');
    }

    if (updateResult.modifiedCount === 0) {
        return NextResponse.json({ success: true, message: 'No changes detected, but request was successful.', article: updatedArticle });
    }

    return NextResponse.json({ success: true, message: 'Article updated successfully.', article: updatedArticle });

  } catch (error: any) {
    console.error(`[API Admin Update Article ID: ${articleId}] Error:`, error);
    return NextResponse.json({ success: false, message: 'An internal server error occurred.', error: error.message }, { status: 500 });
  }
}
