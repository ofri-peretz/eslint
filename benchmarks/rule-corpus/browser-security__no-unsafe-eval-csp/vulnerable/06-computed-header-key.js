/** VULNERABLE - headers written into a plain object under a computed key, the
 *  shape every fetch wrapper and every edge middleware uses. */
const CSP_HEADER = 'Content-Security-Policy';

export function withSecurityHeaders(response) {
  response.headers[CSP_HEADER] =
    "default-src 'self'; script-src 'self' 'unsafe-eval'; object-src 'none'";
  return response;
}
