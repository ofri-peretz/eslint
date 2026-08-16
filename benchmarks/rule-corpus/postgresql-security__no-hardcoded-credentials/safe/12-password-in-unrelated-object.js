/**
 * SAFE (adversarial) - A `password` key on something that is not a connection
 * config, in a file that does hold a pg pool. The KEY is spelled identically.
 */
import { Pool } from 'pg';

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const seedUser = {
  email: 'demo@example.test',
  password: 'demo-fixture-password',
};
