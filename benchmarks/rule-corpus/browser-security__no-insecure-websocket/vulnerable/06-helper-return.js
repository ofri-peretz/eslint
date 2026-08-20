/**
 * VULNERABLE - The URL comes back from a helper, the shape that defeats a rule
 * looking for a literal adjacent to a constructor.
 */
function feedUrl() {
  return 'ws://live.acme-corp.io/feed';
}

export function open(connect) {
  return connect(feedUrl());
}
