// Adversarial: the classic callback API. The second argument is a function,
// not a values array, and the statement's placeholders are bound elsewhere.
const { Pool } = require('pg');

const pool = new Pool();

function loadAll(done) {
  pool.query('SELECT id, email FROM users WHERE active = $1', [true], (err, res) => {
    done(err, res && res.rows);
  });
  pool.query('SELECT count(*) FROM users', (err, res) => done(err, res));
}

module.exports = { loadAll };
