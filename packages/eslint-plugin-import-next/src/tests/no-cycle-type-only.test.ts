/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `no-cycle` ignores a cycle whose edge is erased before emit.
 *
 * Every case here has a real cycle on disk. What separates them is only
 * whether the reported edge survives compilation — so a test that passes for
 * the wrong reason (no cycle at all) is ruled out by construction.
 *
 * The RECALL cases are the ones that matter. This rule is `error` in
 * `recommended`, so a missed runtime cycle is a shipped initialization bug,
 * and every ambiguity in `importsOnlyTypes` is deliberately resolved toward
 * reporting.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Linter } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { noCycle, clearCircularDependencyCache } from '../rules/no-cycle';

let dir: string;
beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-cycle-type-'));
});
afterAll(() => {
  if (dir) fs.rmSync(dir, { recursive: true, force: true });
});

/** Writes `b.ts`, then lints `a.ts` — both closing a cycle a→b→a. */
const lint = (aSource: string, bSource: string, options?: object): number => {
  const sub = fs.mkdtempSync(path.join(dir, 'case-'));
  fs.writeFileSync(path.join(sub, 'b.ts'), bSource);
  const aPath = path.join(sub, 'a.ts');
  fs.writeFileSync(aPath, aSource);
  const linter = new Linter({ configType: 'flat', cwd: sub });
  return linter
    .verify(
      aSource,
      [
        {
          files: ['**/*.ts'],
          languageOptions: { parser: tsParser as never, ecmaVersion: 2022, sourceType: 'module' },
          plugins: { 'import-next': { rules: { 'no-cycle': noCycle as never } } },
          rules: {
            'import-next/no-cycle': options ? ['error', options] : 'error',
          },
        },
      ],
      aPath,
    )
    .filter((m) => m.ruleId === 'import-next/no-cycle').length;
};

const B_BOTH = [
  "import { a } from './a';",
  'export interface Shape { n: number }',
  'export class Widget { use() { return a(); } }',
  'export const VALUE = 1;',
  'export enum Mode { On }',
].join('\n');

describe('no-cycle and erased imports', () => {
  describe('silent — the edge does not survive compilation', () => {
    it('named import of an interface', () => {
      expect(lint("import { Shape } from './b';\nexport const a = () => 1 as unknown as Shape;\n", B_BOTH)).toBe(0);
    });

    it('inline type specifier', () => {
      expect(lint("import { type Shape } from './b';\nexport const a = () => 1 as unknown as Shape;\n", B_BOTH)).toBe(0);
    });
  });

  // Under `verbatimModuleSyntax` the inline form is NOT erased: `tsc` emits
  // `import {} from './b.js'`, the target module is evaluated, and the cycle is
  // real. The block above is correct only for projects that leave the flag off,
  // so the behaviour is an option rather than a default flip.
  //
  // burgee sets `verbatimModuleSyntax: true` in tsconfig.base.json and writes
  // the inline form 379 times against 33 statement-level `import type`; the
  // silenced edges include packages/paratext/src/template.ts:16 and
  // packages/flagstaff/src/builtins.ts:12.
  describe('verbatimModuleSyntax — the inline form survives emit', () => {
    const VMS = { verbatimModuleSyntax: true };

    it('reports an inline type specifier when the flag is set', () => {
      expect(
        lint("import { type Shape } from './b';\nexport const a = () => 1 as unknown as Shape;\n", B_BOTH, VMS),
      ).toBeGreaterThan(0);
    });

    it('still skips a statement-level `import type`, which IS erased under the flag', () => {
      expect(
        lint("import type { Shape } from './b';\nexport const a = () => 1 as unknown as Shape;\n", B_BOTH, VMS),
      ).toBe(0);
    });
  });

  describe('RECALL — these must keep reporting', () => {
    it('named import of a class', () => {
      expect(lint("import { Widget } from './b';\nexport const a = () => new Widget();\n", B_BOTH)).toBeGreaterThan(0);
    });

    it('named import of a const', () => {
      expect(lint("import { VALUE } from './b';\nexport const a = () => VALUE;\n", B_BOTH)).toBeGreaterThan(0);
    });

    it('named import of an enum — a type in name only, a value at runtime', () => {
      expect(lint("import { Mode } from './b';\nexport const a = () => Mode.On;\n", B_BOTH)).toBeGreaterThan(0);
    });

    it('a type mixed with a value reports on the value', () => {
      expect(lint("import { Shape, Widget } from './b';\nexport const a = () => new Widget() as unknown as Shape;\n", B_BOTH)).toBeGreaterThan(0);
    });

    it('a DEFAULT import alongside a named type still reports', () => {
      // The exact shape that fooled the sampler behind #702:
      // `import Page, { TwilioResponsePayload } from './Page'` — the braces are
      // type-only, the default binding is a class, the cycle is real.
      const b = ["import { a } from './a';", 'export interface Shape { n: number }', 'export default class Thing { use() { return a(); } }'].join('\n');
      expect(lint("import Thing, { Shape } from './b';\nexport const a = () => new Thing() as unknown as Shape;\n", b)).toBeGreaterThan(0);
    });

    it('declaration merging counts as a value, not a type', () => {
      const b = ["import { a } from './a';", 'export interface Dual { n: number }', 'export const Dual = { n: 1, a };'].join('\n');
      expect(lint("import { Dual } from './b';\nexport const a = () => Dual;\n", b)).toBeGreaterThan(0);
    });

    it('an interface merged with a namespace counts as a value', () => {
      // `export interface Foo` beside `export namespace Foo` is the standard
      // way to hang statics off a type. The namespace holds runtime entities,
      // so it emits a real JS object and the cycle is real — matching only the
      // interface would silence it.
      const b = [
        "import { a } from './a';",
        'export interface Config { n: number }',
        'export namespace Config {',
        '  export const DEFAULT = { n: 1, a };',
        '}',
      ].join('\n');
      expect(
        lint("import { Config } from './b';\nexport const a = () => Config.DEFAULT;\n", b),
      ).toBeGreaterThan(0);
    });

    it('a re-exported name is not followed, so it counts as a value', () => {
      const b = ["import { a } from './a';", "export { Shape } from './c';", 'export const keep = a;'].join('\n');
      expect(lint("import { Shape } from './b';\nexport const a = () => 1 as unknown as Shape;\n", b)).toBeGreaterThan(0);
    });
  });
});

/**
 * One edge, two verdicts.
 *
 * The rule's report site is inline-aware (`spec.importKind === 'type'`), but the
 * GRAPH it asks about the cycle was not: the devkit's type test read
 * `/^import\s+type[\s{]/` against the whole statement, so
 * `import { type Fields } from './a.js'` never set `typeOnly`, and the edge
 * survived the type filters in Tarjan and `findShortestCyclePath`. The result is
 * a rule that contradicts itself — the SAME pair reports from one end and is
 * silent from the other, and which answer you get depends on which file the lint
 * run happens to be visiting.
 *
 * This is NOT a claim that the cycle does not exist. Under
 * `verbatimModuleSyntax` — which the burgee corpus sets
 * (`tsconfig.base.json:4-5,10`) — the inline form is legal and PRESERVED:
 * verified with tsc 6.0.3 that `import { type Fields } from './cap.js'` emits a
 * real `import {} from './cap.js'`, a genuine runtime edge. What is fixed here is
 * the self-inconsistency, resolved in the direction the report site already
 * chose.
 *
 * Burgee anchor: `packages/paratext/src/capability.ts:25`, with
 * `packages/paratext/src/template.ts:16` as the back edge. The shape is one the
 * plugin actively produces: its `typescript` preset (`src/index.ts:351,356`)
 * pairs `no-cycle: error` with
 * `consistent-type-specifier-style: ['warn', 'prefer-inline']`, whose fixer
 * rewrites `import type { Foo }` into `import { type Foo }`.
 */
describe('one edge, one verdict', () => {
  /** Lints BOTH ends of the same pair and returns a count for each. */
  const lintBothEnds = (
    aSource: string,
    bSource: string,
    options?: object,
  ): { a: number; b: number } => {
    const sub = fs.mkdtempSync(path.join(dir, 'both-ends-'));
    const aPath = path.join(sub, 'a.ts');
    const bPath = path.join(sub, 'b.ts');
    fs.writeFileSync(aPath, aSource);
    fs.writeFileSync(bPath, bSource);
    const linter = new Linter({ configType: 'flat', cwd: sub });
    const config = [
      {
        files: ['**/*.ts'],
        languageOptions: {
          parser: tsParser as never,
          ecmaVersion: 2022,
          sourceType: 'module',
        },
        plugins: { 'import-next': { rules: { 'no-cycle': noCycle as never } } },
        rules: {
          'import-next/no-cycle': options ? ['error', options] : 'error',
        },
      },
    ];
    const count = (source: string, file: string): number =>
      linter
        .verify(source, config as never, file)
        .filter((m) => m.ruleId === 'import-next/no-cycle').length;
    return { a: count(aSource, aPath), b: count(bSource, bPath) };
  };

  it('an all-inline-type back edge is silent from BOTH ends', () => {
    // `a.ts` imports a value; `b.ts` imports nothing but an inline type back.
    // Linting `a.ts` reported the cycle while linting `b.ts` reported nothing.
    const a = [
      "import { render } from './b.js';",
      'export interface Fields { n: number }',
      'export const a = () => render();',
    ].join('\n');
    const b = [
      "import { type Fields } from './a.js';",
      'export const render = (f?: Fields) => f;',
    ].join('\n');
    expect(lintBothEnds(a, b)).toEqual({ a: 0, b: 0 });
  });

  it('a value import that FOLLOWS an inline type import of the same file still reports from BOTH ends', () => {
    // RECALL. The graph keeps one edge per target file and used to keep only
    // the first import's flags, so the inline type import erased the value
    // import behind it and the cycle vanished from `b.ts`'s end.
    const a = [
      "import { render } from './b.js';",
      'export interface Fields { n: number }',
      'export const KEY = 1;',
      'export const a = () => render();',
    ].join('\n');
    const b = [
      "import { type Fields } from './a.js';",
      "import { KEY } from './a.js';",
      'export const render = (f?: Fields) => [f, KEY];',
    ].join('\n');
    const counts = lintBothEnds(a, b);
    expect(counts.a).toBeGreaterThan(0);
    expect(counts.b).toBeGreaterThan(0);
  });

  it('under verbatimModuleSyntax the same back edge reports from BOTH ends', () => {
    // The option reads the inline form as a runtime edge (tsc emits
    // `import {} from './a.js'`). The report site honoured it, but the devkit
    // graph had already erased the edge, so no cycle existed to report and the
    // option did nothing. Both halves now read the same flag.
    const a = [
      "import { render } from './b.js';",
      'export interface Fields { n: number }',
      'export const a = () => render();',
    ].join('\n');
    const b = [
      "import { type Fields } from './a.js';",
      'export const render = (f?: Fields) => f;',
    ].join('\n');
    const counts = lintBothEnds(a, b, { verbatimModuleSyntax: true });
    expect(counts.a).toBeGreaterThan(0);
    expect(counts.b).toBeGreaterThan(0);
  });

  it('a back edge with any value binding still reports from BOTH ends', () => {
    // RECALL. `import { type Fields, KEY }` carries a runtime binding, so the
    // edge survives compilation and the cycle is real from either end.
    const a = [
      "import { render } from './b.js';",
      'export interface Fields { n: number }',
      'export const KEY = 1;',
      'export const a = () => render();',
    ].join('\n');
    const b = [
      "import { type Fields, KEY } from './a.js';",
      'export const render = (f?: Fields) => [f, KEY];',
    ].join('\n');
    const counts = lintBothEnds(a, b);
    expect(counts.a).toBeGreaterThan(0);
    expect(counts.b).toBeGreaterThan(0);
  });
});

/** Lints `a.ts` in a FIXED directory so the same path can be re-linted. */
const lintAt = (sub: string, aSource: string, bSource: string): number => {
  fs.mkdirSync(sub, { recursive: true });
  fs.writeFileSync(path.join(sub, 'b.ts'), bSource);
  const aPath = path.join(sub, 'a.ts');
  fs.writeFileSync(aPath, aSource);
  const linter = new Linter({ configType: 'flat', cwd: sub });
  return linter
    .verify(
      aSource,
      [
        {
          files: ['**/*.ts'],
          languageOptions: { parser: tsParser as never, ecmaVersion: 2022, sourceType: 'module' },
          plugins: { 'import-next': { rules: { 'no-cycle': noCycle as never } } },
          rules: { 'import-next/no-cycle': 'error' },
        },
      ],
      aPath,
    )
    .filter((m) => m.ruleId === 'import-next/no-cycle').length;
};

describe('clearCircularDependencyCache', () => {
  /**
   * `exportKindCache` is module-level and separate from `sharedCache`, so it
   * survives a clear that only touches `sharedCache`. What it caches — whether
   * an exported name is a type or a value — is exactly what an edit changes.
   *
   * The direction asserted here is the dangerous one: a name that BECOMES a
   * value must stop being treated as a type, or a real runtime cycle is
   * silently dropped in watch mode.
   */
  it('re-reads export kinds after a file changes', () => {
    const sub = path.join(dir, 'watch-mode');
    const A = "import { Thing } from './b';\nexport const a = () => Thing;\n";

    const asType = ["import { a } from './a';", 'export interface Thing { n: number }', 'export const keep = a;'].join('\n');
    expect(lintAt(sub, A, asType)).toBe(0);

    const asValue = ["import { a } from './a';", 'export class Thing { use() { return a(); } }'].join('\n');
    clearCircularDependencyCache();
    expect(lintAt(sub, A, asValue)).toBeGreaterThan(0);
  });
});
