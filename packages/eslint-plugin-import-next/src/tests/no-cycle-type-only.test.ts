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
const lint = (aSource: string, bSource: string): number => {
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
          rules: { 'import-next/no-cycle': 'error' },
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

    it('a re-exported name is not followed, so it counts as a value', () => {
      const b = ["import { a } from './a';", "export { Shape } from './c';", 'export const keep = a;'].join('\n');
      expect(lint("import { Shape } from './b';\nexport const a = () => 1 as unknown as Shape;\n", b)).toBeGreaterThan(0);
    });
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
