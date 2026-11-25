// CWE-330: Use of Insufficiently Random Values — modulo-biased password characters
// @author       claude
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-11-25
// This MUST be detected — shape of ToolJet's generateTJDBPasswordForRole before
// ToolJet/ToolJet#19245. 256 random byte values fold onto a 70-character
// alphabet, so the first 46 characters are picked 4 times in 256 and the other
// 24 only 3 times.
import crypto from 'node:crypto';

const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const lowercase = 'abcdefghijklmnopqrstuvwxyz';
const numbers = '0123456789';
const symbols = '!@#$%^&*';
const allChars = uppercase + lowercase + numbers + symbols;

export function generatePassword(length = 30) {
  return Array.from(crypto.randomBytes(length))
    .map((b) => allChars[b % allChars.length])
    .join('');
}
