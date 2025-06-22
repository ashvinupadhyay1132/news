
import { NextResponse, type NextRequest } from 'next/server';
import { getAdminAuthStatus } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = getAdminAuthStatus();

    if (auth.success && auth.payload) {
      return NextResponse.json({
        isLoggedIn: true,
        email: auth.payload.email,
        isAdmin: auth.payload.isAdmin,
      });
    } else {
      // For security, don't reveal the reason for auth failure to the client here.
      // The admin routes will provide specific 403s. This just says "not logged in".
      return NextResponse.json({
        isLoggedIn: false,
        email: null,
        isAdmin: false,
      });
    }
  } catch (error) {
    console.error('[Auth API - User] Error fetching user session:', error);
    return NextResponse.json(
      { isLoggedIn: false, email: null, isAdmin: false, error: 'Failed to retrieve session' },
      { status: 500 }
    );
  }
}
