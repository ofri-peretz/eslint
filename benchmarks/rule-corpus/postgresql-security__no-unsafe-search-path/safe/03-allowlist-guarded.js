// The remediation for CWE-426: the value is checked against a closed set and
// the request is aborted before the statement runs.
const { Pool } = require('pg');

const pool = new Pool();
const TENANT_SCHEMAS = new Set(['tenant_acme', 'tenant_globex', 'tenant_initech']);

async function enterTenant(schema) {
  if (!TENANT_SCHEMAS.has(schema)) {
    throw new Error(`unknown tenant schema: ${schema}`);
  }
  await pool.query(`SET search_path TO ${schema}, public`);
}

module.exports = { enterTenant };
