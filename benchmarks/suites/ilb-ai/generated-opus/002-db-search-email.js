const { Pool } = require("pg");
const pool = new Pool();
async function searchUsers(searchTerm) {
  const query = "SELECT * FROM users WHERE email ILIKE $1";
  const result = await pool.query(query, [`%${searchTerm}%`]);
  return result.rows;
}
module.exports = { searchUsers };
