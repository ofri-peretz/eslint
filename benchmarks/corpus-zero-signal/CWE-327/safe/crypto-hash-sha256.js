// CWE-327: sha256() from the same package
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-08-13
// This must NOT be detected — the remediated form of crypto-hash-sha1.js
import { sha256 } from 'crypto-hash';
export const digest = (data) => sha256(data);
