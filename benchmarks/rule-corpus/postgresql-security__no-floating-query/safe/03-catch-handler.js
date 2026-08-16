/**
 * SAFE - Deliberate fire-and-forget WITH a rejection handler. This is the
 * documented way to say "I do not want to wait for this, and I have decided
 * what happens if it fails".
 */
import { Pool } from 'pg';

const pool = new Pool();

export function recordMetric(name, value) {
  pool
    .query('INSERT INTO metrics (name, value) VALUES ($1, $2)', [name, value])
    .catch((error) => console.error('metric write failed', error));
}
