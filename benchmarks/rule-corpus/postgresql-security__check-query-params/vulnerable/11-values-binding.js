// Adversarial: the values array is a named binding rather than an inline
// literal — written once, so its length is knowable.
const { Pool } = require('pg');

const pool = new Pool();

async function upsertProfile(userId, displayName) {
  const params = [userId, displayName];
  await pool.query(
    'INSERT INTO profiles (user_id, display_name, avatar_url) VALUES ($1, $2, $3)',
    params,
  );
}

module.exports = { upsertProfile };
