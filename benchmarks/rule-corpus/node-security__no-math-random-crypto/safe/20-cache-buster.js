/**
 * SAFE (wave 2, name-inference probe) - a cache-busting query parameter.
 *
 * `cacheKey` contains the word `key`. It is not a key in any security sense:
 * it is a string appended so a CDN treats the request as new. Reporting here
 * is a pure name match.
 */
'use strict';

async function fetchFresh(url, fetchImpl = fetch) {
  const cacheKey = `_=${Math.floor(Math.random() * 1e9)}`;
  const separator = url.includes('?') ? '&' : '?';
  const response = await fetchImpl(`${url}${separator}${cacheKey}`, {
    cache: 'no-store',
  });
  return response.json();
}

module.exports = { fetchFresh };
