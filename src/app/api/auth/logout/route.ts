
import { NextResponse, type NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, type AppSessionData } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getIronSession<AppSessionData>(cookies(), sessionOptions);
    session.destroy();
    console.log('[Auth API - Logout] Session destroyed.');
    return NextResponse.json({ success: true, message: 'Logged out successfully.' });
  } catch (error: any) {
    console.error('[Auth API - Logout] Error during logout:', error);
    return NextResponse.json({ success: false, message: error.message || 'An unknown error occurred.' }, { status: 500 });
  }
}
