/**
 * SAFE - the migration landed. node-forge and sjcl survive only in the comment
 * that records why they went away.
 */
import { createHash } from 'node:crypto';

// Replaced node-forge (certs) and sjcl (AES) with node:crypto in Q1 2026.
export const digest = (buffer) => createHash('sha512').update(buffer).digest('base64');
