/**
 * SAFE (adversarial wave) - Two Maps whose names contain a router word as a
 * genuine whole segment: `routeCache` (memoised route resolutions) and
 * `serverStats` (per-host counters). Whole-word matching does not save these -
 * `route` and `server` really are segments here - so only the resolved binding
 * can tell a Map from an Express app.
 */
const routeCache = new Map();
const serverStats = new Map();

export function resolveRoute(pathname) {
  const hit = routeCache.get(pathname);
  if (hit) return hit;

  const resolved = { pathname, resolvedAt: Date.now() };
  routeCache.set(pathname, resolved);
  return resolved;
}

export function forgetRoute(pathname) {
  routeCache.delete(pathname);
}

export function readStats(host) {
  return serverStats.get(host);
}
