/**
 * SAFE - The value is read at runtime from configuration. This file does not
 * disable verification; an operator might, and that is not a source defect.
 */
import { Pool } from 'pg';

export const pool = new Pool({
  ssl: { rejectUnauthorized: process.env.PGSSL_STRICT !== '0' },
});
