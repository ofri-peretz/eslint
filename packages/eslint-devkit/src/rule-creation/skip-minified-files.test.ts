/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The third scope predicate, after test files and generated files.
 *
 * Decided from the file's own shape — no path matching. `dist/`, `.min.js` and
 * `vendor/` are conventions a stranger's repository is free to ignore, and the
 * single largest offender on the pinned corpus is called
 * `assets/speedscope/import.bcbb2033.js`, which announces nothing in its name
 * and carried 1,973 `no-magic-numbers` findings by itself.
 *
 * AVERAGE line length, not maximum, and that distinction is the whole test.
 * Thirteen corpus files had a line over 1,000 characters and only eight were
 * minified; the others were ordinary source with one long line — SVG icon
 * components whose `d` attribute is a single 1,600-character path. Skipping
 * those would have been silent recall loss in application code.
 *
 *   minified bundles       712 – 203,807 characters per line
 *   hand-written source     32 – 58
 */
import { describe, it, expect } from 'vitest';
import { Linter } from 'eslint';
import { createRule } from './rule-creator';
import { isMinifiedFile } from './minified-file';

/**
 * A line of roughly `n` characters of real-looking code.
 *
 * The identifier is indexed. A first draft repeated `const x` and `const y`,
 * which is a redeclaration error — the file never parsed, every rule reported
 * nothing, and two of these tests "passed" for a reason that had nothing to do
 * with the gate. The CONTROL case is what caught it.
 */
const wide = (n: number, i: number) =>
  `const w${i} = ${'"' + 'a'.repeat(Math.max(n - 16, 1)) + '"'};`;

function run(code: string, skipMinifiedFiles: boolean): number {
  const probe = createRule<[], 'hit'>({
    name: 'probe',
    meta: {
      type: 'problem',
      docs: { description: 'probe' },
      schema: [],
      messages: { hit: 'hit' },
    },
    skipMinifiedFiles,
    defaultOptions: [],
    create: (context) => ({
      VariableDeclarator: (node) => context.report({ node, messageId: 'hit' }),
    }),
  });
  return new Linter({ configType: 'flat' })
    .verify(
      code,
      [
        {
          files: ['**/*.{js,mjs,cjs,jsx,ts,tsx,mts,cts}'],
          plugins: { p: { rules: { probe } } },
          rules: { 'p/probe': 'error' },
        },
      ] as never,
      'src/anything.js',
    )
    .filter((m) => m.ruleId).length;
}

describe('createRule skipMinifiedFiles gate', () => {
  const minified = [wide(5000, 1), wide(5000, 2)].join('\n');
  const iconLike = [
    ...Array.from({ length: 40 }, (_, i) => `const y${i} = 1;`),
    wide(1600, 99),
  ].join('\n');

  it('suppresses in a machine-packed file', () => {
    expect(run(minified, true)).toBe(0);
  });

  it('does NOT suppress a file with one long line among normal ones', () => {
    // The SVG-icon shape. Its maximum line is 1,600 characters and its average
    // is under 60 — the case that made `max` the wrong statistic.
    expect(run(iconLike, true)).toBeGreaterThan(0);
  });

  it('still reports in ordinary source when opted in', () => {
    expect(run('const a = 1;', true)).toBe(1);
  });

  it('CONTROL: reports in a minified file when NOT opted in', () => {
    // If this returns 0 the flag has become a no-op and the assertions above
    // would pass on a rule that never had the gate.
    expect(run(minified, false)).toBe(2);
  });
});

describe('isMinifiedFile', () => {
  it('is a property of the bytes, not the path', () => {
    // Both of these are named like source and neither name is consulted.
    const linter = new Linter({ configType: 'flat' });
    const seen: boolean[] = [];
    for (const code of [wide(5000, 1), 'const a = 1;']) {
      linter.verify(
        code,
        [
          {
            files: ['**/*.js'],
            plugins: {
              p: {
                rules: {
                  check: {
                    create(context: { sourceCode: never }) {
                      seen.push(isMinifiedFile(context.sourceCode));
                      return {};
                    },
                  },
                },
              },
            },
            rules: { 'p/check': 'error' },
          },
        ] as never,
        'src/index.js',
      );
    }
    expect(seen).toEqual([true, false]);
  });
});
