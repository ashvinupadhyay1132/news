
import { NextResponse, type NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies as getCookiesFromHeaders } from 'next/headers'; // Renamed import
import { sessionOptions, type AppSessionData } from '@/lib/session';

export const dynamic = 'force-dynamic'; // Ensure this route is always dynamic

export async function GET(request: NextRequest) {
  // const _accessedUrl = request.url; // Removed as it's not used

  try {
    const currentCookies = getCookiesFromHeaders(); // Use the aliased import
    const session = await getIronSession<AppSessionData>(currentCookies, sessionOptions);

    if (session && session.email) { // Added null check for session itself
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
