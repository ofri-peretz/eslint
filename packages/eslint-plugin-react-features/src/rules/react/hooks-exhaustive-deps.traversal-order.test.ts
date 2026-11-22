/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * What the rule reports must not depend on which file ESLint happened to lint first.
 *
 * The rule walks callback bodies through a table of "which keys of this node type hold
 * children", and it used to build that table from the FIRST node of each type it met: a
 * key was recorded only when that one node had an object under it. The first `if` in the
 * run had no `else`, so `alternate` (null) was left out, and from then on every `else`
 * branch in every later file was invisible to the rule. A dependency used only inside an
 * `else` went unreported, and the count on a real repository changed with the order the
 * files were linted in: Shopify/cli read 12, 14 and 12 findings on the same commit
 * (corpus-findings-budget.json calls the rule's number "non-deterministic", and recorded
 * three draws, two values, in September).
 *
 * The test is order-sensitive by construction, so it keeps its own module instance: the
 * first program contains an `if` without an `else`, the second needs the `else` walked.
 */

import { describe, it, expect } from 'vitest';
import { Linter } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import { hooksExhaustiveDeps } from './hooks-exhaustive-deps';

const lint = (code: string): string[] =>
  new Linter({ configType: 'flat' })
    .verify(
      code,
      [
        {
          files: ['**/*.tsx'],
          languageOptions: {
            parser: tsParser as never,
            ecmaVersion: 2022,
            sourceType: 'module',
            parserOptions: { ecmaFeatures: { jsx: true } },
          },
          plugins: {
            r: {
              rules: { 'hooks-exhaustive-deps': hooksExhaustiveDeps as never },
            },
          },
          rules: { 'r/hooks-exhaustive-deps': 'error' },
        },
      ],
      'a.tsx',
    )
    .map((m) => m.message);

const NO_ELSE = `
import { useEffect } from 'react';
export function A({ a }) {
  useEffect(() => {
    if (a) { run(); }
  }, [a]);
}`;

const ELSE_USES_PROP = `
import { useEffect } from 'react';
export function B({ a, b }) {
  useEffect(() => {
    if (a) { run(); } else { run(b); }
  }, [a]);
}`;

describe('hooks-exhaustive-deps: the report does not depend on lint order', () => {
  it('walks an else branch even when the first if it ever saw had none', () => {
    // Prime the rule with the shape that used to poison the key table.
    expect(lint(NO_ELSE)).toEqual([]);
    const messages = lint(ELSE_USES_PROP);
    expect(messages.some((m) => /dependencies?: b\b/.test(m))).toBe(true);
  });

  it('reports the same thing when the else-branch program runs first', () => {
    const first = lint(ELSE_USES_PROP);
    lint(NO_ELSE);
    expect(lint(ELSE_USES_PROP)).toEqual(first);
  });
});
