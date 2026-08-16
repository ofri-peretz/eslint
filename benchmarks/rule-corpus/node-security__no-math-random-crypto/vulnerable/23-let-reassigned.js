/**
 * VULNERABLE (wave 2, positive control) - a `let` whose credential value
 * arrives by reassignment, not by its initialiser.
 *
 * Pairs with safe/23, which is the same shape where every write is a literal.
 * If both files behave the same way the rule is not reading the writes.
 */
'use strict';

const store = require('../lib/session-store');

async function issueSession(user, { anonymous }) {
  let sessionToken = 'anonymous';

  if (!anonymous) {
    sessionToken = Math.random().toString(36).slice(2);
    await store.put(sessionToken, { userId: user.id });
  }

  return sessionToken;
}

module.exports = { issueSession };
