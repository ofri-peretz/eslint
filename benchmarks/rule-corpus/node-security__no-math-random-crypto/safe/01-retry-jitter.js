/**
 * SAFE - exponential backoff with full jitter.
 *
 * The randomness exists so that a thundering herd of clients does not retry in
 * lockstep. An attacker who predicts the delay learns when a retry happens,
 * which is not a secret and is observable anyway. Reporting here is the false
 * positive that makes a team disable the rule.
 */
'use strict';

const BASE_DELAY_MS = 100;
const MAX_DELAY_MS = 30_000;

async function withBackoff(operation, attempts = 5) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const ceiling = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** attempt);
      const delay = Math.random() * ceiling;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

module.exports = { withBackoff };
