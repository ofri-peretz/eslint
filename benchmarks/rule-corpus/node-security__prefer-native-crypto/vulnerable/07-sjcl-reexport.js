/**
 * VULNERABLE - an internal barrel re-exporting SJCL under the project's own
 * name, so every consumer depends on it without ever naming it (CWE-1104).
 */
export { default as legacyCipher } from 'sjcl';
export const CIPHER_BACKEND = 'sjcl';
