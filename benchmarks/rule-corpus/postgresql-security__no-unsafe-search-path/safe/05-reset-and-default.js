// Restoring the server default is the opposite of hijacking it.
const { Pool } = require('pg');

const pool = new Pool();

async function clearTenant(client) {
  await client.query('RESET search_path');
  await client.query('SET search_path TO DEFAULT');
}

module.exports = { clearTenant, pool };
