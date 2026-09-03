/**
 * SAFE (for this rule) - A real vulnerability, owned by no-cookie-auth-tokens.
 * Different medium, different remediation.
 */
document.cookie = 'access_token=' + token + '; Secure; SameSite=Strict';
