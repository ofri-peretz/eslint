/**
 * SAFE - A relative path that never reaches a URL sink. It is a cache key, and
 * a rule that reported every slash-shaped template would fire on most of the
 * strings in a program.
 */
export function cacheKey(userId) {
  return `/users/${userId}/preferences`;
}
