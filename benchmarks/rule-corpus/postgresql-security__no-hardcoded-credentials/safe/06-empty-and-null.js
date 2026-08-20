/**
 * SAFE - An explicitly empty password. This is how a local trust-authentication
 * or unix-socket setup is written, and it discloses nothing at all.
 */
import { Pool } from 'pg';

export const pool = new Pool({
  host: '/var/run/postgresql',
  user: 'postgres',
  password: '',
});
