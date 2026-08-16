/**
 * VULNERABLE (wave 2, positive control) - a `let` whose attacker-controlled
 * value arrives by reassignment.
 *
 * Pairs with safe/26, the same shape where every write is a literal.
 */
'use strict';

const serviceToken = process.env.SERVICE_TOKEN;

function authorize(req) {
  let candidate = '';

  if (req.headers['x-api-key']) {
    candidate = req.headers['x-api-key'];
  }

  if (candidate === serviceToken) {
    return { ok: true };
  }
  return { ok: false };
}

module.exports = { authorize };
