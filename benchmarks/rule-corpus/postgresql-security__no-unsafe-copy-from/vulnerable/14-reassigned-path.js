// Wave 2. The path binding is initialised with a safe default and then
// overwritten from the request.
const { Pool } = require('pg');

const pool = new Pool();

async function handle(req) {
  let source = '/srv/imports/default.csv';
  source = req.body.source;
  await pool.query(`COPY uploads FROM '${source}' CSV`);
}

module.exports = { handle };
