/**
 * SAFE - A `Client` that is not a PostgreSQL client. Deciding from the SPELLING
 * of the callee would report this test double.
 */
import { Pool } from 'pg';
import { Client } from '../test/fake-transport';

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const stub = new Client({ password: 'not-a-database-at-all' });
