/**
 * VULNERABLE - The value arrives via an array index; the NAME is the evidence.
 */
const codes = user.recoveryCodes;
document.cookie = 'recovery_code=' + codes[0] + '; Secure; SameSite=Strict';
