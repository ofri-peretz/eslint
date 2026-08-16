/**
 * SAFE - the credential is held in a module-scoped variable for the lifetime of
 * the process and never persisted anywhere. There is no store, so there is
 * nothing at rest.
 */
let cachedAccessToken = null;
let expiresAt = 0;

async function getAccessToken(oauth) {
  if (cachedAccessToken && Date.now() < expiresAt) return cachedAccessToken;
  const grant = await oauth.clientCredentials();
  cachedAccessToken = grant.access_token;
  expiresAt = Date.now() + grant.expires_in * 1000;
  return cachedAccessToken;
}

module.exports = { getAccessToken };
