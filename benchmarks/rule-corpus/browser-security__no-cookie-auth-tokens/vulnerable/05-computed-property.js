/**
 * VULNERABLE - Computed property access on document.
 */
document['cookie'] = 'jwt=' + token + '; Secure; SameSite=Strict';
