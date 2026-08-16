/**
 * SAFE - The Function constructor compiled entirely from source-controlled
 * literals. This is how template engines and column formatters build a hot path;
 * there is no attacker-reachable text in the body.
 */
const ACCESSORS = new Map();

export function columnAccessor(field) {
  if (!ACCESSORS.has(field)) {
    ACCESSORS.set(field, new Function('row', 'return row.total;'));
  }
  return ACCESSORS.get(field);
}
