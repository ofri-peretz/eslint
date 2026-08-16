/**
 * VULNERABLE (adversarial) - A scoped PostgreSQL package. The package root is
 * `@vercel/postgres`, not `@vercel`.
 */
import { Pool } from '@vercel/postgres';

export const pool = new Pool({
  connectionString: 'postgres://app:v3rc3l-s3cret@db.vercel-storage.com/verceldb',
});
