/**
 * VULNERABLE (CWE-391) - A ternary in STATEMENT position is an if/else. Both
 * branches produce a promise nothing owns.
 */
const { Pool } = require('pg');

const pool = new Pool();

function finish(ok, id) {
  ok
    ? pool.query('UPDATE jobs SET state = $1 WHERE id = $2', ['done', id])
    : pool.query('UPDATE jobs SET state = $1 WHERE id = $2', ['failed', id]);
}

module.exports = { finish };
