
import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    cookieStore.set('auth_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(0),
    });
    console.log('[Auth API - Logout] Session cookie cleared.');
    return NextResponse.json({ success: true, message: 'Logged out successfully.' });
  } catch (error: any) {
    console.error('[Auth API - Logout] Error during logout:', error);
    return NextResponse.json({ success: false, message: error.message || 'An unknown error occurred.' }, { status: 500 });
  }
}
