/**
 * VULNERABLE (CWE-319) - A typed TypeScript config. The `as PoolConfig` cast is
 * erased at compile time and changes nothing about the weakness.
 */
import { Pool, type PoolConfig } from 'pg';

const config = {
  host: process.env.PGHOST,
  ssl: { rejectUnauthorized: false },
} as PoolConfig;

export const pool = new Pool(config);
