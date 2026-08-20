/**
 * SAFE - Two functions, each checking out and releasing its own client. They
 * share a file and nothing else.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function readOne(id) {
  const client = await pool.connect();
  try {
    return await client.query('SELECT * FROM users WHERE id = $1', [id]);
  } finally {
    client.release();
  }
}

export async function readAll() {
  const client = await pool.connect();
  try {
    return await client.query('SELECT * FROM users');
  } finally {
    client.release();
  }
}
