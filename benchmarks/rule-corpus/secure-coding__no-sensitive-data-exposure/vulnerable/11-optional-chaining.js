/**
 * VULNERABLE (adversarial) - Optional chaining. `session?.accessToken` reads
 * exactly what `session.accessToken` reads; the only difference is a
 * ChainExpression wrapper that a `node.type === 'MemberExpression'` test does
 * not match.
 */
import { logger } from '../lib/logger.js';

export function traceSession(session) {
  logger.debug(session?.accessToken);
  logger.trace(session?.user?.ssn);
}
