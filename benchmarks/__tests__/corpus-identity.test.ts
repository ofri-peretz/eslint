/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Tests for the corpus identity that makes ILB-Corpus-Truth's regression gate
 * mean anything.
 *
 * The gate compares each rule's off-SDK count to a recorded ceiling. That
 * comparison is only signal if both runs measured the same code — and twice in
 * two days they did not: **107,384 files in one run, 119,415 in another**, over
 * the same 107 pinned repositories, because one read local clones at whatever
 * commit they sat on and the other cloned the pins fresh. Every per-rule delta
 * between those two runs was drift wearing a regression's clothes.
 */
import { describe, it, expect } from 'vitest';
import {
  corpusHash,
  driftedRoots,
  headOf,
  manifestDelta,
  type CorpusRoot,
} from '../suites/ilb-corpus-truth/corpus-identity.ts';

const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);

const root = (name: string, head: string | null): CorpusRoot => ({
  name,
  dir: `/corpus/${name}`,
  head,
});

describe('corpusHash', () => {
  it('is stable for the same roots', () => {
    const roots = [root('express', SHA_A), root('nest', SHA_B)];
    expect(corpusHash(roots)).toBe(corpusHash(roots));
  });

  it('ignores enumeration order', () => {
    // Filesystem order is not corpus identity; readdir order must not change
    // the hash of an unchanged corpus.
    const a = [root('express', SHA_A), root('nest', SHA_B)];
    const b = [root('nest', SHA_B), root('express', SHA_A)];
    expect(corpusHash(a)).toBe(corpusHash(b));
  });

  it('changes when any root moves to a different commit', () => {
    const before = [root('express', SHA_A), root('nest', SHA_B)];
    const after = [root('express', SHA_B), root('nest', SHA_B)];
    expect(corpusHash(after)).not.toBe(corpusHash(before));
  });

  it('changes when a repository is added or removed', () => {
    const two = [root('express', SHA_A), root('nest', SHA_B)];
    const one = [root('express', SHA_A)];
    expect(corpusHash(one)).not.toBe(corpusHash(two));
  });

  it('distinguishes a non-git root from a pinned one', () => {
    // The exact case that produced the 12,000-file discrepancy: a staged corpus
    // whose roots carry no commit at all must not hash like a pinned one.
    expect(corpusHash([root('express', null)])).not.toBe(
      corpusHash([root('express', SHA_A)]),
    );
  });

  it('does not confuse a name change for a commit change', () => {
    expect(corpusHash([root('a', SHA_A)])).not.toBe(
      corpusHash([root('b', SHA_A)]),
    );
  });

  it('is a sha256 receipt, not an opaque token', () => {
    expect(corpusHash([root('express', SHA_A)])).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('an empty corpus still hashes rather than throwing', () => {
    expect(corpusHash([])).toMatch(/^sha256:[a-f0-9]{64}$/);
  });
});

describe('driftedRoots', () => {
  const pinned = new Map([
    ['express', SHA_A],
    ['nest', SHA_B],
  ]);

  it('reports a root sitting at the wrong commit', () => {
    const drifted = driftedRoots([root('express', SHA_B)], pinned);
    expect(drifted.map((r) => r.name)).toEqual(['express']);
  });

  it('reports a root that is not a git checkout at all', () => {
    expect(driftedRoots([root('express', null)], pinned)).toHaveLength(1);
  });

  it('is silent when every root matches its pin', () => {
    const roots = [root('express', SHA_A), root('nest', SHA_B)];
    expect(driftedRoots(roots, pinned)).toEqual([]);
  });

  it('ignores roots the manifest does not pin', () => {
    // An extra directory in a staged corpus is not drift against a pin that
    // does not exist.
    expect(driftedRoots([root('stray', SHA_A)], pinned)).toEqual([]);
  });

  it('skips tag and branch pins rather than guessing', () => {
    // `cloneRepo` accepts a tag, and comparing `v15.1.0` to a resolved SHA
    // without resolving it would report drift on every correctly-pinned root.
    const tagPinned = new Map([['next.js', 'v15.1.0']]);
    expect(driftedRoots([root('next.js', SHA_A)], tagPinned)).toEqual([]);
  });

  it('treats a short SHA pin as unverifiable rather than drifted', () => {
    const shortPinned = new Map([['express', SHA_A.slice(0, 7)]]);
    expect(driftedRoots([root('express', SHA_B)], shortPinned)).toEqual([]);
  });
});

describe('headOf', () => {
  it('resolves the commit of a real checkout', () => {
    // This repository is one, so no fixture is needed.
    expect(headOf(process.cwd())).toMatch(/^[0-9a-f]{40}$/);
  });

  it('returns null for a directory that is not a checkout', () => {
    expect(headOf('/')).toBeNull();
  });

  it('returns null for a path that does not exist', () => {
    expect(headOf('/no/such/directory/anywhere')).toBeNull();
  });
});

describe('manifestDelta', () => {
  const manifest = ['express', 'nest', 'lambda'];

  it('names the repositories the corpus is missing', () => {
    // The hole `driftedRoots` cannot see: an absent repository drifts nothing
    // and hashes cleanly, so a baseline from it is a set of ceilings for code
    // that was never measured.
    const { missing, extra } = manifestDelta([root('express', SHA_A)], manifest);
    expect(missing).toEqual(['lambda', 'nest']);
    expect(extra).toEqual([]);
  });

  it('names repositories present but not in the manifest', () => {
    const roots = [...manifest.map((n) => root(n, SHA_A)), root('stray', SHA_A)];
    expect(manifestDelta(roots, manifest).extra).toEqual(['stray']);
  });

  it('is empty when the corpus matches exactly', () => {
    const roots = manifest.map((n) => root(n, SHA_A));
    expect(manifestDelta(roots, manifest)).toEqual({ missing: [], extra: [] });
  });

  it('reports a rename as one missing and one extra, not as drift', () => {
    // A renamed directory looks like a healthy root to every commit-based
    // check; only the name comparison catches it.
    const roots = [root('express', SHA_A), root('nest', SHA_A), root('lambda-fn', SHA_A)];
    const { missing, extra } = manifestDelta(roots, manifest);
    expect(missing).toEqual(['lambda']);
    expect(extra).toEqual(['lambda-fn']);
  });

  it('sorts both lists so the message is stable run to run', () => {
    const { missing } = manifestDelta([], ['zeta', 'alpha', 'mid']);
    expect(missing).toEqual(['alpha', 'mid', 'zeta']);
  });

  it('an empty manifest reports every root as unexpected', () => {
    expect(manifestDelta([root('express', SHA_A)], []).extra).toEqual(['express']);
  });
});
