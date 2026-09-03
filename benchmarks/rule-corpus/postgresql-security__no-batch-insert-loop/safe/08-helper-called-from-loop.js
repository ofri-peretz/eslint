/**
 * SAFE - The query lives in a single-purpose helper with no loop in sight. A
 * caller elsewhere may or may not run it in a loop; this rule is intra-
 * procedural, and reporting the callee would fire on every repository method
 * that anybody ever calls twice.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function insertOne(record) {
  await pool.query('INSERT INTO users (email, name) VALUES ($1, $2)', [record.email, record.name]);
}

export async function insertAll(records) {
  await pool.query(
    'INSERT INTO users (email, name) SELECT * FROM unnest($1::text[], $2::text[])',
    [records.map((r) => r.email), records.map((r) => r.name)],
  );
}
