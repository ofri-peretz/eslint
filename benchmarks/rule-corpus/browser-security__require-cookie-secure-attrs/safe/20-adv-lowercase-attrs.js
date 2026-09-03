/**
 * SAFE (wave 2) - Attribute names are case-insensitive per RFC 6265.
 */
document.cookie = 'a=b; secure; samesite=strict';
document.cookie = 'c=d;Secure;SameSite=Lax';
