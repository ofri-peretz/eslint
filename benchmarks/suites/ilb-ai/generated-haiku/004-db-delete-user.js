const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
async function deleteUser(id) {
  const client = await pool.connect();
  try {
    const result = await client.query('DELETE FROM users WHERE id = $1', [id]);
    return result.rowCount;
  } finally {
    client.release();
  }
}
module.exports = deleteUser;
