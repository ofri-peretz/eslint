/**
 * SAFE (wave 2, name-inference probe) - jitter on retries against the auth
 * service.
 *
 * Identical to safe/01 in every way that matters to CWE-338; the only change
 * is that the delay is named after the SERVICE it is retrying. The random
 * value is still a sleep duration, not a credential.
 */
'use strict';

const BASE_MS = 200;

async function callAuthService(client, path, attempts = 3) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await client.post(path);
    } catch (error) {
      lastError = error;
      const authRetryDelay = BASE_MS * 2 ** attempt + Math.random() * BASE_MS;
      await new Promise((resolve) => setTimeout(resolve, authRetryDelay));
    }
  }
  throw lastError;
}

module.exports = { callAuthService };
