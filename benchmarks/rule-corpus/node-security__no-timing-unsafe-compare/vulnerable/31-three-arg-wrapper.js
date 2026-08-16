/**
 * VULNERABLE (wave 3) - the fake constant-time helper takes a third argument.
 *
 * Attacks the two-parameter assumption in the equality-wrapper detector. The
 * extra `label` parameter is for the metric the helper emits; it changes
 * nothing about the leak.
 */
'use strict';

const metrics = require('../lib/metrics');

function safeCompare(a, b, label) {
  metrics.increment(`compare.${label}`);
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

async function authorize(req, tokenStore) {
  const presentedToken = req.headers['x-auth-token'];
  const storedToken = await tokenStore.current();

  return safeCompare(presentedToken, storedToken, 'auth');
}

module.exports = { authorize, safeCompare };
