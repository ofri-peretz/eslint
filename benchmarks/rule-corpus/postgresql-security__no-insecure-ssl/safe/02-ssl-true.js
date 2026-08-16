/**
 * SAFE - `ssl: true` uses Node's default trust store and verifies. This is the
 * one-word correct answer and must never be reported.
 */
import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
});
