/**
 * VULNERABLE (CWE-1049) - A `map` nested inside a for-of. Treating `map` as a
 * value producer must not make the enclosing loop invisible — the walk has to
 * continue through it and find the loop above.
 */
const { Pool } = require('pg');

const pool = new Pool();

async function syncTenants(tenants) {
  for (const tenant of tenants) {
    await Promise.all(
      tenant.skus.map((sku) =>
        pool.query('UPDATE products SET tenant_id = $1 WHERE sku = $2', [tenant.id, sku]),
      ),
    );
  }
}

module.exports = { syncTenants };
