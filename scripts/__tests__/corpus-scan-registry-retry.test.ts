/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Lock: the rig install retries registry propagation, and nothing else.
 *
 * `Scan pinned corpus` installs the plugin versions a release just published.
 * For the minute or two before the registry serves them everywhere, that
 * install 404s — so one green release turns every open PR red at once. Seen
 * five times in a single evening, each time resolving by hand minutes later.
 *
 * The danger in the fix is wider than the bug. A blanket retry would also
 * paper over a dependency conflict, a bad lockfile or a disk-full — and a
 * required check that retries its way to green is worse than one that fails,
 * because "just re-run it" becomes the reflex and the day it means something
 * nobody reads it.
 *
 * So this asserts BOTH halves: propagation lag is recognised, and everything
 * else is not.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SOURCE = readFileSync(
  resolve(__dirname, '..', 'corpus-scan.ts'),
  'utf-8',
);

/** Rebuilt from source so the test cannot drift from the shipped predicate. */
function looksLikePropagationLag(output: string): boolean {
  const body =
    /function looksLikePropagationLag\([^)]*\)[^{]*\{([\s\S]*?)\n\}/.exec(
      SOURCE,
    );
  if (!body)
    throw new Error('looksLikePropagationLag not found in corpus-scan.ts');
  // eslint-disable-next-line no-new-func -- reading the real predicate, not a copy
  return new Function('output', body[1])(output) as boolean;
}

describe('registry propagation retry', () => {
  it('only the rig install is retried', () => {
    // Retrying every `sh` would retry git clones and eslint runs too.
    expect(SOURCE).toContain('shWithRegistryRetry(');
    expect((SOURCE.match(/shWithRegistryRetry\(\s*'npm'/g) ?? []).length).toBe(
      1,
    );
  });

  it('gives up rather than retrying forever', () => {
    expect(SOURCE).toMatch(/REGISTRY_PROPAGATION_RETRIES\s*=\s*[1-9]/);
    expect(SOURCE).toMatch(/attempt >= REGISTRY_PROPAGATION_RETRIES/);
  });

  it.each([
    [
      'E404 npm ERR! 404 Not Found - GET https://registry.npmjs.org/eslint-plugin-x',
    ],
    ['npm ERR! notarget No matching version found for eslint-plugin-x@2.0.7'],
    ['npm ERR! code ETARGET'],
    ['eslint-plugin-x is not in this registry'],
  ])('retries transient resolution failure: %s', (output) => {
    expect(looksLikePropagationLag(output)).toBe(true);
  });

  it.each([
    ['npm ERR! ERESOLVE unable to resolve dependency tree'],
    ['npm ERR! code ENOSPC', 'disk full'],
    ['npm ERR! Cannot read properties of undefined', 'a broken lockfile'],
    ['npm ERR! EACCES: permission denied'],
    ['3 rule(s) over budget', 'a real corpus regression'],
  ])('does NOT retry %s', (output) => {
    expect(looksLikePropagationLag(output)).toBe(false);
  });
});
