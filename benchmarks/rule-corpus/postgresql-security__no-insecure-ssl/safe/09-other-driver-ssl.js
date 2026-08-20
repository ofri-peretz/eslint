/**
 * SAFE (adversarial) - A Redis client with the same option name, in a file that
 * also holds a pg pool. The OPTION is spelled identically; the constructor is
 * not a PostgreSQL one.
 */
import { Pool } from 'pg';
import Redis from 'ioredis';

export const pool = new Pool({ ssl: true });

export const cache = new Redis({
  tls: { rejectUnauthorized: false },
});
