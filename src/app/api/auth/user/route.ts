
import { NextResponse, type NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, type AppSessionData } from '@/lib/session';

export const dynamic = 'force-dynamic'; // Ensure this route is always dynamic

export async function GET(request: NextRequest) {
  const _accessedUrl = request.url; 

  try {
    const session = await getIronSession<AppSessionData>(cookies(), sessionOptions);

    if (session.email) { // Simplified check, only for email
      // console.log('[Auth API - User] User session found:', { email: session.email });
      return NextResponse.json({
        isLoggedIn: true,
        email: session.email,
        // isAdmin: session.isAdmin, // Removed isAdmin
      });
    } else {
      // console.log('[Auth API - User] No active user session found.');
      return NextResponse.json({
        isLoggedIn: false,
        email: null,
        // isAdmin: false, // Removed isAdmin
      });
    }
  } catch (error) {
    console.error('[Auth API - User] Error fetching user session:', error);
    return NextResponse.json(
      { isLoggedIn: false, email: null, /* isAdmin: false, */ error: 'Failed to retrieve session' }, // Removed isAdmin
      { status: 500 }
    );
  }
}
