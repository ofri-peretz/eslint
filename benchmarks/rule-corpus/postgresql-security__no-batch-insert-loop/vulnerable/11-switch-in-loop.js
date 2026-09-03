/**
 * VULNERABLE (CWE-1049) - The query is buried in a switch inside the loop body,
 * several statement levels below the loop.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function applyEvents(events) {
  for (const event of events) {
    switch (event.kind) {
      case 'create':
        await pool.query('INSERT INTO entities (id) VALUES ($1)', [event.id]);
        break;
      default:
        break;
    }
  }
}
