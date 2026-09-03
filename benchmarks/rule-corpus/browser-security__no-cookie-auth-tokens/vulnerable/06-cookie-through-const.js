/**
 * VULNERABLE - The whole cookie string built into a binding first.
 */
const cookie = 'bearer=' + token + '; Secure; SameSite=Strict';
document.cookie = cookie;
