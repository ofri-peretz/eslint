/**
 * SAFE - The loop builds a placeholder list and a flat values array; the single
 * multi-row INSERT runs after it.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function insertEvents(events) {
  const placeholders = [];
  const values = [];
  for (const [index, event] of events.entries()) {
    placeholders.push(`($${index * 2 + 1}, $${index * 2 + 2})`);
    values.push(event.kind, event.body);
  }
  if (values.length === 0) return;
  await pool.query(`INSERT INTO events (kind, body) VALUES ${placeholders.join(', ')}`, values);
}
