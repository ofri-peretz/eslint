/**
 * VULNERABLE (adversarial) - The credential is one branch of a ternary. In
 * production the flag is what it is; the branch that leaks is still reachable,
 * and in every non-production environment it is the branch that runs.
 */
import { logger } from '../lib/logger.js';

const isProduction = process.env.NODE_ENV === 'production';

export function debugAuth(user) {
  logger.info('auth debug', isProduction ? '[redacted]' : user.password);
}
