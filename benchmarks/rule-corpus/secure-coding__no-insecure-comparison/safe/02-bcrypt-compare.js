/**
 * SAFE - Password verification delegated to bcrypt, whose `compare` is
 * constant-time by construction. No equality operator touches the secret.
 */
import bcrypt from 'bcrypt';
import { credentials } from '../store/credentials';

export async function checkPassword(accountId, submittedPassword) {
  const storedHash = credentials.get(accountId);
  if (!storedHash) {
    return false;
  }
  return bcrypt.compare(submittedPassword, storedHash);
}
