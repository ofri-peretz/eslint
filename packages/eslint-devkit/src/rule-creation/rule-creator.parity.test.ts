/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Differential lock: our ported `RuleCreator` vs upstream `ESLintUtils.RuleCreator`.
 *
 * `rule-creator.ts` inlines typescript-eslint's rule factory so that
 * `@typescript-eslint/utils` (and its non-optional 24 MB `typescript` peer)
 * can stay an OPTIONAL peer dependency instead of a hard one. That is only
 * safe while the port behaves identically — this test is the thing that makes
 * it safe. `@typescript-eslint/utils` is a devDependency here, so both
 * implementations are available at test time and can be diffed directly.
 *
 * If this fails, upstream changed `RuleCreator`/`applyDefault` semantics:
 * port the change into `rule-creator.ts` rather than deleting the assertion.
 */
import { describe, expect, it } from 'vitest';
import { ESLintUtils as Upstream } from '@typescript-eslint/utils';

import { RuleCreator, applyDefault } from './rule-creator';

const url = (name: string) => `https://example.test/rules/${name}.md`;

/** The same rule definition fed to both factories. */
const definition = {
  name: 'demo-rule',
  meta: {
    type: 'problem',
    docs: { description: 'demo' },
    messages: { demo: 'demo' },
    schema: [],
  },
  defaultOptions: [{ allow: ['a'], depth: 2, nested: { on: true, keep: 1 } }],
  create: () => ({}),
} as const;

/** Minimal RuleContext stand-in — the factory only reads `options`. */
const contextWith = (options: readonly unknown[]) => ({ options }) as never;

/** Run a built rule's `create` and capture the resolved options it received. */
function resolvedOptions(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- both factories are structurally typed
  factory: any,
  userOptions: readonly unknown[],
): unknown {
  let captured: unknown;
  const rule = factory({
    ...definition,
    create: (_ctx: unknown, opts: unknown) => {
      captured = opts;
      return {};
    },
  });
  rule.create(contextWith(userOptions));
  return captured;
}

describe('RuleCreator parity with @typescript-eslint/utils', () => {
  const ours = RuleCreator(url);
  const theirs = Upstream.RuleCreator(url);

  it('produces the same docs URL and meta shape', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural compare
    const a = ours({ ...definition }) as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural compare
    const b = theirs({ ...definition } as any) as any;

    expect(a.meta).toEqual(b.meta);
    expect(a.meta.docs.url).toBe('https://example.test/rules/demo-rule.md');
    expect(a.name).toBe(b.name);
    expect(a.defaultOptions).toEqual(b.defaultOptions);
  });

  it.each([
    ['no user options', []],
    ['scalar override', [{ depth: 9 }]],
    ['array override replaces, does not merge', [{ allow: ['z'] }]],
    ['nested object deep-merges', [{ nested: { on: false } }]],
    [
      'full replacement',
      [{ allow: [], depth: 0, nested: { on: false, keep: 7 } }],
    ],
    ['extra key added', [{ extra: 'x' }]],
    ['undefined entry keeps the default', [undefined]],
    [
      'object over a non-object default replaces, not merges',
      [{ a: 1 }, { b: 2 }],
    ],
  ])('resolves options identically: %s', (_label, userOptions) => {
    expect(resolvedOptions(ours, userOptions)).toEqual(
      resolvedOptions(theirs, userOptions),
    );
  });

  it('applyDefault matches upstream, including null user options', () => {
    const defaults = [{ a: 1, b: { c: 2 } }] as const;

    expect(applyDefault(defaults, null)).toEqual(
      Upstream.applyDefault(defaults, null),
    );
    expect(applyDefault(defaults, [{ b: { c: 3 } }])).toEqual(
      Upstream.applyDefault(defaults, [{ b: { c: 3 } }]),
    );
  });

  it('matches upstream when a rule declares no defaultOptions', () => {
    const { defaultOptions: _omitted, ...noDefaults } = definition;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural compare
    expect(resolvedOptions(ours, [{ a: 1 }] as any)).toEqual(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural compare
      resolvedOptions(theirs, [{ a: 1 }] as any),
    );

    let captured: unknown;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural compare
    const rule = ours({
      ...noDefaults,
      create: (_ctx: unknown, opts: unknown) => {
        captured = opts;
        return {};
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural compare
    } as any) as any;
    rule.create(contextWith([{ a: 1 }]));
    expect(captured).toEqual([]);
  });

  it('scalar default is replaced, not deep-merged, by an object user option', () => {
    const defaults = ['always'] as const;
    expect(applyDefault(defaults, [{ mode: 'never' }])).toEqual(
      Upstream.applyDefault(defaults, [{ mode: 'never' }]),
    );
  });

  it('does not mutate the caller-supplied defaults', () => {
    const defaults = [{ nested: { on: true } }];
    applyDefault(defaults, [{ nested: { on: false } }]);
    expect(defaults[0].nested.on).toBe(true);
  });

  it('exposes withoutDocs like upstream', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural compare
    const a = RuleCreator.withoutDocs({ ...definition } as any) as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural compare
    const b = Upstream.RuleCreator.withoutDocs({ ...definition } as any) as any;
    expect(a.meta).toEqual(b.meta);
  });
});
