/**
 * TS7 whole-graph typecheck lock.
 *
 * `tsconfig.solution.json` (repo root) is the single entry point `tsgo --build`
 * compiles for the whole-graph typecheck — the thing that makes TypeScript 7
 * faster here than 21 per-package invocations (see .agent/TS7_MIGRATION_PLAN.md
 * and the `typecheck` script in the root package.json).
 *
 * The invariant this locks: the solution must reference EVERY composite
 * plugin-graph package's `tsconfig.lib.json`. A package that adds a composite
 * lib config but isn't wired into the solution silently escapes the typecheck
 * gate (`turbo run typecheck` no longer drives the gate). tsgo self-catches a
 * *dangling* reference (removed package → "referenced project not found") and a
 * missing dependency edge (a plugin config-interlace imports but doesn't
 * reference → TS2307 in the build). This test closes the remaining gap: a new
 * composite package that never gets added here at all.
 *
 * `@interlace/ui` (packages/ui) is intentionally excluded: it is a
 * bundler-resolution, `noEmit`, no-workspace-deps React package that keeps its
 * own `tsc --noEmit` typecheck (run via `npm run typecheck` after the graph).
 */

import { readFile, readdir } from 'node:fs/promises';
import { describe, it, expect } from 'vitest';

// packages/ dir names excluded from the composite typecheck graph. See header.
const EXCLUDED = new Set(['ui']);

// The solution config is JSONC and uses only full-line `//` comments — keep it
// that way so this strip stays correct (no `//` inside JSON string values).
function stripJsonc(raw: string): string {
  return raw.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

const packagesDir = new URL('../../', import.meta.url);
const solutionUrl = new URL('../../../tsconfig.solution.json', import.meta.url);

const solution = JSON.parse(
  stripJsonc(await readFile(solutionUrl, 'utf8')),
) as { references?: ReadonlyArray<{ path: string }> };

const referenced = (solution.references ?? []).map((r) =>
  r.path.replace(/^\.\//, ''),
);

// Composite plugin-graph packages on disk: every `packages/*/tsconfig.lib.json`
// with `composite: true`, minus the documented exclusions.
const dirs = (await readdir(packagesDir, { withFileTypes: true }))
  .filter((e) => e.isDirectory() && !EXCLUDED.has(e.name))
  .map((e) => e.name);

const compositeOnDisk: string[] = [];
for (const dir of dirs) {
  const libUrl = new URL(`../../${dir}/tsconfig.lib.json`, import.meta.url);
  let lib: { compilerOptions?: { composite?: boolean } };
  try {
    lib = JSON.parse(stripJsonc(await readFile(libUrl, 'utf8'))) as typeof lib;
  } catch {
    continue; // no lib config (e.g. .mjs package) → not a composite graph member
  }
  if (lib.compilerOptions?.composite === true) compositeOnDisk.push(dir);
}

describe('tsconfig.solution.json is the complete whole-graph typecheck entry', () => {
  it('references exactly every composite plugin-graph package (minus @interlace/ui)', () => {
    const expected = compositeOnDisk
      .map((d) => `packages/${d}/tsconfig.lib.json`)
      .sort();
    const actual = [...referenced].sort();
    expect(actual).toEqual(expected);
  });

  it('has no dangling reference (every referenced lib config exists on disk)', async () => {
    for (const rel of referenced) {
      const url = new URL(`../../../${rel}`, import.meta.url);
      await expect(
        readFile(url, 'utf8'),
        `dangling solution reference: ${rel}`,
      ).resolves.toBeTypeOf('string');
    }
  });
});
