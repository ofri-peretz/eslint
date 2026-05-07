const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});
async function searchUsers(searchTerm) {
  const query = 'SELECT * FROM users WHERE email ILIKE $1';
  const values = [`%${searchTerm}%`];
  
  const result = await pool.query(query, values);
  return result.rows;
}
module.exports = { searchUsers };
