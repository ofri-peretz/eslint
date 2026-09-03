/**
 * VULNERABLE - the textbook character-accumulator token builder.
 *
 * `let token = ''` initialises to a literal, so nothing about the declarator
 * says "random". Every character of the credential arrives through the `+=`
 * inside the loop. This is the single commonest hand-rolled token generator in
 * the wild and it is entirely Math.random().
 */
'use strict';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function newInviteToken(length = 32) {
  let token = '';
  for (let i = 0; i < length; i += 1) {
    token += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return token;
}

module.exports = { newInviteToken };
