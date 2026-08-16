// Adversarial: a double-quoted identifier that happens to be spelled "$1".
// Quoted identifiers are names, not parameters.
const { Pool } = require('pg');

const pool = new Pool();

async function legacyColumn(id) {
  return pool.query('SELECT "$1" AS legacy_flag FROM imports WHERE id = $1', [id]);
}

module.exports = { legacyColumn };
