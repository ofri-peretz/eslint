/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * What `recommended` is allowed to contain.
 *
 * `order`, `first` and `newline-after-import` are pure formatting, fully
 * auto-fixable, and produced **5,071** of this plugin's findings on the pinned
 * 8-repository corpus — `order` 3,597, `newline-after-import` 835, `first` 639.
 *
 * A consumer who installs a security-positioned ecosystem and is met by four
 * thousand import-ordering warnings does not read them and does not keep the
 * plugin. The README's own FP/FN section makes the argument: an ignored tool
 * has zero recall regardless of what it detects.
 *
 * This is also parity with upstream rather than a novel opinion.
 * `eslint-plugin-import`'s `recommended` is eight rules and excludes all three,
 * and ESLint core deprecated its own formatting rules in 8.53 on the same
 * reasoning — formatting belongs to a formatter.
 *
 * They are still shipped. `import-style` and `strict` both carry them, so
 * opting back in is one config line, and this test pins that too: removing a
 * rule from `recommended` without leaving it reachable would be a capability
 * regression rather than a scope decision.
 */
import { describe, it, expect } from 'vitest';
import { configs, rules as allRules } from './index';

const FORMATTING_ONLY = ['order', 'first', 'newline-after-import'] as const;

function rulesOf(name: string): Record<string, unknown> {
  const config = (configs as Record<string, unknown>)[name];
  if (Array.isArray(config)) {
    return Object.assign({}, ...config.map((c) => (c as { rules?: object }).rules ?? {}));
  }
  return ((config as { rules?: Record<string, unknown> })?.rules ?? {}) as Record<
    string,
    unknown
  >;
}

describe('recommended scope', () => {
  it('does not enable formatting-only rules', () => {
    const recommended = rulesOf('recommended');
    const enabled = FORMATTING_ONLY.filter(
      (rule) => recommended[`import-next/${rule}`] !== undefined,
    );
    expect(enabled).toEqual([]);
  });

  it('still ships them, reachable from import-style and strict', () => {
    // The counterpart assertion. Without it, "not in recommended" also passes
    // on a plugin that deleted the rules outright.
    for (const config of ['import-style', 'strict']) {
      const rules = rulesOf(config);
      for (const rule of FORMATTING_ONLY) {
        expect(rules[`import-next/${rule}`]).toBeDefined();
      }
    }
    for (const rule of FORMATTING_ONLY) {
      expect((allRules as Record<string, unknown>)[rule]).toBeDefined();
    }
  });

  it('keeps the rules that detect defects rather than style', () => {
    // The floor. `recommended` losing `no-cycle` or `export` would be a real
    // regression, and this change is only about the formatting three.
    const recommended = rulesOf('recommended');
    for (const rule of ['no-unresolved', 'no-duplicates', 'export', 'no-cycle', 'no-self-import']) {
      expect(recommended[`import-next/${rule}`]).toBeDefined();
    }
  });
});
