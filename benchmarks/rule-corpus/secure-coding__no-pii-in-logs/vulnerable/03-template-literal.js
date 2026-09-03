/**
 * VULNERABLE - Identical leak to 02, but interpolated instead of passed as a
 * separate argument. Template-literal logging is at least as common as
 * comma-separated logging in modern code, and it also leaks the reset token.
 */
import { issueResetToken } from '../services/tokens.js';

export async function requestPasswordReset(user) {
  const token = await issueResetToken(user.id);
  console.log(`Password reset token ${token} issued to ${user.email}`);
  return token;
}
