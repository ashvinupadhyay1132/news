
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10; // Standard number of salt rounds for bcrypt

export async function hashPassword(password: string): Promise<string> {
  if (!password) {
    throw new Error('Password cannot be empty');
  }
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) {
    return false; // Or throw an error, depending on desired behavior
  }
  return bcrypt.compare(password, hash);
}
