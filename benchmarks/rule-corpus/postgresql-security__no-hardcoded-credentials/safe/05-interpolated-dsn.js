/**
 * SAFE - The DSN assembled from environment variables at runtime.
 */
import { Pool } from 'pg';

const dsn = `postgres://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}/app`;

export const pool = new Pool({ connectionString: dsn });
