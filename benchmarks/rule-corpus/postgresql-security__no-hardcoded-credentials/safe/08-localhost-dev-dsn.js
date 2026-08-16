/**
 * SAFE - A local development DSN with a user but no password. Nothing is
 * disclosed, and reporting it fires on essentially every repository's
 * docker-compose defaults.
 */
import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: 'postgres://postgres@localhost:5432/app_development',
});
