const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
async function updateUserProfile(userId, profileData) {
  const client = await pool.connect();
  try {
    const keys = Object.keys(profileData);
    const values = Object.values(profileData);
    
    const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');
    const query = `UPDATE users SET ${setClause}, updated_at = NOW() WHERE id = $${keys.length + 1} RETURNING *`;
    
    const result = await client.query(query, [...values, userId]);
    return result.rows[0];
  } finally {
    client.release();
  }
}
module.exports = updateUserProfile;
