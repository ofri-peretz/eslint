/**
 * ADVERSARIAL VULNERABLE - a barrel re-exporting a single crypto-js subpath
 * under a renamed default. Neither an import binding nor a require call appears
 * anywhere in the file (CWE-1104).
 */
export { default as legacyMd5 } from 'crypto-js/md5';
