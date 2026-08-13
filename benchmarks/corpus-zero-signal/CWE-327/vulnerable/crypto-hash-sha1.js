// CWE-327: sha1() imported from the crypto-hash package
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-08-13
// This MUST be detected by node-security/no-sha1-hash
import { sha1 } from 'crypto-hash';
export const digest = (data) => sha1(data);
