const { Pool } = require('pg');
const pool = new Pool();
async function getUserById(id) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] || null;
}
module.exports = { getUserById };
