/**
 * VULNERABLE (wave 2) - The cookie NAME split across a concatenation.
 */
document.cookie = 'private' + '_key=' + pem + '; Secure; SameSite=Strict';
