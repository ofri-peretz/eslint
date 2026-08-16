// Wave 2. The check runs first and then does nothing about the answer: it logs
// and falls through to the statement anyway.
const { Client } = require('pg');

const client = new Client();
const ALLOWED = ['reporting', 'billing'];

async function scope(schema) {
  if (!ALLOWED.includes(schema)) {
    console.warn('unexpected schema', schema);
  }
  await client.query(`SET search_path TO ${schema}`);
}

module.exports = { scope };
