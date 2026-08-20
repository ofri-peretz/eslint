/**
 * SAFE - A `pg-cursor` read. The cursor is bound to the connection that opened
 * it; `pool.query()` has nowhere to put it. The first argument is not SQL text
 * at all.
 */
const { Pool } = require('pg');
const Cursor = require('pg-cursor');

const pool = new Pool();

async function firstPage() {
  const client = await pool.connect();
  const cursor = client.query(new Cursor('SELECT id, email FROM users ORDER BY id'));
  const rows = await cursor.read(100);
  await cursor.close();
  client.release();
  return rows;
}

module.exports = { firstPage };
