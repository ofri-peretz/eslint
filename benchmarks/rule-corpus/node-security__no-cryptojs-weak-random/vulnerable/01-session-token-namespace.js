/**
 * VULNERABLE - session identifiers minted from CryptoJS.lib.WordArray.random().
 * Before 3.2.1 that generator was Math.random() (CVE-2020-36732), so every
 * session id in this service is predictable from a handful of samples (CWE-338).
 */
import CryptoJS from 'crypto-js';

export function issueSession(res) {
  const token = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
  res.cookie('sid', token, { httpOnly: true, sameSite: 'lax' });
  return token;
}
