/**
 * SAFE - Matched by `calleeText.includes('set')`, which also matches `offset`,
 * `reset`, `dataset` and `unset`. Nothing here says who chooses `data.length`:
 * `data` is a parameter, and a function's argument name says nothing about its
 * callers.
 */
const userCache = new Map();

function cacheUserData(userId, data) {
  userCache.set(userId, {
    data,
    largeBuffer: Buffer.alloc(data.length * 2),
  });
}

module.exports = { cacheUserData };
