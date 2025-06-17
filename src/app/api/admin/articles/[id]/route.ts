
// src/app/api/admin/articles/[id]/route.ts
import { NextResponse, type NextRequest } from 'next/server';
// import { getIronSession } from 'iron-session'; // Not used if always returning 403
// import { cookies } from 'next/headers'; // Not used if always returning 403
// import { sessionOptions, type AppSessionData } from '@/lib/session'; // Not used
// import { deleteArticleById, getArticleById } from '@/lib/placeholder-data'; // Not used

export const dynamic = 'force-dynamic';

// This function is kept for potential future re-enablement or reference,
// but is not actively used if the route always returns 403.
// async function isAdminSession(request: NextRequest): Promise<boolean> {
//   const _accessedUrl = request.url;
//   const session = await getIronSession<AppSessionData>(cookies(), sessionOptions);
  
//   console.log(`[isAdminSession] Path: ${request.nextUrl.pathname}, Raw session from iron-session: ${JSON.stringify(session)}`);

//   if (!session || Object.keys(session).length === 0) { 
//     console.log(`[isAdminSession] Path: ${request.nextUrl.pathname}, Session is null, undefined, or empty. Access denied.`);
//     return false;
//   }

//   const userEmail = session.email;
//   const adminStatus = session.isAdmin;

//   console.log(`[isAdminSession] Path: ${request.nextUrl.pathname}, Session email: '${userEmail}', Session isAdmin value: ${adminStatus}, typeof isAdmin: ${typeof adminStatus}`);

//   if (userEmail && adminStatus === true) {
//     console.log(`[isAdminSession] Path: ${request.nextUrl.pathname}, Admin access GRANTED for email: '${userEmail}'.`);
//     return true;
//   } else {
//     console.log(`[isAdminSession] Path: ${request.nextUrl.pathname}, Admin access DENIED. Email exists: ${!!userEmail}, isAdmin is true: ${adminStatus === true}.`);
//     return false;
//   }
// }

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log(`[API Admin Delete Article ID: ${params.id}] This route is disabled and will return 403.`);
  return NextResponse.json({ success: false, message: 'Forbidden: Admin article deletion is currently disabled.' }, { status: 403 });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log(`[API Admin Update Article ID: ${params.id}] This route is disabled and will return 403.`);
  return NextResponse.json({ success: false, message: 'Forbidden: Admin article update is currently disabled.' }, { status: 403 });
}
