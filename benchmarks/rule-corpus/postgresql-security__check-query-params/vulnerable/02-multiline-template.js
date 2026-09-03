// Multi-line SQL is written as a template literal with no interpolation at
// all. It is exactly as analysable as a quoted string.
const { Pool } = require('pg');

const pool = new Pool();

async function search(term, limit) {
  return pool.query(
    `
      SELECT id, title, body
        FROM articles
       WHERE title ILIKE $1
         AND published_at > $2
       LIMIT $3
    `,
    [term, limit],
  );
}

module.exports = { search };
