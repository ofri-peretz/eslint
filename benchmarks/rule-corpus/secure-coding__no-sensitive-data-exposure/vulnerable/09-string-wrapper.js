/**
 * VULNERABLE (adversarial) - The credential is wrapped before it is logged.
 * `String(x)` and `x + ''` are identity transforms on a string; neither
 * redacts anything. TypeScript users write the first one constantly, because
 * the value's declared type is wider than `string`.
 */
import { logger } from '../lib/logger.js';

export function auditCredential(account) {
  logger.info(String(account.password));
  logger.debug(account.apiKey + '');
}
