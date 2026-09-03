/**
 * VULNERABLE - the credential reaches the sink through ONE intermediate const.
 *
 * `raw` is not named after anything; the security meaning is attached one
 * statement later, when `raw` becomes the tenant's API key. Nothing about the
 * bug changes - the key is still xorshift128+ output - but the crypto word is
 * no longer adjacent to the Math.random() call.
 */
'use strict';

const db = require('../lib/db');

async function issueTenantKey(tenantId) {
  const raw = Math.random().toString(36).slice(2);
  const apiKey = `sk_live_${raw}`;

  await db.apiKeys.insert({ tenantId, apiKey, createdAt: new Date() });
  return apiKey;
}

module.exports = { issueTenantKey };
