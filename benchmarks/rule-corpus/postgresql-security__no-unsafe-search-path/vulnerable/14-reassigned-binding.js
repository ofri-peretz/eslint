// Wave 2. The binding starts as a constant and is overwritten with request
// data. Resolving only the declaration would fold it to 'public' and go quiet.
const { Pool } = require('pg');

const pool = new Pool();

async function handle(req) {
  let schema = 'public';
  schema = req.query.schema;
  await pool.query(`SET search_path TO ${schema}`);
}

module.exports = { handle };
