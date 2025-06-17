
import type { IronSessionOptions } from 'iron-session';

export interface AppSessionData {
  email?: string;
  isAdmin?: boolean;
}

const sessionPassword = process.env.SESSION_PASSWORD;

// Updated placeholder to match the one in .env
const placeholderSessionPassword = "uYjL7zP2qR9sX3vA6bC1dE5fG8hK0iN4";

if (!sessionPassword || sessionPassword === placeholderSessionPassword || sessionPassword.length < 32) {
  console.warn(
    `SESSION_PASSWORD environment variable is not set, is the placeholder ("${placeholderSessionPassword}"), or is too short (needs to be at least 32 characters). ` +
    "Using a default, insecure password. Please set a strong, random secret in your .env file for production."
  );
}

export const sessionOptions: IronSessionOptions = {
  password: sessionPassword || "default_insecure_session_password_MUST_CHANGE_IN_ENV_FILE",
  cookieName: 'newsapp-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 1 week
  },
};

declare module 'iron-session' {
  interface IronSessionData extends AppSessionData {}
}
