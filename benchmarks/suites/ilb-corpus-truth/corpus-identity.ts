/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';

export type CorpusRoot = {
  /** Directory name, which is the repo name in the manifest. */
  readonly name: string;
  readonly dir: string;
  /** Resolved HEAD, or null when the directory is not a git checkout. */
  readonly head: string | null;
};

/** A full 40-character SHA — the only pin shape that can be compared directly. */
const SHA = /^[0-9a-f]{40}$/;

/**
 * The commit a corpus root is actually sitting at, or null if it is not a git
 * checkout.
 */
export function headOf(dir: string): string | null {
  try {
    return execFileSync('git', ['-C', dir, 'rev-parse', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

/**
 * A fingerprint of what was actually measured — `name@head` for every root,
 * sorted, hashed.
 *
 * The bench compares each rule's off-SDK count against a recorded baseline, and
 * that comparison only means anything if both runs saw the same code. They did
 * not: one run over the 107 pinned repositories scanned **107,384** files and
 * another **119,415**, because one read local clones sitting at whatever commit
 * they happened to be on and the other cloned the pinned commits fresh. A
 * baseline recorded on one is noise against the other — the gate fires on
 * corpus drift and stays quiet through a real regression.
 *
 * Sorted before hashing so filesystem enumeration order cannot change the
 * identity of an unchanged corpus.
 */
export function corpusHash(roots: readonly CorpusRoot[]): string {
  const identity = [...roots]
    .map((r) => `${r.name}@${r.head ?? 'unpinned'}`)
    .sort()
    .join('\n');
  return `sha256:${crypto.createHash('sha256').update(identity).digest('hex')}`;
}

/**
 * Roots that are not at the commit the manifest pins.
 *
 * `cloneRepo` already falls back to a cached HEAD when it cannot fetch the pin
 * and prints a warning — but a warning nobody reads is exactly how a
 * 12,000-file discrepancy survived two runs and a committed baseline. This
 * returns it as data so the run can act on it.
 *
 * Tag and branch pins are skipped rather than guessed at: comparing `v15.1.0`
 * to a SHA without resolving it would report drift on every correctly-pinned
 * root. The manifest is generated with SHAs, so this covers it.
 */
export function driftedRoots(
  roots: readonly CorpusRoot[],
  pinned: ReadonlyMap<string, string>,
): readonly CorpusRoot[] {
  return roots.filter((root) => {
    const want = pinned.get(root.name);
    if (want === undefined || !SHA.test(want)) return false;
    return root.head !== want;
  });
}

/**
 * How the corpus on disk differs from the manifest, by name.
 *
 * `driftedRoots` only inspects the roots it is handed, so it cannot see a
 * repository that is *absent*: a corpus missing twenty repositories drifts
 * nothing and hashes cleanly, and a baseline recorded from it would be a set of
 * ceilings for code that was never measured. The file-count tripwire catches
 * that only once a baseline already exists — recording one has to be guarded
 * separately.
 */
export function manifestDelta(
  roots: readonly CorpusRoot[],
  manifestNames: readonly string[],
): { readonly missing: readonly string[]; readonly extra: readonly string[] } {
  const onDisk = new Set(roots.map((r) => r.name));
  const expected = new Set(manifestNames);
  return {
    missing: manifestNames.filter((n) => !onDisk.has(n)).sort(),
    extra: [...onDisk].filter((n) => !expected.has(n)).sort(),
  };
}
