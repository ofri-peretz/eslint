// Adversarial: the words appear in the statement, inside a quoted SQL string
// on an INSERT. Nothing is being SET here.
const { Pool } = require('pg');

const pool = new Pool();

async function audit(actor) {
  await pool.query(`
    INSERT INTO audit_log (message)
    VALUES ('set search_path changed by ${actor}')
  `);
}

module.exports = { audit };
