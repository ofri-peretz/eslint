// CWE-330: Use of Insufficiently Random Values — unbiased password characters
// @author       claude
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-11-25
// Safe twin of password-modulo-random-bytes.js — ToolJet after #19245:
// crypto.randomInt draws uniformly from [0, n) for any n.
import crypto from 'node:crypto';

const allChars =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';

export function generatePassword(length = 30) {
  return Array.from(
    { length },
    () => allChars[crypto.randomInt(allChars.length)],
  ).join('');
}
