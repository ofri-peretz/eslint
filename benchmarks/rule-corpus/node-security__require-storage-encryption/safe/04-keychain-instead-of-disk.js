/**
 * SAFE - the credential goes to the OS keychain instead of a file. There is no
 * disk write of a secret anywhere in this module; the only thing written is a
 * non-secret account hint.
 */
const fs = require('fs');
const keytar = require('keytar');

async function login(profilePath, account, token) {
  await keytar.setPassword('com.example.cli', account, token);
  fs.writeFileSync(profilePath, JSON.stringify({ account, loggedInAt: Date.now() }));
}

module.exports = { login };
