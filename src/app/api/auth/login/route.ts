
import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminsCollection } from '@/lib/mongodb';
import { comparePassword, hashPassword } from '@/lib/auth-utils';
import { signToken } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, message: 'Email and password are required.' }, { status: 400 });
    }

    const adminsCollection = await getAdminsCollection();
    const adminCount = await adminsCollection.countDocuments();
    let isConfirmedAdmin = false;
    let adminEmail = email.toLowerCase();

    if (adminCount === 0) {
      const hashedPassword = await hashPassword(password);
      const newAdmin = {
        email: adminEmail,
        hashedPassword,
        isSuperAdmin: true,
        createdAt: new Date(),
      };
      await adminsCollection.insertOne(newAdmin);
      isConfirmedAdmin = true;
    } else {
      const existingAdmin = await adminsCollection.findOne({ email: adminEmail });

      if (!existingAdmin) {
        return NextResponse.json({ success: false, message: 'Invalid credentials.' }, { status: 401 });
      }

      const passwordMatch = await comparePassword(password, existingAdmin.hashedPassword as string);
      if (!passwordMatch) {
        return NextResponse.json({ success: false, message: 'Invalid credentials.' }, { status: 401 });
      }
      
      if (existingAdmin.isSuperAdmin !== true) {
           return NextResponse.json({ success: false, message: 'Login successful, but you do not have admin privileges.' }, { status: 403 });
      }
      isConfirmedAdmin = true;
    }

    if (isConfirmedAdmin) {
      const token = signToken({ email: adminEmail, isAdmin: true });
      const cookieStore = cookies();
      cookieStore.set('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 1 week
      });

      return NextResponse.json({
        success: true,
        message: 'Login successful.',
        user: { email: adminEmail, isAdmin: true }
      });
    }

    // This part should not be reached if logic is correct, but as a fallback:
    return NextResponse.json({ success: false, message: 'Authentication failed.' }, { status: 401 });

  } catch (error: any) {
    console.error('[Auth API - Login] Error during login:', error);
    return NextResponse.json({ success: false, message: error.message || 'An unknown error occurred.' }, { status: 500 });
  }
}
