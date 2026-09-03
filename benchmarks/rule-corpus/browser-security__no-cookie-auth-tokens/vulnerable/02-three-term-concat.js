/**
 * VULNERABLE - Three-term concatenation, which is how cookies are actually
 * written. It parses as (('sid=' + id) + '; …'), so anything that only reads
 * `left` sees a BinaryExpression rather than the literal.
 */
document.cookie = 'sid=' + sessionId + '; Path=/; Secure; SameSite=Lax';
