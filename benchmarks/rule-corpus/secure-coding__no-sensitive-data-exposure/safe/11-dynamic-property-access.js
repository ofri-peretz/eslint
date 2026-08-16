/**
 * SAFE (adversarial) - `row[column]` names nothing statically. Reading the
 * variable `column` as though it were a property name would report on every
 * dynamic lookup in every codebase.
 */
import { logger } from '../lib/logger.js';

const SAFE_COLUMNS = ['id', 'email', 'createdAt'];

export function logProjection(row) {
  for (const column of SAFE_COLUMNS) {
    logger.debug('column', row[column]);
  }
}
