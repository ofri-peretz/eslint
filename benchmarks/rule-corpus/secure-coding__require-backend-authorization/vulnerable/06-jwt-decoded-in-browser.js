/**
 * VULNERABLE - The client decodes its own JWT and trusts the claim. Decoding is
 * not verifying: the payload is base64, not a signature check, so the caller can
 * mint any claim they like and the redirect - and the admin bundle behind it -
 * follows.
 */
import { jwtDecode } from 'jwt-decode';

export function routeAfterLogin(token) {
  const claims = jwtDecode(token);

  if (claims.admin) {
    window.location.assign('/admin/dashboard');
    return;
  }

  window.location.assign('/dashboard');
}
