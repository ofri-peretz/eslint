/**
 * VULNERABLE - `includes` cannot decide a host. `https://trusted.com.evil.io/`
 * and `https://evil.io/?r=trusted.com` both pass.
 */
export function isSafe(returnUrl) {
  return returnUrl.includes('trusted.com');
}
