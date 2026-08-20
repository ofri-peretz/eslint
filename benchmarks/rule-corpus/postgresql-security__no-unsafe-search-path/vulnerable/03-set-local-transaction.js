// SET LOCAL scopes the change to the transaction, which does not make the
// VALUE any safer: the attacker still chooses which schema resolves first.
const { Pool } = require('pg');

const pool = new Pool();

async function withTenant(tenantSchema, work) {
  const tx = await pool.connect();
  try {
    await tx.query('BEGIN');
    await tx.query(`SET LOCAL search_path TO ${tenantSchema}, public`);
    const result = await work(tx);
    await tx.query('COMMIT');
    return result;
  } catch (err) {
    await tx.query('ROLLBACK');
    throw err;
  } finally {
    tx.release();
  }
}

module.exports = { withTenant };
