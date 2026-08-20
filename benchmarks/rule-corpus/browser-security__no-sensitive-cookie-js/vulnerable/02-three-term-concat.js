/**
 * VULNERABLE - Three-term concatenation. Reading only `left` of the
 * BinaryExpression sees another BinaryExpression, not the literal — so this
 * spelling was silent.
 */
document.cookie = 'api_key=' + key + '; Path=/; Secure; SameSite=Lax';
