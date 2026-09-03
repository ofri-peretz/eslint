// Adversarial: the `execute` spelling of the sink.
const { Pool } = require('pg');

const pool = new Pool();

async function touch(id, at) {
  await pool.execute('UPDATE devices SET seen_at = $2 WHERE id = $1', [id]);
}

module.exports = { touch };
