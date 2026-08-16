/**
 * VULNERABLE - Computed property access.
 */
document['cookie'] = 'cvv=' + form.cvv + '; Secure; SameSite=Strict';
