/**
 * VULNERABLE (CWE-319) - The `ssl` block itself is the extracted binding.
 */
import { Pool } from 'pg';

const tlsOptions = { rejectUnauthorized: false };

export const pool = new Pool({
  database: 'analytics',
  ssl: tlsOptions,
});
