/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A shipped config may not pair `no-cycle` with an autofix that erases what
 * `no-cycle` detects.
 *
 * `consistent-type-specifier-style` at `prefer-inline` rewrites
 * `import type { Foo } from './y'` into `import { type Foo } from './y'`.
 * `no-cycle` reports the first spelling and treats the second as erased before
 * emit — so under `--fix` the pair could turn a REPORTED runtime cycle into a
 * silent one, in a single pass, with no diagnostic in between. The plugin would
 * be manufacturing its own blind spot.
 *
 * Whether `no-cycle` *should* look through an inline type specifier is a
 * separate and genuinely undecided question (its own source argues both sides,
 * and the answer depends on a `verbatimModuleSyntax` setting the rule declines
 * to read). This lock does not take a position on it. It only forbids the
 * combination that lets an autofix move code across whichever line that rule
 * eventually draws.
 */
import { describe, it, expect } from 'vitest';
import { configs } from './index';

type RuleEntry = unknown;

/** The configured style, whatever spelling the entry uses. */
const styleOf = (entry: RuleEntry): string | undefined => {
  if (Array.isArray(entry)) return entry[1] as string | undefined;
  return undefined;
};

/** `error`/`warn`/2/1 — anything that makes the rule actually run. */
const isEnabled = (entry: RuleEntry): boolean => {
  const severity = Array.isArray(entry) ? entry[0] : entry;
  return (
    severity === 'error' ||
    severity === 'warn' ||
    severity === 2 ||
    severity === 1
  );
};

describe('no-cycle is never paired with a prefer-inline autofix', () => {
  const named = Object.entries(
    configs as Record<string, { rules?: Record<string, RuleEntry> }>,
  );

  it('covers every shipped config', () => {
    expect(named.length).toBeGreaterThan(0);
  });

  for (const [name, config] of named) {
    const rules = config?.rules;
    if (!rules) continue;

    const cycle = rules['import-next/no-cycle'];
    const specifier = rules['import-next/consistent-type-specifier-style'];
    if (!isEnabled(cycle) || !isEnabled(specifier)) continue;

    it(`${name}: consistent-type-specifier-style is explicitly prefer-top-level`, () => {
      // Not merely "not prefer-inline": the rule's own DEFAULT is
      // `prefer-inline`, so a bare 'error' would reintroduce the hazard while
      // reading as innocent. The style has to be spelled out.
      expect(styleOf(specifier)).toBe('prefer-top-level');
    });
  }
});
