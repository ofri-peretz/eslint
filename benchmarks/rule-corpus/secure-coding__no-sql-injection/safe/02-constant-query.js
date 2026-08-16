/**
 * SAFE - Fully static SQL.
 */
import { db } from '../lib/db';

export function health() {
  return db.query('SELECT 1');
}
