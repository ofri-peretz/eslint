/**
 * VULNERABLE (wave 2) - `document.cookie +=` is the append idiom and is the
 * same write as `=`.
 */
document.cookie += 'session=' + id + '; Secure; SameSite=Strict';
