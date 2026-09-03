/**
 * SAFE - The DSN read from the environment.
 */
import { Client } from 'pg';

export const client = new Client({
  connectionString: process.env.DATABASE_URL,
});
