const { Client } = require('pg');
async function searchUsers(searchTerm) {
  const client = new Client({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'postgres',
  });
  try {
    await client.connect();
    const query = 'SELECT * FROM users WHERE email ILIKE $1 ORDER BY email';
    const result = await client.query(query, [`%${searchTerm}%`]);
    return result.rows;
  } finally {
    await client.end();
  }
}
module.exports = searchUsers;
