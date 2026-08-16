/**
 * SAFE for THIS rule - Math.random() for a non-cryptographic backoff. Whether
 * that deserves a report is no-math-random-crypto's question, not this rule's.
 */
export const jitter = (base) => base + Math.random() * 50;
