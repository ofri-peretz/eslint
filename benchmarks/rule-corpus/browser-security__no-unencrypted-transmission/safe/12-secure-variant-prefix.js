/**
 * SAFE - ADVERSARIAL. `rediss://` and `mongodb+srv://` START with the insecure
 * scheme's letters. A prefix test that stopped one character early would report
 * every correctly-secured connection string in the codebase — the remediation
 * flagged as the defect.
 */
export const cache = 'rediss://cache.acme-corp.io:6379';
export const db = 'mongodb+srv://cluster.acme-corp.io/app';
export const files = 'ftps://files.acme-corp.io/incoming';
