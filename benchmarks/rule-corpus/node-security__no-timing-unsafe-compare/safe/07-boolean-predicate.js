/**
 * SAFE - comparing two booleans in a state reducer.
 *
 * `isAuthenticated` matches the secret vocabulary through `auth`. Comparing
 * two booleans leaks one bit the caller is holding in both hands already.
 */
'use strict';

function didAuthStateChange(previous, next) {
  if (previous.isAuthenticated !== next.isAuthenticated) return true;
  if (previous.hasRefreshToken !== next.hasRefreshToken) return true;
  return false;
}

module.exports = { didAuthStateChange };
