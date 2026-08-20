// A `$1` inside a quoted SQL string is data, not a placeholder — this query
// binds exactly one parameter.
const { Pool } = require('pg');

const pool = new Pool();

async function template(id) {
  return pool.query(
    "SELECT id, replace(body, '$1', name) AS rendered FROM templates WHERE id = $1",
    [id],
  );
}

module.exports = { template };
