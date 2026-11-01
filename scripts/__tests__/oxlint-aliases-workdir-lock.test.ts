/**
 * Lock: `verify-oxlint-aliases.mts`'s scratch directory survives a repo where
 * `node_modules/.cache` has never been created.
 *
 * What was wrong on main (#1327): the script called `fs.mkdtempSync` directly
 * on a path under `node_modules/.cache` without creating that parent first.
 * `mkdtempSync` requires its parent to exist, and `node_modules/.cache` is
 * created on demand by whichever tool happens to touch it first — vitest,
 * turbo, ... — so a fresh `npm ci` with none of those run yet never creates
 * it. Every scheduled oxlint-parity run hit this because its `Runtime smoke +
 * parity` job runs this script before any tool that would have created the
 * directory as a side effect.
 *
 * Sabotage proof: reverting to the bare `fs.mkdtempSync(...)` call throws
 * ENOENT here whenever `node_modules/.cache` does not already exist.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createOxlintAliasesWorkDir } from '../verify-oxlint-aliases.mts';

let root: string;

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true });
});

describe('createOxlintAliasesWorkDir', () => {
  it('creates a work dir when node_modules/.cache does not exist yet', () => {
    root = mkdtempSync(join(tmpdir(), 'oxlint-aliases-workdir-'));
    expect(existsSync(join(root, 'node_modules', '.cache'))).toBe(false);

    const work = createOxlintAliasesWorkDir(root);

    expect(existsSync(work)).toBe(true);
    expect(work.startsWith(join(root, 'node_modules', '.cache'))).toBe(true);
  });

  it('still works when node_modules/.cache already exists', () => {
    root = mkdtempSync(join(tmpdir(), 'oxlint-aliases-workdir-'));
    mkdirSync(join(root, 'node_modules', '.cache'), { recursive: true });

    const work = createOxlintAliasesWorkDir(root);

    expect(existsSync(work)).toBe(true);
  });
});
