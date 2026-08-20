/**
 * VULNERABLE - The cookie string built into a binding first.
 */
const cookie = 'passphrase=' + wallet.passphrase + '; Secure; SameSite=Strict';
document.cookie = cookie;
