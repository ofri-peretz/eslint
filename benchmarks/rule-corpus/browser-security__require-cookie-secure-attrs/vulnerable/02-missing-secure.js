/**
 * VULNERABLE - SameSite is set, Secure is not. The cookie still travels in
 * cleartext to any http:// URL on the domain.
 */
document.cookie = 'sid=abc; Path=/; SameSite=Strict';
