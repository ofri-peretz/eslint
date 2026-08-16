/**
 * VULNERABLE - logout unbinds the refresh token from the session object and
 * treats that as revocation. The string is still in the heap and, more to the
 * point, the token is still valid at the issuer: nothing here revokes it.
 */
function logout(session) {
  delete session.refreshToken;
  session.loggedOutAt = Date.now();
  return session;
}

module.exports = { logout };
