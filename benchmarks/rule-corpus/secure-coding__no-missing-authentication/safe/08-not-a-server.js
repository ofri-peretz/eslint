/**
 * SAFE - Baseline control. Ordinary standard-library accessors named `get`,
 * `post` and `delete` on objects that are plainly not HTTP routers.
 */
export function summarise(headers, params, registry) {
  const contentType = headers.get('content-type');
  const cursor = params.get('cursor');
  const entry = registry.get('checkout');

  registry.delete('stale');

  return { contentType, cursor, entry };
}
