// Wave 2. The STDIN statement reaches the sink through a module constant.
// Following the binding must not lose the STDIN that makes it safe.
const { Pool } = require('pg');
const { from: copyFrom } = require('pg-copy-streams');

const pool = new Pool();
const LOAD_EVENTS = 'COPY events (ts, kind, payload) FROM STDIN WITH (FORMAT csv)';

async function load(stream) {
  const client = await pool.connect();
  await client.query(LOAD_EVENTS);
  stream.pipe(client.query(copyFrom(LOAD_EVENTS)));
}

module.exports = { load };
