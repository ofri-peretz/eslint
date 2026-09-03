/**
 * SAFE (for this rule) - A real vulnerability owned by no-sensitive-cookie-js.
 */
document.cookie = 'api_key=' + key + '; Secure; SameSite=Lax';
