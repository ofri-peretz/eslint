/**
 * Lock for the affected-package decision.
 *
 * This is the logic that decides whether a PR runs 1 package or 33, so a bug
 * here either wastes the whole optimisation or — far worse — skips tests while
 * reporting green. That second failure is exactly what `--filter=...[origin/main]`
 * did before #356: it selected nothing, turbo exited 0, and the check passed
 * having run no tests. The `bug` outcome exists so that state is loud, and this
 * file exists so `bug` can't be quietly softened into a pass later.
 */
import { describe, expect, it } from 'vitest';
import { decideAffected, GLOBAL_INPUTS, type AffectedPkg } from '../lib/ci-shard-affected.mts';

const PKGS: AffectedPkg[] = [
  { name: 'eslint-plugin-jwt', dir: 'packages/eslint-plugin-jwt' },
  { name: 'eslint-plugin-pg', dir: 'packages/eslint-plugin-pg' },
  { name: 'docs', dir: 'apps/docs' },
];

describe('decideAffected', () => {
  it('runs everything when there is no merge-base', () => {
    // Shallow clone / fork / detached main: we cannot reason about the diff, so
    // the safe direction is more testing, not less.
    expect(decideAffected(null, PKGS).mode).toBe('all');
  });

  it.each([...GLOBAL_INPUTS])('runs everything when %s changes', (file) => {
    expect(decideAffected([file], PKGS).mode).toBe('all');
  });

  it('treats its own sources as global inputs', () => {
    // A change to the sharder must be validated against the full suite, not
    // against the subset the new logic happens to pick.
    expect(GLOBAL_INPUTS.has('scripts/ci-test-shard.mts')).toBe(true);
    expect(GLOBAL_INPUTS.has('scripts/lib/ci-shard-affected.mts')).toBe(true);
    // ci-build.mts too: a change to the build filter must be validated by a
    // full build, not by the filter it is changing.
    expect(GLOBAL_INPUTS.has('scripts/ci-build.mts')).toBe(true);
  });

  it('selects only the packages whose directories changed', () => {
    const d = decideAffected(['packages/eslint-plugin-jwt/src/index.ts'], PKGS);
    expect(d.mode).toBe('some');
    expect(d.mode === 'some' && [...d.names]).toEqual(['eslint-plugin-jwt']);
  });

  it('selects multiple packages when several change', () => {
    const d = decideAffected(
      ['packages/eslint-plugin-jwt/src/a.ts', 'apps/docs/src/b.tsx'],
      PKGS,
    );
    expect(d.mode === 'some' && [...d.names].sort()).toEqual(['docs', 'eslint-plugin-jwt']);
  });

  it('reports "none" — not a silent pass — when no package changed', () => {
    const d = decideAffected(['.github/workflows/a11y.yml', 'README.md'], PKGS);
    expect(d.mode).toBe('none');
  });

  it('reports "bug" when package files changed but nothing resolved', () => {
    // The invariant the old filter lacked. An unknown package directory must
    // fail loudly rather than silently testing nothing.
    const d = decideAffected(['packages/brand-new-plugin/src/index.ts'], PKGS);
    expect(d.mode).toBe('bug');
    expect(d.mode === 'bug' && d.dirs).toEqual(['packages/brand-new-plugin']);
  });

  it('never returns "none" when any package path changed', () => {
    // Property check across every known package plus an unknown one: whatever
    // the outcome, it must not be the "nothing to do, pass" branch.
    for (const p of [...PKGS.map((p) => p.dir), 'packages/unknown', 'tools/whatever']) {
      expect(decideAffected([`${p}/src/x.ts`], PKGS).mode).not.toBe('none');
    }
  });
});
