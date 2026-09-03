/**
 * SAFE - `push` is an Array method. Matching it on any receiver would make
 * every job queue in every codebase an open redirect.
 */
const visited = [];
visited.push(window.location.hash);
