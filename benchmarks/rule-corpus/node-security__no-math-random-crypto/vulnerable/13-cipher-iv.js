/**
 * VULNERABLE - AES-GCM initialisation vector filled from Math.random().
 *
 * GCM catastrophically fails on IV reuse: two messages under the same key and
 * IV leak the XOR of the plaintexts and the authentication subkey. Math.random()
 * gives an attacker who can observe a few IVs the ability to predict - and
 * therefore to force collisions with - every later one.
 */
'use strict';

const crypto = require('node:crypto');

function encryptField(plaintext, key) {
  const iv = Buffer.from(
    Array.from({ length: 12 }, () => Math.floor(Math.random() * 256)),
  );

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);

  return { iv: iv.toString('base64'), body: body.toString('base64'), tag: cipher.getAuthTag() };
}

module.exports = { encryptField };
