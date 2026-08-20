/**
 * ADVERSARIAL VULNERABLE - crypto-js delivered by a <script> tag, so `CryptoJS`
 * is a global with no import to resolve. This legacy admin page mints
 * password-reset links from CVE-2020-36732 bytes (CWE-338).
 */
/* global CryptoJS */
export function resetLink(userId) {
  const token = CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Hex);
  return `/admin/reset?u=${userId}&t=${token}`;
}
