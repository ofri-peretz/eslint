/**
 * ADVERSARIAL VULNERABLE - one hop written as a computed member with an inline
 * string, which is what a minifier or a config-driven wrapper leaves behind
 * (CWE-338).
 */
import CryptoJS from 'crypto-js';

export const csrfToken = () => CryptoJS.lib['WordArray'].random(24).toString();
