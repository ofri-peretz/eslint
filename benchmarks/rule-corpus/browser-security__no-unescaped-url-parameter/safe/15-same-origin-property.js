/**
 * SAFE - `location.origin` and `location.protocol` are the CURRENT origin,
 * normalised by the browser. They cannot carry a metacharacter an attacker
 * chose, and echoing them back cannot send anyone anywhere new.
 */
export function callbackUrl() {
  return `https://auth.example.com/v1/authorize?redirect_uri=${location.origin}/done`;
}
