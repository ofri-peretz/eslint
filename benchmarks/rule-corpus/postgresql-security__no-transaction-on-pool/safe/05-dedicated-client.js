/**
 * SAFE - A dedicated `new Client()`, not a pool. It is one connection by
 * construction, so a transaction on it is correct.
 */
import { Client } from 'pg';

export async function migrate() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query('BEGIN');
  await client.query('ALTER TABLE orders ADD COLUMN note text');
  await client.query('COMMIT');
  await client.end();
}
