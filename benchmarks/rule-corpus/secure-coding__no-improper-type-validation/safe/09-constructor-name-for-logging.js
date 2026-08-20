/**
 * SAFE (adversarial) - `constructor.name` read for a LOG LABEL, not for a
 * security decision. Nothing branches on it, nothing is merged, nothing is
 * authorised. `error.constructor.name` on a locally-thrown error is exactly how
 * every structured logger tags an exception.
 */
import { logger } from '../lib/logger';

export function reportFailure(error, correlationId) {
  const errorKind = error.constructor.name;
  logger.warn({ correlationId, errorKind, message: error.message }, 'job failed');
  return errorKind;
}
