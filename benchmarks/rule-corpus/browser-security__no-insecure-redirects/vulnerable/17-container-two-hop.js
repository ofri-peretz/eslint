/**
 * VULNERABLE - A query value out of a URL container, then one more binding hop
 * before the sink.
 *
 * The two-hop shape is what caught a cycle-guard bug: the container probe and
 * the passthrough walk shared one `seen` set, so asking "is this receiver a
 * container?" left the binding's name in the guard and the walk that ran
 * immediately after it short-circuited to "not tainted".
 */
export function forward() {
  const raw = new URLSearchParams(location.search).get('next');
  const target = raw.trim();
  location.replace(target);
}
