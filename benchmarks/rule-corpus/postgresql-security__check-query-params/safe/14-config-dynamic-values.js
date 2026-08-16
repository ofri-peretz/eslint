// Wave 2. The config object's values come from a function argument, so the
// length is not knowable at lint time.
const { Pool } = require('pg');

const pool = new Pool();

async function run(text, values) {
  return pool.query({ text: 'SELECT * FROM audit WHERE id = ANY($1)', values });
}

module.exports = { run };
