/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Lock: a rule doc's header claims `--fix` or editor suggestions only when
 * the rule's `meta` provides them.
 *
 * Every doc in this package once carried the same template line, "💡 This
 * rule is automatically fixable by the `--fix` CLI option." — including 41
 * rules with no fixer at all. `no-commonjs` was one: it offers suggestions
 * only, so a consumer running `--fix` got nothing.
 *
 * Sabotage proof: put the `--fix` line back on a doc whose rule has no
 * `meta.fixable`, or drop it from one that has, and this test fails.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { rules } from '../index';

const DOCS = resolve(__dirname, '../../docs/rules');
const FIX_LINE =
  '🔧 This rule is automatically fixable by the `--fix` CLI option.';
const SUGGEST_LINE = '💡 This rule is manually fixable by editor suggestions.';

const docs = readdirSync(DOCS)
  .filter((f) => f.endsWith('.md'))
  .map((f) => f.replace(/\.md$/, ''))
  .filter((name) => name in rules);

describe.each(docs)('%s doc header', (name) => {
  const header = readFileSync(resolve(DOCS, `${name}.md`), 'utf-8').split(
    '<!-- end auto-generated rule header -->',
  )[0];
  const meta = rules[name as keyof typeof rules].meta;

  it('claims --fix exactly when meta.fixable is set', () => {
    expect(header.includes(FIX_LINE)).toBe(Boolean(meta.fixable));
    expect(header).not.toContain('💡 This rule is automatically fixable');
  });

  it('claims editor suggestions exactly when meta.hasSuggestions is set', () => {
    expect(header.includes(SUGGEST_LINE)).toBe(Boolean(meta.hasSuggestions));
  });
});
