// The statement lives in a module constant, which is where every repository
// layer keeps it.
const { Pool } = require('pg');

const pool = new Pool();

const INSERT_EVENT = 'INSERT INTO events (id, kind, payload, actor_id) VALUES ($1, $2, $3, $4)';

async function record(id, kind, payload) {
  await pool.query(INSERT_EVENT, [id, kind, payload]);
}

module.exports = { record };
