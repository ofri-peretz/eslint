/**
 * SAFE - The password fetched from a secret manager at startup. Nothing
 * sensitive is in the source.
 */
import { Pool } from 'pg';
import { getSecret } from '../lib/secrets';

export async function createPool() {
  return new Pool({
    host: process.env.PGHOST,
    user: 'app',
    password: await getSecret('prod/db/password'),
  });
}
