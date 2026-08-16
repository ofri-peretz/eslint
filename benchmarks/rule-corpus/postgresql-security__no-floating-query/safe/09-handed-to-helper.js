/**
 * SAFE - The promise is passed to something else, which is what takes
 * ownership of it. Reporting a value at an argument position would report the
 * hand-off itself.
 */
import { Pool } from 'pg';

const pool = new Pool();

function track(promise) {
  return promise.catch((error) => console.error(error));
}

export function record(name) {
  track(pool.query('INSERT INTO metrics (name) VALUES ($1)', [name]));
}

export function collect(names) {
  const pending = [pool.query('SELECT 1')];
  for (const name of names) pending.push(pool.query('SELECT $1::text', [name]));
  return Promise.allSettled(pending);
}
