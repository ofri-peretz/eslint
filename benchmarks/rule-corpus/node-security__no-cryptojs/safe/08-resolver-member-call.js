/**
 * SAFE - `resolver.require(...)` is a method on a dependency-graph object, not
 * the CommonJS loader. This file inspects a manifest; it imports nothing.
 */
export function resolveAll(resolver, manifest) {
  return manifest.map((name) => ({ name, resolved: resolver.require(name) }));
}

export const probe = (resolver) => resolver.require('crypto-js');
