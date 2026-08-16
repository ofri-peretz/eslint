/**
 * SAFE - Two reasons at once, both of which must hold on their own. `SET`
 * changes session state that only exists for the life of this connection, and
 * the client is then passed into a helper, so what it is used for afterwards is
 * not knowable from this call site.
 */
const { Pool } = require('pg');

const pool = new Pool();

async function longReport() {
  const client = await pool.connect();
  try {
    await client.query("SET statement_timeout = '10min'");
    return await runReport(client);
  } finally {
    client.release();
  }
}

async function runReport(client) {
  const { rows } = await client.query('SELECT kind, count(*) AS n FROM events GROUP BY kind');
  return rows;
}

module.exports = { longReport };
