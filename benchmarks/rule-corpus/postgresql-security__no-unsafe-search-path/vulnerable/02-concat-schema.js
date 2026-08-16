// The same hijack written as concatenation instead of interpolation.
const { Client } = require('pg');

const client = new Client();

async function listReports(schemaFromQueryString) {
  await client.connect();
  await client.query('SET search_path = ' + schemaFromQueryString);
  return client.query('SELECT * FROM report_definitions');
}

module.exports = { listReports };
