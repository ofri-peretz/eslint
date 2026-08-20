/**
 * SAFE - The correct remediation: every secret read from the environment.
 */
import { Pool } from 'pg';

export const pool = new Pool({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
});
