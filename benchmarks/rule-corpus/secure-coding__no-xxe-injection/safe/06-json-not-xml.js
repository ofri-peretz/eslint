/**
 * SAFE - JSON, not XML. `JSON.parse` of a request body is not CWE-611 under any
 * reading; this exact shape was measured firing across this monorepo before the
 * receiver allowlist landed, so it stays in the corpus as a regression guard.
 */
import fs from 'node:fs';

export function loadTenantConfig(req) {
  const raw = fs.readFileSync(`/etc/tenants/${req.params.tenant}.json`, 'utf-8');
  return JSON.parse(raw);
}
