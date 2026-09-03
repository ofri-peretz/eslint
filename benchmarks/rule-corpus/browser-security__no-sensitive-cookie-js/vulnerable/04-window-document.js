/**
 * VULNERABLE - `window.document.cookie` is the same sink.
 */
window.document.cookie = 'private_key=' + pem + '; Secure; SameSite=Strict';
