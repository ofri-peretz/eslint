/** SAFE - the vocabulary appears only in documentation and in a UI string.
 *
 *  Clickjacking defence for this app is frame-ancestors 'none', set at the
 *  edge; do not add X-Frame-Options per route.
 */
export const SECURITY_COPY = {
  heading: 'Clickjacking protection',
  body: 'Framing this page is blocked by our Content-Security-Policy.',
};
