/**
 * VULNERABLE (wave 2) - The word "Secure" inside the cookie VALUE, not as an
 * attribute.
 */
document.cookie = 'mode=Secure; SameSite=Lax';
