/**
 * SAFE - A persistence data-mapper. `dataMapper.get(id)` and
 * `dataMapper.delete(id)` are row accessors against a local Map; nothing here
 * is reachable over the network.
 *
 * `app` is a substring of `dataMapper`, so this is the same carrier as fixture
 * 04 in a different vocabulary - persistence rather than caching.
 */
const rows = new Map();

export const dataMapper = {
  get: (id) => rows.get(id),
  put: (id, row) => rows.set(id, row),
  delete: (id) => rows.delete(id),
};

export function hydrateOrder(id) {
  const row = dataMapper.get(id);
  if (!row) return null;
  return { ...row, hydratedAt: Date.now() };
}

export function forgetOrder(id) {
  dataMapper.delete(id);
}
