/**
 * VULNERABLE - A session token measured against an expected value in the
 * browser. Moving this to the server is the entire fix.
 */
if (session.token === expectedToken) {
  grantAccess();
}
