/**
 * VULNERABLE - Secure is set, SameSite is not.
 */
document.cookie = 'sid=abc; Path=/; Secure';
