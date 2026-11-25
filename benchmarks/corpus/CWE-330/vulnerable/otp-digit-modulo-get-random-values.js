// CWE-330: Use of Insufficiently Random Values — modulo-biased one-time code
// @author       claude
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-11-25
// This MUST be detected — a six-digit code from Web Crypto bytes reduced with
// % 10: digits 0-5 come up 26 times in 256, digits 6-9 only 25.
export function oneTimeCode() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => String(b % 10)).join('');
}
