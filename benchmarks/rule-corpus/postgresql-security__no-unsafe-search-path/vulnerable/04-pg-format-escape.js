// pg-format's %I escapes the identifier, so this is not SQL injection.
// It is still CWE-426: an escaped attacker-chosen schema resolves first and
// can shadow every function and table the rest of the session touches.
const { Client } = require('pg');
const format = require('pg-format');

const client = new Client();

async function useSchema(schema) {
  await client.query(format('SET search_path TO %I', schema));
}

module.exports = { useSchema };
