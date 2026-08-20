/**
 * SAFE (adversarial) - The value is a comparison decided at runtime. The file
 * does not disable verification.
 */
import { Pool, type PoolConfig } from 'pg';

const config: PoolConfig = {
  host: process.env.PGHOST,
  ssl: { rejectUnauthorized: process.env.NODE_ENV === 'production' },
};

export const pool = new Pool(config);
