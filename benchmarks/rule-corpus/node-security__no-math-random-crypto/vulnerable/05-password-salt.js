/**
 * VULNERABLE - per-user password salt drawn from Math.random().
 *
 * A salt does not need to be secret, but it does need to be UNIQUE and
 * unpredictable enough that an attacker cannot precompute. Math.random()
 * gives an attacker who knows the registration order the whole salt sequence,
 * which collapses the cost of a rainbow table back to one table.
 */
'use strict';

const { pbkdf2Sync } = require('node:crypto');

const ITERATIONS = 210000;

function hashPassword(plaintext) {
  const salt = Math.random().toString(16).slice(2, 18);
  const derived = pbkdf2Sync(plaintext, salt, ITERATIONS, 32, 'sha256');
  return { salt, hash: derived.toString('hex'), iterations: ITERATIONS };
}

module.exports = { hashPassword };
