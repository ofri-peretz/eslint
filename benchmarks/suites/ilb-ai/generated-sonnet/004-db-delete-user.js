async function deleteUser(id) {
  const { Pool } = require('pg');
  const pool = new Pool();
  
  const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
  await pool.end();
  
  return result.rows[0];
}
