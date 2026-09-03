const { Pool } = require('pg');
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});
async function updateUserProfile(userId, profileData) {
  const fields = Object.keys(profileData);
  const values = Object.values(profileData);
  
  const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
  
  const query = `
    UPDATE users 
    SET ${setClause}, updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `;
  
  const result = await pool.query(query, [userId, ...values]);
  return result.rows[0];
}
module.exports = updateUserProfile;
