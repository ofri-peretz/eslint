/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Property-based fuzzing of the whole rule fleet.
 *
 * Every rule we ship runs against code we have never seen, written by people
 * who are not us, in repositories we do not control. Our fixtures only cover
 * shapes we thought of — and the shapes that crash a rule are, by definition,
 * the ones nobody thought of. A rule that throws takes the entire ESLint run
 * down with it, so a crash is not a missed finding: it stops the user linting
 * at all. Issue #514 ("published package crashes ESLint") is that failure mode.
 *
 * The property asserted here is deliberately weak and therefore hard to argue
 * with: **for any parseable program, linting must terminate without throwing.**
 * Nothing about what the rules should report — only that they survive contact
 * with input they did not expect.
 *
 * Generation is biased toward security-relevant shapes (sinks, member chains,
 * template literals, spreads, optional chaining) rather than uniformly random
 * text. Uniform noise mostly produces syntax errors, which never reach rule
 * code; the interesting inputs are *valid* programs whose AST is unusual —
 * `a?.[b]?.(c)`, `({...x}).y`, a template literal nested in a spread argument.
 *
 * This is also what OpenSSF Scorecard's Fuzzing check detects for TypeScript:
 * a direct import of `fast-check`. That was the prompt, but the test earns its
 * place independently — see the crash class above.
 *
 * Run from the repo root:
 *   npx vitest run --config scripts/__tests__/vitest.config.mts scripts/__tests__/rule-fuzz.test.ts
 */

import { Linter } from 'eslint';
import fc from 'fast-check';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

const PACKAGES_DIR = path.resolve(__dirname, '..', '..', 'packages');

/**
 * How many generated programs each plugin is linted against.
 *
 * Sized for the pre-commit path, not for exhaustiveness: the fleet is ~30
 * plugins, so this is ~30 x RUNS parses plus every rule of that plugin on each.
 * Fuzzing finds crashes by accumulating runs over time (each CI run draws a
 * different seed), not by exhausting the space in one commit.
 */
const RUNS = 25;

type RuleModule = { create: unknown; meta?: unknown };
type Plugin = { rules?: Record<string, RuleModule> };

const pluginDirs = fs
  .readdirSync(PACKAGES_DIR)
  .filter((name) => name.startsWith('eslint-plugin-'))
  .filter((name) => fs.statSync(path.join(PACKAGES_DIR, name)).isDirectory())
  .sort();

/** Identifiers that actually reach sink-matching logic in the security rules. */
const SINK_NAMES = [
  'eval',
  'exec',
  'execSync',
  'spawn',
  'require',
  'innerHTML',
  'outerHTML',
  'insertAdjacentHTML',
  'setTimeout',
  'Function',
  'createHash',
  'randomBytes',
  'query',
  'find',
  'redirect',
  'sign',
  'verify',
  'process',
  'env',
  'req',
  'res',
  'body',
  'params',
  'headers',
  'user',
  'password',
  'token',
  'secret',
];

const identifier = fc.constantFrom(...SINK_NAMES, 'a', 'b', 'x', '_', '$');

/**
 * A recursive expression generator.
 *
 * `fc.letrec` ties the knot; the `depthSize` bias keeps most draws shallow so
 * the suite stays fast, while still producing the occasional deep chain that
 * is exactly where an unguarded `node.parent.parent` walk falls over.
 */
const { expression } = fc.letrec<{ expression: string }>((tie) => ({
  expression: fc.oneof(
    { depthSize: 'small', withCrossShrink: true },
    // Leaves.
    identifier,
    fc.constantFrom(
      '"str"',
      '`tpl`',
      '0',
      'null',
      'undefined',
      'true',
      '/re/g',
      '{}',
      '[]',
    ),
    // Member access, computed and optional — the shapes that break naive
    // `node.property.name` reads.
    tie('expression').map((e) => `${e}.prop`),
    tie('expression').map((e) => `${e}?.prop`),
    tie('expression').map((e) => `${e}[0]`),
    fc
      .tuple(tie('expression'), tie('expression'))
      .map(([o, k]) => `${o}?.[${k}]`),
    // Calls, including optional calls, spreads and zero-argument calls.
    tie('expression').map((e) => `${e}()`),
    fc.tuple(tie('expression'), tie('expression')).map(([c, a]) => `${c}(${a})`),
    fc
      .tuple(tie('expression'), tie('expression'))
      .map(([c, a]) => `${c}?.(...${a})`),
    tie('expression').map((e) => `new ${e}()`),
    // Template literals with embedded expressions — a common taint carrier.
    tie('expression').map((e) => `\`pre \${${e}} post\``),
    // Object/array literals with spread and computed keys.
    tie('expression').map((e) => `({ ...${e} })`),
    fc.tuple(tie('expression'), tie('expression')).map(([k, v]) => `({[${k}]: ${v}})`),
    tie('expression').map((e) => `[...${e}]`),
    // Operators and control flow inside expressions.
    fc.tuple(tie('expression'), tie('expression')).map(([l, r]) => `${l} + ${r}`),
    fc.tuple(tie('expression'), tie('expression')).map(([l, r]) => `${l} || ${r}`),
    fc.tuple(tie('expression'), tie('expression')).map(([l, r]) => `${l} ?? ${r}`),
    fc
      .tuple(tie('expression'), tie('expression'), tie('expression'))
      .map(([t, c, a]) => `(${t} ? ${c} : ${a})`),
    // Functions, so rules that walk scopes get a scope to walk.
    tie('expression').map((e) => `(() => ${e})`),
    tie('expression').map((e) => `(async () => await ${e})`),
    tie('expression').map((e) => `(function* () { yield ${e}; })`),
  ),
}));

/** Wrap an expression in a statement context so more visitors are exercised. */
const program = fc.oneof(
  expression.map((e) => `${e};`),
  expression.map((e) => `const v = ${e};`),
  expression.map((e) => `module.exports = ${e};`),
  expression.map((e) => `if (${e}) { ${e}; }`),
  expression.map((e) => `try { ${e}; } catch (err) { ${e}; }`),
  expression.map((e) => `export default ${e};`),
  fc.tuple(expression, expression).map(([a, b]) => `function f(p) { ${a}; return ${b}; }`),
  fc.tuple(expression, expression).map(([a, b]) => `class C { m() { ${a}; } n = ${b}; }`),
);

/**
 * Enable every rule the plugin exposes.
 *
 * Rules run on their documented defaults; a rule whose schema demands options
 * it does not default is itself a defect worth surfacing here.
 */
const allRulesOf = (pluginName: string, plugin: Plugin): Linter.RulesRecord =>
  Object.fromEntries(
    Object.keys(plugin.rules ?? {}).map((rule) => [
      `${pluginName}/${rule}`,
      'error' as const,
    ]),
  );

/**
 * The harness validates itself before it validates anything else.
 *
 * A fuzz test that cannot fail is worse than no fuzz test: it reports green
 * forever and is read as coverage. Both ways this harness could be silently
 * vacuous are asserted here — the linter swallowing rule crashes, and the
 * generator emitting code so trivial it never reaches rule logic.
 */
describe('harness validity', () => {
  it('propagates a throwing rule out of linter.verify', () => {
    const linter = new Linter();
    const boom = {
      create: () => ({
        Identifier() {
          throw new Error('BOOM');
        },
      }),
    };

    expect(() =>
      linter.verify(
        'const v = a;',
        [
          {
            plugins: { t: { rules: { boom } } as never },
            rules: { 't/boom': 'error' },
          },
        ],
        'fuzz.js',
      ),
    ).toThrow(/BOOM/);
  });

  it('generates programs that actually reach rule logic', async () => {
    // node-security is the probe: its sinks (child_process, fs, eval) are the
    // ones the generator biases toward, so zero findings here means the
    // generator has drifted into emitting inert code.
    const mod = (await import('eslint-plugin-node-security')) as {
      default?: Plugin;
    } & Plugin;
    const plugin: Plugin = mod.default ?? mod;
    const linter = new Linter();
    const config: Linter.Config[] = [
      {
        plugins: { 'eslint-plugin-node-security': plugin as never },
        languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
        rules: allRulesOf('eslint-plugin-node-security', plugin),
      },
    ];

    let findings = 0;
    fc.assert(
      fc.property(program, (code) => {
        findings += linter.verify(code, config, 'fuzz.js').length;
      }),
      { numRuns: 200 },
    );

    expect(findings).toBeGreaterThan(0);
  });
});

describe('rule fleet survives arbitrary parseable input', () => {
  it('enumerates the plugin fleet (sanity floor)', () => {
    expect(pluginDirs.length).toBeGreaterThanOrEqual(19);
  });

  describe.each(pluginDirs)('%s', (pkgName) => {
    it('never throws while linting generated programs', async () => {
      const mod = (await import(pkgName)) as { default?: Plugin } & Plugin;
      const plugin: Plugin = mod.default ?? mod;

      const rules = allRulesOf(pkgName, plugin);
      // A plugin that exposes no rules would make this test vacuously green.
      expect(Object.keys(rules).length).toBeGreaterThan(0);

      const linter = new Linter();
      const config: Linter.Config[] = [
        {
          plugins: { [pkgName]: plugin as never },
          languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
          },
          rules,
        },
      ];

      fc.assert(
        fc.property(program, (code) => {
          // `verify` never rejects valid input by contract: a rule that throws
          // propagates out of here, and fast-check shrinks the program that
          // caused it down to a minimal reproducer in the failure message.
          linter.verify(code, config, 'fuzz.js');
        }),
        { numRuns: RUNS },
      );
    });
  });
});
