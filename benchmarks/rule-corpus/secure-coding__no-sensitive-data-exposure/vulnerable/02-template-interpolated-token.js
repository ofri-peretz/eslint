/**
 * VULNERABLE - The secret is spliced into the log line by a template literal.
 * Unlike a constant string, a template splices a RUNTIME value, which is the
 * whole of what CWE-532 is about.
 */
import { logger } from '../lib/logger.js';

export async function refreshSession(accessToken, refreshToken) {
  logger.warn(`refresh rejected for access token ${accessToken}`);
  return { accessToken: null, refreshToken };
}
