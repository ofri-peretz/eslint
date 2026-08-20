/**
 * VULNERABLE - session identifier minted by a factory that returns Math.random().
 *
 * A guessable session id is session hijacking without any credential theft:
 * the attacker never needs the password, only the cookie value.
 */
'use strict';

const store = require('../lib/session-store');

function createSessionId() {
  return `sess_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

async function startSession(res, userId) {
  const id = createSessionId();
  await store.put(id, { userId, createdAt: Date.now() });
  res.cookie('sid', id, { httpOnly: true, sameSite: 'lax', secure: true });
  return id;
}

module.exports = { startSession, createSessionId };
