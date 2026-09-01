/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A number nobody can vouch for must not be quotable.
 *
 * "Scanned and never fired" is the strongest negative claim this repo makes
 * about a rule. It went wrong once in the loudest possible way: the config that
 * produced the committed inventory had no TypeScript parser and never linted a
 * `.tsx` file, so `react-a11y` read as "37 rules that never fire on real code"
 * when the truth was "37 rules nobody ran". Nothing about the file looked
 * stale — it carried the right date and the wrong instrument.
 *
 * `rule-case-ledger.ts` learned to check the config hash. The other two readers
 * did not, so the same numbers still reached a freshness receipt and the case
 * harvester unchallenged. One consumer checking is not a control; it is a habit
 * one file happens to have. This pins the shared reader instead.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import {
  readRealSourceInventory,
  CONFIG_RELATIVE,
  REPOS_RELATIVE,
  INVENTORY_RELATIVE,
} from '../lib/real-source-inventory.ts';

/** A throwaway repo root with the three files the reader looks at. */
function fixture(opts: {
  config: string;
  repos: string;
  stampConfig?: string | null;
  stampRepos?: string | null;
}): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'inv-'));
  fs.mkdirSync(path.join(root, 'benchmarks', 'budgets'), { recursive: true });
  fs.writeFileSync(path.join(root, CONFIG_RELATIVE), opts.config);
  fs.writeFileSync(path.join(root, REPOS_RELATIVE), opts.repos);
  const inventory: Record<string, unknown> = {
    rules: {},
    withoutMaterial: [],
    filesLinted: 1,
    reposScanned: 1,
  };
  if (opts.stampConfig !== null) inventory.configHash = opts.stampConfig;
  if (opts.stampRepos !== null) inventory.reposHash = opts.stampRepos;
  fs.writeFileSync(
    path.join(root, INVENTORY_RELATIVE),
    JSON.stringify(inventory, null, 2),
  );
  return root;
}

const hash = (s: string) =>
  createHash('sha256').update(s).digest('hex').slice(0, 16);

describe('the real-source inventory is only quotable when vouched for', () => {
  it('accepts an inventory stamped with the inputs on disk', () => {
    const config = 'export default [];\n';
    const repos = '["a/b"]\n';
    const root = fixture({
      config,
      repos,
      stampConfig: hash(config),
      stampRepos: hash(repos),
    });
    const read = readRealSourceInventory(root);
    expect(read.isCurrent, read.reason).toBe(true);
    expect(read.reason).toBe('');
  });

  it('refuses an inventory with no configHash — the pre-stamp file', () => {
    // This is the committed artifact's exact state, and the reason the number
    // may not be quoted today.
    const config = 'export default [];\n';
    const repos = '["a/b"]\n';
    const root = fixture({
      config,
      repos,
      stampConfig: null,
      stampRepos: null,
    });
    const read = readRealSourceInventory(root);
    expect(read.isCurrent).toBe(false);
    expect(read.reason).toMatch(/predates the stamp/);
  });

  it('refuses when the ESLint config has changed since the scan', () => {
    const repos = '["a/b"]\n';
    const root = fixture({
      config: 'export default [{ rules: {} }];\n',
      repos,
      stampConfig: hash('export default [];\n'),
      stampRepos: hash(repos),
    });
    const read = readRealSourceInventory(root);
    expect(read.isCurrent).toBe(false);
    expect(read.reason).toMatch(/config has changed/);
  });

  it('refuses when the REPOSITORY LIST has changed since the scan', () => {
    // The half that did not exist before 2026-08-31. A scan over a different
    // corpus is a different measurement and would otherwise look comparable —
    // which matters because `the-corpus-has-the-material` exists to change
    // exactly this file.
    const config = 'export default [];\n';
    const root = fixture({
      config,
      repos: '["a/b","c/d"]\n',
      stampConfig: hash(config),
      stampRepos: hash('["a/b"]\n'),
    });
    const read = readRealSourceInventory(root);
    expect(read.isCurrent).toBe(false);
    expect(read.reason).toMatch(/repository list has changed/);
  });

  it('never throws on a missing artifact — a gate must say "unknown", not crash', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'inv-empty-'));
    const read = readRealSourceInventory(root);
    expect(read.inventory).toBeNull();
    expect(read.isCurrent).toBe(false);
  });
});
