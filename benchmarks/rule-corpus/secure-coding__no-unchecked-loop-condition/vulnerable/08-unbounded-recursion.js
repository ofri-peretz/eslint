/**
 * VULNERABLE - CWE-674. A recursive walk over a client-supplied tree with no
 * depth limit. A 20k-deep nested JSON body overflows the stack and takes the
 * worker with it; this is the shape behind several JSON-parser advisories.
 */
export function flattenCategories(node, accumulator = []) {
  accumulator.push(node.id);
  for (const child of node.children ?? []) {
    flattenCategories(child, accumulator);
  }
  return accumulator;
}
