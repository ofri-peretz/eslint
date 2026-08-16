/**
 * SAFE - The matched text appears in a comment and inside string literals that
 * are DATA, not log arguments. The only logging call in this file logs a route
 * name. A rule that matches on text rather than on the call it is attached to
 * reports here.
 *
 * The redactor strips password: and api_key: pairs before anything is written.
 */
import { logger } from '../lib/logger.js';

export const REDACTED_FIELDS = Object.freeze([
  'password: ',
  'api_key=',
  'secret_key: ',
  'ssn: ',
]);

export function describeRedaction() {
  return `fields removed: ${REDACTED_FIELDS.join(', ')}`;
}

export function handleRoute(route) {
  logger.info('route handled', { route });
}
