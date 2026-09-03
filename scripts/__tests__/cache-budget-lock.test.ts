/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The Actions cache is a 10 GB budget shared by every cache in the repo, and
 * on 2026-09-02 it was 9.73 GB across 685 entries — 97% full, evicting LRU on
 * every write.
 *
 * That number is what makes these assertions load-bearing. Under eviction a
 * cache is not free storage; it is a bidder against every other cache. A step
 * that stores 2.36 GB for a path taken only when the lockfile changes was
 * outbidding node_modules and Next.js on the path taken every run. Nothing in
 * CI reports that: every job stayed green while its own hit rate fell.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { load } from 'js-yaml';

const ROOT = resolve(__dirname, '..', '..');
const SETUP = readFileSync(
  join(ROOT, '.github/actions/setup/action.yml'),
  'utf8',
);
const TURBO_WORKFLOWS = ['quality.yml', 'quality-full.yml', 'a11y.yml'];

describe('every composite action is parseable YAML', () => {
  // `lint-workflows.ts` covers `.github/workflows/`, not `.github/actions/`,
  // and every other check in this file matches strings against the file text —
  // which a file that YAML cannot parse satisfies just as well as one it can.
  //
  // On 2026-09-02 an unquoted `: ` inside a `run:` ("Remote cache: Vercel")
  // made the whole setup action unparseable. Every job that uses it failed at
  // once — oxlint, Gate, Validate documentation — while this file's own
  // assertions stayed green, because grep does not care about YAML.
  const dir = resolve(ROOT, '.github/actions');
  const actions = readdirSync(dir)
    .map((d) => join(dir, d, 'action.yml'))
    .filter((f) => existsSync(f));

  it('finds composite actions to check', () => {
    expect(actions.length).toBeGreaterThan(0);
  });

  it.each(actions)('%s parses', (file) => {
    expect(() => load(readFileSync(file, 'utf8'))).not.toThrow();
  });
});

describe('the Actions cache budget', () => {
  it('does not cache the npm registry directory', () => {
    // Removed 2026-09-02: 2.36 GB, restored only after the node_modules cache
    // had already missed. `npm ci` still runs there, fetching from the
    // registry. Re-adding it takes ~24% of the repo's entire allowance.
    expect(SETUP).not.toMatch(/key:\s*npm-\$\{\{\s*runner\.os/);
    expect(SETUP).not.toContain('Restore npm registry cache');
  });
});

describe('exactly one Turborepo remote-cache backend can be active', () => {
  // Both at once would leave the shim's TURBO_API pointing at a localhost
  // server while the credentials in the environment name Vercel. The failure
  // is silent: turbo writes to one and reads from neither.
  const guarded = (needle: string) => {
    const at = SETUP.indexOf(needle);
    expect(at, `step not found: ${needle}`).toBeGreaterThan(-1);
    // The `if:` sits on the line after the step's `- name:`.
    return SETUP.slice(at, at + 400);
  };

  it('the Actions backend runs only when no token is present', () => {
    expect(guarded('Turborepo remote cache (GitHub Actions backend')).toMatch(
      /if:.*env\.TURBO_TOKEN\s*==\s*''/,
    );
  });

  it('the Vercel backend runs only when a token is present', () => {
    expect(guarded('Turborepo remote cache (Vercel')).toMatch(
      /if:.*env\.TURBO_TOKEN\s*!=\s*''/,
    );
  });
});

describe('the credentials reach the jobs that would use them', () => {
  it.each(TURBO_WORKFLOWS)(
    '%s passes TURBO_TOKEN and TURBO_TEAM through to the setup action',
    (file) => {
      // Without this the `env.TURBO_TOKEN` guards above are always false and
      // the Vercel path is unreachable — configured, inert, and green.
      const src = readFileSync(join(ROOT, '.github/workflows', file), 'utf8');
      expect(src).toContain('TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}');
      expect(src).toContain('TURBO_TEAM: ${{ vars.TURBO_TEAM }}');
    },
  );

  it('names every workflow that enables the remote cache', () => {
    // Guards the list above: a new workflow opting into turbo-remote-cache
    // without the env block would get the fallback silently and forever.
    const dir = join(ROOT, '.github/workflows');
    const opted = readdirSync(dir)
      .filter((f) => f.endsWith('.yml'))
      .filter((f) =>
        /turbo-remote-cache:\s*['"]true['"]/.test(
          readFileSync(join(dir, f), 'utf8'),
        ),
      );
    expect(opted.sort()).toEqual([...TURBO_WORKFLOWS].sort());
  });
});
