/**
 * VULNERABLE - the credential is built in a local, then returned by a helper
 * whose NAME is the only thing that says "token".
 *
 * Same bug as 02, one statement apart: the Math.random() call sits under a
 * declarator (`raw`) instead of directly under the `return`.
 */
'use strict';

const store = require('../lib/session-store');

function makeSessionToken() {
  const raw = Math.random().toString(36).slice(2);
  return raw;
}

async function login(res, user) {
  const value = makeSessionToken();
  await store.put(value, { userId: user.id });
  res.setHeader('Set-Cookie', `sid=${value}; HttpOnly; Secure; Path=/`);
}

module.exports = { login, makeSessionToken };
