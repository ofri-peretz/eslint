/**
 * SAFE - The vocabulary appears only as text: a column name, a log message and
 * a comment. There is no branch and no decision.
 */
import { logger } from '../lib/logger';

// Historically this projection also carried isAdmin and permissions; both moved
// to the authorization service.
export const MEMBER_COLUMNS = ['id', 'email', 'role', 'joined_at'];

export function logProjection() {
  logger.debug('member projection includes role and permissions metadata');
  return MEMBER_COLUMNS;
}
