/**
 * VULNERABLE (CWE-1049) - The sequential-reduce idiom: `reduce` over a promise
 * accumulator forces one round trip per element, exactly like a for-of loop.
 */
import { Pool } from 'pg';

const pool = new Pool();

export function applyMigrations(statements) {
  return statements.reduce(
    (chain, statement) =>
      chain.then(() => pool.query('INSERT INTO migration_log (statement) VALUES ($1)', [statement])),
    Promise.resolve(),
  );
}
