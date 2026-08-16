/**
 * VULNERABLE - session identifier from the cookie compared against the stored
 * one with `===`.
 *
 * The cookie is entirely attacker-supplied and the stored value is the secret
 * being guessed, which is exactly the two-sided arrangement a timing oracle
 * needs.
 */
'use strict';

const store = require('../lib/session-store');

async function resumeSession(req) {
  const record = await store.lookup(req.cookies.sid);
  if (!record) return null;

  if (req.cookies.sessionId === record.sessionId) {
    return record;
  }
  return null;
}

module.exports = { resumeSession };
