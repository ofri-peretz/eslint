/**
 * VULNERABLE - The key is a binding; the string it resolves to is the evidence.
 */
const VAULT_KEY = 'recovery_code';
localStorage.setItem(VAULT_KEY, code);
