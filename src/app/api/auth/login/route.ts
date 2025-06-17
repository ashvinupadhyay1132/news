
import { NextResponse, type NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, type AppSessionData } from '@/lib/session';
import { getAdminsCollection } from '@/lib/mongodb';
import { hashPassword, comparePassword } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log('[Auth API - Login] Received login request.');
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      console.log('[Auth API - Login] Missing email or password.');
      return NextResponse.json({ success: false, message: 'Email and password are required.' }, { status: 400 });
    }

    const adminsCollection = await getAdminsCollection();
    const adminCount = await adminsCollection.countDocuments();
    console.log(`[Auth API - Login] Admin count in DB: ${adminCount}`);

    let adminUser: { email: string; isSuperAdmin?: boolean }; // isSuperAdmin is now optional here for simplicity

    if (adminCount === 0) {
      console.log('[Auth API - Login] No admins found. Creating first Admin (no super admin distinction).');
      const hashedPassword = await hashPassword(password);
      const newAdmin = {
        email: email.toLowerCase(),
        hashedPassword,
        // isSuperAdmin: true, // No explicit super admin, just an admin
        createdAt: new Date(),
      };
      const insertResult = await adminsCollection.insertOne(newAdmin);
      if (!insertResult.insertedId) {
        console.error('[Auth API - Login] Failed to insert new Admin.');
        return NextResponse.json({ success: false, message: 'Failed to create Admin account.' }, { status: 500 });
      }
      adminUser = { email: newAdmin.email };
      console.log(`[Auth API - Login] Admin ${email} created successfully.`);
    } else {
      console.log('[Auth API - Login] Admins exist. Validating credentials.');
      const existingAdmin = await adminsCollection.findOne({ email: email.toLowerCase() });

      if (!existingAdmin) {
        console.log(`[Auth API - Login] Admin not found for email: ${email}`);
        return NextResponse.json({ success: false, message: 'Invalid credentials.' }, { status: 401 });
      }

      const passwordMatch = await comparePassword(password, existingAdmin.hashedPassword as string);
      if (!passwordMatch) {
        console.log(`[Auth API - Login] Password mismatch for email: ${email}`);
        return NextResponse.json({ success: false, message: 'Invalid credentials.' }, { status: 401 });
      }
      adminUser = { email: existingAdmin.email as string };
      console.log(`[Auth API - Login] Admin ${email} authenticated successfully. Admin user object:`, JSON.stringify(adminUser));
    }

    const session = await getIronSession<AppSessionData>(cookies(), sessionOptions);
    console.log(`[Auth API - Login] Initial session state (before setting email): ${JSON.stringify(session)}`);

    session.email = adminUser.email;
    // session.isAdmin = determinedIsAdmin; // Removed isAdmin from session

    console.log(`[Auth API - Login] Session state PRE-SAVE: email='${session.email}'`);
    
    await session.save();
    console.log(`[Auth API - Login] session.save() completed.`);

    const sessionAfterSaveAndReFetch = await getIronSession<AppSessionData>(cookies(), sessionOptions);
    console.log(`[Auth API - Login] Session state POST-SAVE (re-fetched): ${JSON.stringify(sessionAfterSaveAndReFetch)}`);


    return NextResponse.json({
      success: true,
      message: 'Login successful.',
      user: { email: adminUser.email } // Removed isAdmin from response
    });

  } catch (error: any) {
    console.error('[Auth API - Login] Error during login:', error);
    return NextResponse.json({ success: false, message: error.message || 'An unknown error occurred.' }, { status: 500 });
  }
}
