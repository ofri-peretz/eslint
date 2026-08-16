// Adversarial: escapeIdentifier is the documented remediation for CWE-89 and
// it is the WRONG remediation here. A correctly quoted schema name is still a
// schema name the attacker picked; CWE-426 needs an allowlist, not quoting.
const { Client, escapeIdentifier } = require('pg');

const client = new Client();

async function enterTenant(tenantSchema) {
  await client.query(`SET search_path TO ${escapeIdentifier(tenantSchema)}, public`);
}

module.exports = { enterTenant };
