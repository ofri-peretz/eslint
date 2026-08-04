/**
 * Lock: the built devkit must not `require` an optional peer at runtime.
 *
 * `@typescript-eslint/utils` is declared `optional: true` in
 * peerDependenciesMeta, so npm does not install it. Any *value* imported from it
 * (notably `AST_NODE_TYPES`, which is an enum) survives compilation as a real
 * `require`, and every published plugin then throws
 * "Cannot find module '@typescript-eslint/utils'" on a clean install.
 *
 * That shipped once. This test fails the moment it would ship again.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** Every emitted .js file under the package's published output. */
function emittedJsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...emittedJsFiles(full));
    else if (entry.endsWith('.js')) out.push(full);
  }
  return out;
}

/** Peers npm will not install, so a runtime require of them crashes consumers. */
const OPTIONAL_PEERS = ['@typescript-eslint/utils', '@typescript-eslint/types'];

describe('published output does not require optional peers at runtime', () => {
  const distRoot = resolve(__dirname, '..', 'dist', 'src');

  it('emits no runtime require of an optional peer', () => {
    const offenders: string[] = [];
    for (const file of emittedJsFiles(distRoot)) {
      const source = readFileSync(file, 'utf-8');
      for (const peer of OPTIONAL_PEERS) {
        // `require("pkg")` — the compiled form of a value import. Type-only
        // imports are erased and never appear here.
        if (source.includes(`require("${peer}")`) || source.includes(`require('${peer}')`)) {
          offenders.push(`${file.slice(distRoot.length + 1)} → ${peer}`);
        }
      }
    }
    expect(
      offenders,
      `These files require an optional peer at runtime, which npm does not install.\n` +
        `Import the value from a local shim instead (see src/ast-node-types.ts), or use\n` +
        `\`import type\` if only the type is needed:\n  ${offenders.join('\n  ')}`,
    ).toEqual([]);
  });
});
