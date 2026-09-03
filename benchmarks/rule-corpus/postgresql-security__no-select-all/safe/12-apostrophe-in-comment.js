/**
 * SAFE - The mirror image of safe/11: an unbalanced apostrophe inside a `--`
 * comment. The statement below it lists its columns.
 */
const { Pool } = require('pg');

const pool = new Pool();

async function listUsers() {
  const { rows } = await pool.query(
    `-- don't use the star here, the pii_blob column is 40kB
     SELECT id, email FROM users ORDER BY id`,
  );
  return rows;
}

module.exports = { listUsers };
