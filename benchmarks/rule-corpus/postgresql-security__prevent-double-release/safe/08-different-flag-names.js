/**
 * SAFE (adversarial) - Release-once guards using several different flag names,
 * every one of them actually assigned. None of the names is `released`,
 * `done` or `closed`.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function work(state) {
  const client = await pool.connect();

  if (!state.finished) {
    state.finished = true;
    client.release();
  }

  if (!state.finished) {
    state.finished = true;
    client.release();
  }
}
