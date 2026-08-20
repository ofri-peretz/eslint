// Wave 2. pg-format with every argument constant. The formatter is only a
// finding when it is handed something that can change.
const { Client } = require('pg');
const format = require('pg-format');

const client = new Client();

async function useReporting() {
  await client.query(format('SET search_path TO %I, %I', 'reporting', 'public'));
}

module.exports = { useReporting };
