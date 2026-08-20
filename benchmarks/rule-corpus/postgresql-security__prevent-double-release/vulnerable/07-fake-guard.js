/**
 * VULNERABLE (adversarial) - A guard that guards nothing. `client.released` is
 * never assigned - a pg PoolClient has no such property - so the test is
 * undefined both times and both branches run.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function work() {
  const client = await pool.connect();
  if (!client.released) {
    client.release();
  }
  if (!client.released) {
    client.release();
  }
}
