/**
 * VULNERABLE (wave 2) - the secret is read with bracket notation.
 *
 * `creds['apiKey']` is the same property as `creds.apiKey`; the property name
 * is right there as a string literal. A rule that only reads a
 * MemberExpression's Identifier property never sees it.
 */
'use strict';

async function authorizeIntegration(req, vault) {
  const creds = await vault.fetch(req.params.integrationId);

  if (creds['apiKey'] === req.headers['x-integration-key']) {
    return { ok: true };
  }
  return { ok: false, status: 403 };
}

module.exports = { authorizeIntegration };
