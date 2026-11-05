/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Found by the fidelity model (benchmarks/suites/fidelity/models/import-next/
 * no_cycle): runtime edges the rule did not read (`export * from`,
 * `require()`, `import x = require()`, on either side of the cycle), an
 * implicitly type-only import that closed a cycle TypeScript erases, and a
 * `maxDepth` that changed nothing.
 *
 * Each case writes its own directory: `a.ts` is linted, `b.ts` (and `c.ts`)
 * hold the rest of the cycle. The rule only follows files under the lint
 * `cwd`, so each case lints with its own directory as `cwd` (a RuleTester
 * runs in the package directory).
 */
import { describe, it, expect, afterAll } from 'vitest';
import { Linter } from 'eslint';
import parser from '@typescript-eslint/parser';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { noCycle } from '../rules/no-cycle';

const ROOT = fs.realpathSync(
  fs.mkdtempSync(path.join(os.tmpdir(), 'no-cycle-fidelity-')),
);
afterAll(() => fs.rmSync(ROOT, { recursive: true, force: true }));

const A_EXPORTS =
  'export const run = () => 1;\nexport interface AppType { a: number }\n';
const B_EXPORTS = 'export const b = 1;\nexport interface T { t: number }\n';

/** Writes the other modules of one case; returns the path of `a.ts`. */
function project(name: string, files: Record<string, string>): string {
  const dir = path.join(ROOT, name);
  fs.mkdirSync(dir);
  for (const [rel, text] of Object.entries(files))
    fs.writeFileSync(path.join(dir, rel), text);
  return path.join(dir, 'a.ts');
}

const valueBack = `import { run } from './a';\nexport const back = () => run();\n${B_EXPORTS}`;

interface Case {
  name: string;
  code: string;
  filename: string;
  options?: object;
}

/** How many no-cycle findings linting `a.ts` of a case gives. */
function findings({ code, filename, options }: Case): number {
  // The rule reads the linted file from disk too, to walk the graph.
  fs.writeFileSync(filename, code);
  const linter = new Linter({
    configType: 'flat',
    cwd: path.dirname(filename),
  });
  return linter
    .verify(
      code,
      [
        {
          files: ['**/*.ts'],
          languageOptions: {
            parser: parser as never,
            ecmaVersion: 2022,
            sourceType: 'module',
          },
          plugins: {
            'import-next': { rules: { 'no-cycle': noCycle as never } },
          },
          rules: {
            'import-next/no-cycle': options ? ['error', options] : 'error',
          },
        },
      ],
      filename,
    )
    .filter((m) => m.ruleId === 'import-next/no-cycle').length;
}

const cases: { valid: Case[]; invalid: (Case & { errors: unknown })[] } = {
  valid: [
    {
      name: 'an import of only an interface closes no runtime cycle',
      code: `import { b } from './b';\nexport const use = () => b;\n${A_EXPORTS}`,
      filename: project('implicit-type-back', {
        'b.ts': `import { AppType } from './a';\nexport const back = (a: AppType) => a;\n${B_EXPORTS}`,
      }),
    },
    {
      name: 'a require() inside a function runs after both modules initialized',
      code: `export const use = () => require('./b').b;\n${A_EXPORTS}`,
      filename: project('nested-require-out', { 'b.ts': valueBack }),
    },
    {
      name: 'an indented require() in the other module is not an initialization edge',
      code: `import { b } from './b';\nexport const use = () => b;\n${A_EXPORTS}`,
      filename: project('nested-require-back', {
        'b.ts': `export const back = () => {\n  return require('./a').run();\n};\n${B_EXPORTS}`,
      }),
    },
    {
      name: 'an import of only interfaces through an export * barrel closes no runtime cycle',
      code: `import { b } from './b';\nexport const use = () => b;\n${A_EXPORTS}`,
      filename: project('barrel-star-type-back', {
        'b.ts': `import { AppType } from './types';\nexport const back = (a: AppType) => a;\n${B_EXPORTS}`,
        'types.ts': `export * from './a';\n`,
      }),
    },
    {
      name: 'an import of only interfaces through an export { } from barrel closes no runtime cycle',
      code: `import { b } from './b';\nexport const use = () => b;\n${A_EXPORTS}`,
      filename: project('barrel-named-type-back', {
        'b.ts': `import { Shape } from './types';\nexport const back = (a: Shape) => a;\n${B_EXPORTS}`,
        'types.ts': `export { AppType as Shape } from './a';\n`,
      }),
    },
    {
      name: 'the linted file imports only interfaces through a barrel of the other module',
      code: `import { T } from './types';\nexport const use = (t: T) => t;\n${A_EXPORTS}`,
      filename: project('barrel-type-out', {
        'b.ts': valueBack,
        'types.ts': `export * from './b';\n`,
      }),
    },
    {
      name: 'an export { } list of a local interface is a type',
      code: `import { b } from './b';\nexport const use = () => b;\n${A_EXPORTS}`,
      filename: project('barrel-local-list-back', {
        'b.ts': `import { Local } from './types';\nexport const back = (a: Local) => a;\n${B_EXPORTS}`,
        'types.ts': `import { run } from './a';\ninterface Local { a: number }\nexport { Local };\nexport const again = run;\n`,
      }),
    },
    {
      name: 'maxDepth: 1 does not follow a three-module cycle',
      code: `import { b } from './b';\nexport const use = () => b;\n${A_EXPORTS}`,
      filename: project('depth-one', {
        'b.ts': `import { c } from './c';\nexport const viaC = () => c;\n${B_EXPORTS}`,
        'c.ts': `import { run } from './a';\nexport const c = () => run();\n`,
      }),
      options: { maxDepth: 1 },
    },
    {
      name: 'export type * from is erased',
      code: `export type * from './b';\n${A_EXPORTS}`,
      filename: project('export-type-star', { 'b.ts': valueBack }),
    },
    {
      name: 'import type x = require() is erased',
      code: `import type m = require('./b');\nexport const use = (x: m.T) => x;\n${A_EXPORTS}`,
      filename: project('import-type-equals', { 'b.ts': valueBack }),
    },
    {
      name: 'a require() of a computed specifier is not an edge',
      code: `const name = './b';\nconst m = require(name);\n${A_EXPORTS}`,
      filename: project('computed-require', { 'b.ts': valueBack }),
    },
    {
      name: 'a call to something other than require() is not an edge',
      code: `load('./b');\nobj.require('./b');\nrequire('./b', 1);\n${A_EXPORTS}`,
      filename: project('not-require', { 'b.ts': valueBack }),
    },
    {
      name: 'export type { T } from is erased',
      code: `export type { T } from './b';\n${A_EXPORTS}`,
      filename: project('export-type-named', { 'b.ts': valueBack }),
    },
    {
      name: 'import x = Namespace.member is not a module edge',
      code: `namespace N {\n  export const v = 1;\n}\nimport x = N.v;\n${A_EXPORTS}`,
      filename: project('import-equals-entity', { 'b.ts': valueBack }),
    },
  ],
  invalid: [
    {
      name: 'export * from a module that imports this one',
      code: `export * from './b';\n${A_EXPORTS}`,
      filename: project('export-star-out', { 'b.ts': valueBack }),
      errors: [{ messageId: 'moduleSplit' }],
    },
    {
      name: 'export * as ns from a module that imports this one',
      code: `export * as ns from './b';\n${A_EXPORTS}`,
      filename: project('export-star-as-out', { 'b.ts': valueBack }),
      errors: [{ messageId: 'moduleSplit' }],
    },
    {
      name: 'TS import x = require() of a module that imports this one',
      code: `import m = require('./b');\nexport const use = () => m.b;\n${A_EXPORTS}`,
      filename: project('import-equals-out', { 'b.ts': valueBack }),
      errors: [{ messageId: 'moduleSplit' }],
    },
    {
      name: 'a top-level require() of a module that imports this one',
      code: `const m = require('./b');\nexport const use = () => m.b;\n${A_EXPORTS}`,
      filename: project('require-out', { 'b.ts': valueBack }),
      errors: [{ messageId: 'moduleSplit' }],
    },
    {
      name: 'the other module re-exports this one with export *',
      code: `import { b } from './b';\nexport const use = () => b;\n${A_EXPORTS}`,
      filename: project('export-star-back', {
        'b.ts': `export * from './a';\n${B_EXPORTS}`,
      }),
      errors: [{ messageId: 'moduleSplit' }],
    },
    {
      name: 'the other module requires this one at top level',
      code: `import { b } from './b';\nexport const use = () => b;\n${A_EXPORTS}`,
      filename: project('require-back', {
        'b.ts': `const app = require('./a');\nexport const back = () => app.run();\n${B_EXPORTS}`,
      }),
      errors: [{ messageId: 'moduleSplit' }],
    },
    {
      name: 'the other module loads this one with import x = require()',
      code: `import { b } from './b';\nexport const use = () => b;\n${A_EXPORTS}`,
      filename: project('import-equals-back', {
        'b.ts': `import app = require('./a');\nexport const back = () => app.run();\n${B_EXPORTS}`,
      }),
      errors: [{ messageId: 'moduleSplit' }],
    },
    {
      name: 'under verbatimModuleSyntax an import of an interface keeps its edge',
      code: `import { b } from './b';\nexport const use = () => b;\n${A_EXPORTS}`,
      filename: project('implicit-type-back-verbatim', {
        'b.ts': `import { AppType } from './a';\nexport const back = (a: AppType) => a;\n${B_EXPORTS}`,
      }),
      options: { verbatimModuleSyntax: true },
      errors: [{ messageId: 'moduleSplit' }],
    },
    {
      name: 'a value imported through an export * barrel keeps its edge',
      code: `import { b } from './b';\nexport const use = () => b;\n${A_EXPORTS}`,
      filename: project('barrel-star-value-back', {
        'b.ts': `import { run } from './types';\nexport const back = () => run();\n${B_EXPORTS}`,
        'types.ts': `export * from './a';\n`,
      }),
      errors: [{ messageId: 'moduleSplit' }],
    },
    {
      name: 'a value imported through a barrel of the other module keeps its edge',
      code: `import { b } from './types';\nexport const use = () => b;\n${A_EXPORTS}`,
      filename: project('barrel-value-out', {
        'b.ts': valueBack,
        'types.ts': `export { b } from './b';\n`,
      }),
      errors: [{ messageId: 'moduleSplit' }],
    },
    {
      name: 'maxDepth: 10 follows a three-module cycle',
      code: `import { b } from './b';\nexport const use = () => b;\n${A_EXPORTS}`,
      filename: project('depth-ten', {
        'b.ts': `import { c } from './c';\nexport const viaC = () => c;\n${B_EXPORTS}`,
        'c.ts': `import { run } from './a';\nexport const c = () => run();\n`,
      }),
      options: { maxDepth: 10 },
      errors: [{ messageId: 'moduleSplit' }],
    },
  ],
};

describe('no-cycle - fidelity', () => {
  for (const c of cases.valid)
    it(`valid: ${c.name}`, () => expect(findings(c)).toBe(0));
  for (const c of cases.invalid)
    it(`invalid: ${c.name}`, () => expect(findings(c)).toBe(1));
});
