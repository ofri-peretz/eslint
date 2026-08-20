/**
 * SAFE - A `Pool` that is not a PostgreSQL pool. `generic-pool` has its own
 * unrelated constructor, and the file holds a pg client for other reasons.
 * Deciding from the SPELLING of the callee would report this.
 */
import { Pool } from 'generic-pool';
import { Client as PgClient } from 'pg';

export const workers = new Pool({
  ssl: { rejectUnauthorized: false },
});

export const db = new PgClient({ ssl: true });
