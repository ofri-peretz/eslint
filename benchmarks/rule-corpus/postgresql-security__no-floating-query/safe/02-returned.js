/**
 * SAFE - Returned explicitly and returned implicitly from an arrow. The caller
 * owns the promise in both spellings.
 */
import { Pool } from 'pg';

const pool = new Pool();

export function findUser(id) {
  return pool.query('SELECT id, email FROM users WHERE id = $1', [id]);
}

export const countUsers = () => pool.query('SELECT count(*) AS n FROM users');
