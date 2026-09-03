/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Unit lock for the detection-list coverage gate.
 *
 * The apostrophe case below is the one that matters. Without comment
 * stripping, this gate skipped `DEFAULT_SECURITY_USE_NAMES` — the 41-entry
 * table whose gaps are the reason the gate exists — and reported a clean run.
 * A checker that silently drops its own motivating case is worse than no
 * checker, because it converts "unmeasured" into "measured and fine".
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  extractLists,
  isDetectionToken,
  stripComments,
  testTextFor,
  uncoveredEntries,
} from '../lint-detection-list-coverage';

const FILE = 'rule.ts';

describe('isDetectionToken', () => {
  it('accepts bare tokens', () => {
    for (const t of ['passphrase', 'readInt16LE', 'tar-fs', '@mui/material', 'sign-in'])
      expect(isDetectionToken(t)).toBe(true);
  });

  it('rejects prose, which shares the array syntax with detection entries', () => {
    // The first reading of this gate counted these as uncovered "entries".
    for (const t of ['Moment.js is in maintenance mode.', '10-15 minutes', 'Use named imports'])
      expect(isDetectionToken(t)).toBe(false);
  });

  it('rejects URLs, via the character class rather than a prefix test', () => {
    // ':' is not in the class, so URLs are excluded without a `startsWith`
    // check — which is what matters, because such a check also excluded
    // `http-server`, `http2` and `http`, all real entries in
    // `DEFAULT_HTTP_MODULES`. They were dropped from both the coverage check
    // and the debt ledger, so they read as covered.
    expect(isDetectionToken('https://example.com/a')).toBe(false);
  });

  it('keeps http-prefixed tokens, which are real detection entries', () => {
    for (const t of ['http', 'http2', 'http-server']) expect(isDetectionToken(t)).toBe(true);
  });
});

describe('stripComments', () => {
  it('removes a whole-line comment', () => {
    expect(stripComments("  // note\n'a',")).not.toContain('note');
  });

  it('strips an INLINE comment after an entry', () => {
    // Whole-line stripping missed this: TypeScript allows a comment after an
    // entry, and an apostrophe in one corrupts quote pairing exactly as the
    // between-entries case did.
    // The comment must sit INSIDE the brackets. A trailing one after the
    // closing `]` is outside the captured region entirely, so a test using
    // that shape passes with or without inline stripping — it would be a test
    // that is green on the broken code.
    const src = [
      'const NAMES = [',
      "  'alpha', // it's the first one",
      "  'beta', 'gamma', 'delta', 'epsilon',",
      '];',
    ].join('\n');
    const [list] = extractLists(src, FILE);
    expect(list).toBeDefined();
    expect(list.entries).toEqual(['alpha', 'beta', 'gamma', 'delta', 'epsilon']);
  });

  it('leaves a // that lives inside a string, so a docs.url survives', () => {
    // suggestions-meta-lock documents this regression: truncating at any `//`
    // eats the one in `https://`.
    expect(stripComments("url: 'https://example.com/docs',")).toContain('https://example.com/docs');
  });

  it('does not let a comment-opener inside a line comment start a block', () => {
    const glob = ['src/', '*', '*'].join('');
    const out = stripComments(`  // paths under ${glob}\nconst A = ['x'];`);
    expect(out).toContain("const A = ['x']");
  });
});

describe('extractLists', () => {
  it('finds a detection table', () => {
    const src = "const NAMES = ['alpha', 'beta', 'gamma', 'delta', 'epsilon'];";
    expect(extractLists(src, FILE)).toEqual([
      { file: FILE, name: 'NAMES', entries: ['alpha', 'beta', 'gamma', 'delta', 'epsilon'] },
    ]);
  });

  it('still finds the table when a comment between entries contains an apostrophe', () => {
    // THE REGRESSION. `makeNameTest`'s apostrophe paired with the next entry's
    // opening quote, captured four lines of prose as a string literal, and
    // dropped the token ratio below the threshold — so the table vanished.
    const src = [
      'const NAMES = [',
      "  'alpha', 'beta', 'gamma',",
      "  // chosen against `makeNameTest`'s mechanics rather than by feel: an",
      '  // entry under 6 characters matches whole words only, which is why the',
      '  // compound spellings are listed whole.',
      "  'delta', 'epsilon',",
      '];',
    ].join('\n');
    const [list] = extractLists(src, FILE);
    expect(list).toBeDefined();
    expect(list.entries).toEqual(['alpha', 'beta', 'gamma', 'delta', 'epsilon']);
  });

  it('ignores a table that is mostly prose', () => {
    const src =
      "const MSGS = ['Use named imports for tree-shaking', 'Moment.js is in maintenance mode', 'a', 'b', 'c', 'd'];";
    expect(extractLists(src, FILE)).toEqual([]);
  });

  it('ignores a handful of special cases', () => {
    expect(extractLists("const A = ['x', 'y'];", FILE)).toEqual([]);
  });
});

describe('uncoveredEntries', () => {
  const list = { file: FILE, name: 'N', entries: ['totp', 'recoverycode', 'mnemonic'] };

  it('reports entries no test mentions', () => {
    expect(uncoveredEntries(list, "const a = 'mnemonic';")).toEqual(['totp', 'recoverycode']);
  });

  it('counts an entry embedded in a longer identifier, which is how tests spell them', () => {
    expect(uncoveredEntries(list, 'userTotp recoveryCode mnemonic')).toEqual([]);
  });

  it('is case-insensitive, since tests use camelCase for snake-cased entries', () => {
    expect(uncoveredEntries({ ...list, entries: ['recoverycode'] }, 'const recoveryCode = 1;')).toEqual(
      [],
    );
  });
});

describe('testTextFor', () => {
  /**
   * The contamination this closes: for a FLAT rule file, reading every test
   * under `dirname` meant scanning all of `src/rules`, so a token in another
   * rule's test marked this rule's entry covered — failing in the flattering
   * direction, which is the one direction this gate must never fail in.
   */
  it('does not read a sibling rule\'s tests for a flat rule file', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dlc-'));
    fs.writeFileSync(path.join(dir, 'mine.ts'), '');
    fs.writeFileSync(path.join(dir, 'mine.test.ts'), 'MINE_TOKEN');
    fs.writeFileSync(path.join(dir, 'other.test.ts'), 'OTHER_TOKEN');

    const text = testTextFor(path.join(dir, 'mine.ts'));
    expect(text).toContain('MINE_TOKEN');
    expect(text).not.toContain('OTHER_TOKEN');
  });

  it('reads the whole directory for a rule that owns one', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dlc-'));
    fs.mkdirSync(path.join(dir, 'nested'));
    fs.writeFileSync(path.join(dir, 'index.ts'), '');
    fs.writeFileSync(path.join(dir, 'a.test.ts'), 'A_TOKEN');
    fs.writeFileSync(path.join(dir, 'nested', 'b.test.ts'), 'B_TOKEN');

    const text = testTextFor(path.join(dir, 'index.ts'));
    expect(text).toContain('A_TOKEN');
    expect(text).toContain('B_TOKEN');
  });

  it('picks up the flat rule\'s own extra suites', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dlc-'));
    fs.writeFileSync(path.join(dir, 'mine.ts'), '');
    fs.writeFileSync(path.join(dir, 'mine.coverage.test.ts'), 'COVERAGE_TOKEN');

    expect(testTextFor(path.join(dir, 'mine.ts'))).toContain('COVERAGE_TOKEN');
  });

  it('reads a central `src/tests/**` suite by the rule\'s own basename', () => {
    // Ten packages keep every suite under `src/tests/**` — before this
    // lookup, their rules read as having no tests at all, and a genuinely
    // locked entry (conventions' `copy`) failed the gate as uncovered.
    // Ownership is still by basename: the sibling's test in the same shared
    // tree must NOT flatter this rule's coverage.
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dlc-'));
    const rules = path.join(root, 'src', 'rules', 'conventions');
    const tests = path.join(root, 'src', 'tests', 'conventions');
    fs.mkdirSync(rules, { recursive: true });
    fs.mkdirSync(tests, { recursive: true });
    fs.writeFileSync(path.join(rules, 'mine.ts'), '');
    fs.writeFileSync(path.join(tests, 'mine.test.ts'), 'CENTRAL_TOKEN');
    fs.writeFileSync(path.join(tests, 'other.test.ts'), 'OTHER_TOKEN');

    const text = testTextFor(path.join(rules, 'mine.ts'));
    expect(text).toContain('CENTRAL_TOKEN');
    expect(text).not.toContain('OTHER_TOKEN');
  });
});
