/**
 * VULNERABLE (CWE-798) - A typed config. The `satisfies` clause is erased at
 * compile time and hides nothing.
 */
import { Pool, type PoolConfig } from 'pg';

const config = {
  host: 'db.internal',
  user: 'metrics',
  password: 'm3trics-reader',
} satisfies PoolConfig;

export const pool = new Pool(config);
