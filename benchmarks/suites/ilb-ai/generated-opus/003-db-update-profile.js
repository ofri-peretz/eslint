const { Pool } = require('pg');
const pool = new Pool();
async function updateUserProfile(userId, profileData) {
  const fields = Object.keys(profileData);
  if (fields.length === 0) {
    throw new Error('No fields to update');
  }
  const setClauses = fields.map((field, i) => `"${field}" = $${i + 2}`);
  const values = [userId, ...fields.map((f) => profileData[f])];
  const query = `UPDATE users SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`;
  const { rows } = await pool.query(query, values);
  return rows[0] || null;
}
module.exports = { updateUserProfile };
