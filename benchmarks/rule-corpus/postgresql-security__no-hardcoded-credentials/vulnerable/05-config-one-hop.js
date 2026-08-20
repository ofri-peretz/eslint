/**
 * VULNERABLE (CWE-798) - The config object is declared one binding above the
 * constructor, which is how every real application writes it.
 */
import { Pool } from 'pg';

const databaseConfig = {
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: 'fallback-dev-password-shipped-to-prod',
};

export const pool = new Pool(databaseConfig);
