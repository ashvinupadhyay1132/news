import jwt from 'jsonwebtoken';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

export interface AdminJwtPayload {
  email: string;
  isAdmin: boolean;
  iat?: number;
  exp?: number;
}

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.warn(
    `JWT_SECRET environment variable is not set or is too short (needs to be at least 32 characters). ` +
    "Using a default, insecure secret. Please set a strong, random secret in your .env file for production."
  );
}
const secret = JWT_SECRET || 'default_insecure_jwt_secret_must_be_32_chars_long';

export function signToken(payload: Omit<AdminJwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

export function verifyToken(token: string): AdminJwtPayload | null {
  try {
    const decoded = jwt.verify(token, secret);
    return decoded as AdminJwtPayload;
  } catch (error) {
    // Intentionally not logging here to avoid log spam for expired/invalid tokens
    return null;
  }
}

interface AuthResult {
  success: boolean;
  payload?: AdminJwtPayload;
  reason?: 'NO_TOKEN' | 'INVALID_TOKEN' | 'NOT_ADMIN';
}

export function getAdminAuthStatus(): AuthResult {
    const cookieStore = cookies();
    const tokenCookie = cookieStore.get('auth_token');

    if (!tokenCookie?.value) {
        return { success: false, reason: 'NO_TOKEN' };
    }

    const payload = verifyToken(tokenCookie.value);
    
    if (!payload) {
        return { success: false, reason: 'INVALID_TOKEN' };
    }

    if (payload.isAdmin !== true) {
        return { success: false, reason: 'NOT_ADMIN' };
    }
    
    return { success: true, payload };
}
