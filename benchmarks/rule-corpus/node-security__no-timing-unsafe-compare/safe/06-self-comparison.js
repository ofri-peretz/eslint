/**
 * SAFE - a format assertion on one value.
 *
 * `token !== token.trim()` compares a value against a reading of ITSELF. There
 * is no second value in the program for a timing oracle to reveal; the
 * duration tells the attacker only about the token they just sent.
 */
'use strict';

function normalizeBearer(req) {
  const token = String(req.headers.authorization || '').replace(/^Bearer /, '');

  if (token !== token.trim()) {
    throw Object.assign(new Error('token contains whitespace'), { status: 400 });
  }
  if (token.length === 0) {
    throw Object.assign(new Error('empty token'), { status: 401 });
  }

  return token;
}

module.exports = { normalizeBearer };
