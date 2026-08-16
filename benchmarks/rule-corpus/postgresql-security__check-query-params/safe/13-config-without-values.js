// Wave 2. A named prepared statement with no values at all. There is no pair
// to compare, so there is nothing to report.
const { Client } = require('pg');

const client = new Client();

async function health() {
  return client.query({ name: 'health', text: 'SELECT 1' });
}

module.exports = { health };
