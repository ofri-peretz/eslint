/**
 * VULNERABLE (wave 2) - Leading whitespace before the name, which browsers trim.
 */
document.cookie = ' refresh_token=' + token + '; Secure; SameSite=Strict';
