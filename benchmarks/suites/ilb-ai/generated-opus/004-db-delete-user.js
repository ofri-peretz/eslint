const { Pool } = require('pg');
const pool = new Pool();
async function deleteUser(id) {
  const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
  return result.rows[0];
}
module.exports = { deleteUser };
