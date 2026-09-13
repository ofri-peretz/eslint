/**
 * A parity envelope's filename must identify the corpus it measured.
 *
 * Two collisions, one behind the other. Keyed on the date alone, running both
 * corpora — which is what verifying parity means — had the second envelope
 * overwrite the first. Keyed on the date plus `path.basename`, two different
 * corpora sharing a basename collide in exactly the same way, which is the
 * first bug wearing a smaller hat.
 *
 * The third case is the one a hash of the absolute path would have broken: the
 * same corpus must name the same file wherever the repository is checked out,
 * or CI and a laptop write two envelopes for one measurement and neither can be
 * compared with the other.
 */
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { corpusSlug } from '../lib/corpus-slug';

const ROOT = path.sep === '\\' ? 'C:\\repo' : '/repo';
const at = (...p: string[]) => path.join(ROOT, ...p);

describe('corpusSlug', () => {
  it('distinguishes two corpora that share a basename', () => {
    // The defect this replaces: `path.basename` reduced both to "cwe-089".
    const a = corpusSlug(at('benchmarks', 'corpus', 'CWE-089'), ROOT);
    const b = corpusSlug(at('other', 'corpus', 'CWE-089'), ROOT);
    expect(a).not.toBe(b);
  });

  it('names the same corpus identically from a different checkout', () => {
    // Why the slug is not a digest of the resolved path: that is absolute, so
    // it would differ per machine and split one measurement across two files.
    const here = corpusSlug(at('benchmarks', 'corpus'), ROOT);
    const other = path.sep === '\\' ? 'D:\\elsewhere' : '/elsewhere';
    const there = corpusSlug(path.join(other, 'benchmarks', 'corpus'), other);
    expect(here).toBe(there);
  });

  it('separates the two corpora this suite actually runs', () => {
    const curated = corpusSlug(at('benchmarks', 'corpus'), ROOT);
    const harvested = corpusSlug(
      at('benchmarks', 'suites', 'ilb-oxlint-parity', 'harvested-fixtures'),
      ROOT,
    );
    expect(curated).not.toBe(harvested);
    expect(curated).toBe('benchmarks-corpus');
  });

  it('is filesystem-safe and lowercase', () => {
    expect(corpusSlug(at('Bench Marks', 'CWE 089 (v2)'), ROOT)).toMatch(
      /^[a-z0-9._-]+$/,
    );
  });

  it('keeps a deep path unique after truncation', () => {
    // Truncating alone would re-collide two long paths sharing a prefix, so the
    // digest is of the whole relative path and survives the cut.
    const deep = (leaf: string) =>
      corpusSlug(
        at(
          'benchmarks',
          'suites',
          'ilb-oxlint-parity',
          'very',
          'deeply',
          'nested',
          'corpora',
          'tree',
          leaf,
        ),
        ROOT,
      );
    const a = deep('alpha');
    const b = deep('beta');
    expect(a).not.toBe(b);
    expect(a.length).toBeLessThanOrEqual(80);
  });

  it('still identifies a corpus outside the repository', () => {
    // No relative identity worth reading, so basename plus a digest. Machine-
    // specific, which is correct: so is the corpus.
    const outside =
      path.sep === '\\' ? 'C:\\tmp\\scratch\\CWE-089' : '/tmp/scratch/CWE-089';
    const s = corpusSlug(outside, ROOT);
    expect(s).toMatch(/^cwe-089-[0-9a-f]{8}$/);
    expect(s).not.toBe(corpusSlug(at('benchmarks', 'corpus', 'CWE-089'), ROOT));
  });
});
