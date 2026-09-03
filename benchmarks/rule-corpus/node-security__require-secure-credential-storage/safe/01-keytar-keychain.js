/**
 * SAFE - the correct remediation. keytar hands the credential to the OS
 * keychain (Keychain on macOS, libsecret on Linux, Credential Vault on
 * Windows), which encrypts it at rest and scopes it to the user account.
 */
const keytar = require('keytar');

const SERVICE = 'com.example.cli';

async function storeApiToken(account, token) {
  await keytar.setPassword(SERVICE, account, token);
}

async function loadApiToken(account) {
  return keytar.getPassword(SERVICE, account);
}

module.exports = { storeApiToken, loadApiToken };
