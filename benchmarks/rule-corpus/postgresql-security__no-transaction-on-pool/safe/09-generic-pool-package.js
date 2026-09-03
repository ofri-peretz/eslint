/**
 * SAFE (adversarial) - A `Pool` from `generic-pool`, in a file that also holds
 * a pg pool. The constructor is spelled identically and is not a database.
 */
import { Pool as PgPool } from 'pg';
import { Pool } from 'generic-pool';

export const db = new PgPool();

const workers = new Pool({ max: 4 });

export function beginWork() {
  return workers.query('BEGIN');
}
