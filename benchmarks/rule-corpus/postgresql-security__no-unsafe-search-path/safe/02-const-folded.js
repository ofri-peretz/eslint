// The schema is interpolated, but it folds to a literal written three lines
// up. Nothing here can change at runtime.
const { Client } = require('pg');

const REPORTING_SCHEMA = 'analytics';
const client = new Client();

async function useReporting() {
  await client.query(`SET search_path TO ${REPORTING_SCHEMA}, public`);
  return client.query('SELECT * FROM daily_rollup');
}

module.exports = { useReporting };
