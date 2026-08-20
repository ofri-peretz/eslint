/**
 * SAFE (wave 3, name-inference probe) - a refresh SCHEDULE for a token.
 *
 * `tokenRefreshDelay` carries the strongest word in the vocabulary, and the
 * value is a number of milliseconds. Randomising it stops every replica
 * refreshing in the same second; it is not a credential and never becomes one.
 */
'use strict';

const REFRESH_BASE_MS = 45 * 60 * 1000;

function scheduleRefresh(client) {
  const tokenRefreshDelay = REFRESH_BASE_MS + Math.random() * 5 * 60 * 1000;
  return setTimeout(() => client.refresh(), tokenRefreshDelay);
}

module.exports = { scheduleRefresh };
