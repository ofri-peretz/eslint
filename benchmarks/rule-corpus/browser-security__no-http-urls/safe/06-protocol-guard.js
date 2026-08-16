/**
 * SAFE - The literal is being EXAMINED, not used. Reporting it flags the
 * security check as the vulnerability, which is exactly backwards.
 */
export function requireHttps(url) {
  if (url.startsWith('http://')) {
    throw new Error('cleartext endpoint rejected');
  }
  return url;
}
