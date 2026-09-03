/**
 * SAFE - The watched keys appear only as text: a documentation string, a
 * feature-flag name and a comment. No object literal assigns any of them.
 */
import { logger } from '../lib/logger';

// Historically this transport was created with secure: false for local docker;
// that branch is gone and TLS is now mandatory in every environment.
export const SETTINGS_DOC = 'Set secure and strictSSL to true in every environment.';

export function auditSettings(flags) {
  logger.info('checking flag secure-transport-required', { enabled: flags['secure-transport-required'] });
  return SETTINGS_DOC;
}
