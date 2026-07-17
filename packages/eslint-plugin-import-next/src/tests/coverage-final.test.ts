/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Dual-layer coverage tests — final gap closure across several rules.
 * Complements coverage-batch-a/b/c/d with the last uncovered branches.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, expect, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import type { TSESLint } from '@interlace/eslint-devkit';
import { createWithMockContext } from '@interlace/eslint-devkit';

import { enforceDependencyDirection } from '../rules/enforce-dependency-direction';
import { noDeprecated } from '../rules/no-deprecated';
import { noExtraneousDependencies } from '../rules/no-extraneous-dependencies';
import { noMutableExports } from '../rules/no-mutable-exports';
import { noNamedExport } from '../rules/no-named-export';
import { noNodejsModules } from '../rules/no-nodejs-modules';
import { noRelativePackages } from '../rules/no-relative-packages';
import { noUselessPathSegments } from '../rules/no-useless-path-segments';
import { preferDefaultExport } from '../rules/prefer-default-export';
import { requireImportApproval } from '../rules/require-import-approval';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

// ---------------------------------------------------------------------------
// enforce-dependency-direction: source layer resolvable but not ranked
// ---------------------------------------------------------------------------
ruleTester.run(
  'enforce-dependency-direction (final)',
  enforceDependencyDirection,
  {
    valid: [
      {
        name: 'source layer matched by patterns but absent from layers',
        code: `import d from '../domain/entity';`,
        filename: 'src/ui/panel.ts',
        options: [
          {
            layers: ['domain', 'application'],
            layerPatterns: ['domain', 'application', 'ui'],
          },
        ],
      },
    ],
    invalid: [],
  },
);

// ---------------------------------------------------------------------------
// no-deprecated: export forms that register nothing
// ---------------------------------------------------------------------------
ruleTester.run('no-deprecated (final)', noDeprecated, {
  valid: [
    {
      name: 'destructured exported declarations are not tracked',
      code: `const obj = { da: 1 };\n/** @deprecated gone */\nexport const { da } = obj;\nfoo(da);`,
    },
    {
      name: 'exported interfaces are not tracked',
      code: `/** @deprecated gone */\nexport interface DI { x: number; }`,
    },
    {
      name: 'string-named export specifiers are not tracked',
      code: `const sn = 1;\n/** @deprecated gone */\nexport { sn as "str-dep" };`,
    },
  ],
  invalid: [],
});

// ---------------------------------------------------------------------------
// no-extraneous-dependencies: invalid allowPatterns regex + non-require calls
// ---------------------------------------------------------------------------
ruleTester.run('no-extraneous-dependencies (final)', noExtraneousDependencies, {
  valid: [
    {
      name: 'invalid allowPatterns regex is ignored gracefully',
      code: `import a from 'pkg-a';`,
      options: [
        {
          packageJson: { dependencies: { 'pkg-a': '1.0.0' } },
          allowPatterns: ['('],
        },
      ],
    },
    {
      name: 'non-require calls are ignored',
      code: `load('unknown-pkg');`,
      options: [{ packageJson: { dependencies: {} } }],
    },
  ],
  invalid: [],
});

// ---------------------------------------------------------------------------
// no-mutable-exports: exotic patterns
// ---------------------------------------------------------------------------
ruleTester.run('no-mutable-exports (final)', noMutableExports, {
  valid: [
    {
      name: 'destructured standalone declaration is not matched by the export regex',
      code: `const obj = { a: 1 }; let { a } = obj; export { a };`,
    },
    {
      // Known false negative of the rule: assignment-pattern elements are
      // not descended into, so the binding escapes detection.
      name: 'default-valued array elements are skipped by checkPattern',
      code: `const arr = [1]; export let [x = 1] = arr;`,
    },
  ],
  invalid: [],
});

describe('no-mutable-exports — Layer 2 (final)', () => {
  it('ignores object pattern members that are neither properties nor rest elements', () => {
    const { listeners, reports } = createWithMockContext(noMutableExports);
    (listeners.ExportNamedDeclaration as (n: unknown) => void)({
      type: 'ExportNamedDeclaration',
      declaration: {
        type: 'VariableDeclaration',
        kind: 'let',
        declarations: [
          {
            type: 'VariableDeclarator',
            id: { type: 'ObjectPattern', properties: [{ type: 'SpreadElement' }] },
          },
        ],
      },
    });
    expect(reports).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// no-named-export: metacharacter globs, inline type specifiers, enums
// ---------------------------------------------------------------------------
ruleTester.run('no-named-export (final)', noNamedExport, {
  valid: [
    {
      name: 'allowPatterns glob with regex metacharacters',
      code: `export const x = 1;`,
      filename: 'src/pages/index.ts',
      options: [{ allowPatterns: ['**/pages/*.ts'] }],
    },
    {
      name: 'allowInFiles glob with regex metacharacters',
      code: `export const x = 1;`,
      filename: 'src/pages/index.ts',
      options: [{ allowInFiles: ['**/pages/*.ts'] }],
    },
    {
      name: 'exported enums are outside the declaration checks',
      code: `export enum E { A }`,
    },
  ],
  invalid: [
    {
      name: 'inline type specifiers are skipped, value specifiers reported',
      code: `type T = number; const v = 1; export { type T, v };`,
      errors: [{ messageId: 'namedExport' }],
    },
  ],
});

// ---------------------------------------------------------------------------
// no-nodejs-modules: dynamic import of a non-builtin
// ---------------------------------------------------------------------------
ruleTester.run('no-nodejs-modules (final)', noNodejsModules, {
  valid: [
    {
      name: 'dynamic import of a non-builtin package is fine',
      code: `const p = import('lodash');`,
    },
  ],
  invalid: [],
});

// ---------------------------------------------------------------------------
// no-relative-packages: allowSamePackage off + unreadable target package.json
// ---------------------------------------------------------------------------
const relRoot2 = fs.mkdtempSync(path.join(tmpdir(), 'import-next-rel2-'));
const pkgEDir = path.join(relRoot2, 'pkg-e');
fs.mkdirSync(path.join(pkgEDir, 'src'), { recursive: true });
fs.writeFileSync(
  path.join(pkgEDir, 'package.json'),
  JSON.stringify({ name: 'pkg-e' }),
);
const pkgBadDir = path.join(relRoot2, 'pkg-bad');
fs.mkdirSync(path.join(pkgBadDir, 'lib'), { recursive: true });
fs.writeFileSync(path.join(pkgBadDir, 'package.json'), '{ bad-json');

ruleTester.run('no-relative-packages (final)', noRelativePackages, {
  valid: [
    {
      name: 'same package with allowSamePackage off still compares equal roots',
      code: `import x from './sibling';`,
      filename: path.join(pkgEDir, 'src', 'file.ts'),
      options: [{ allowSamePackage: false }],
    },
  ],
  invalid: [
    {
      name: 'unreadable target package.json reports without a fix',
      code: `import x from '../../pkg-bad/lib/util';`,
      filename: path.join(pkgEDir, 'src', 'file.ts'),
      errors: [{ messageId: 'relativePackage' }],
    },
  ],
});

// ---------------------------------------------------------------------------
// no-useless-path-segments: fix quote fallback without raw text
// ---------------------------------------------------------------------------
describe('no-useless-path-segments — Layer 2 (final)', () => {
  it('falls back to single quotes when the literal has no raw text', () => {
    const { listeners, reports } = createWithMockContext(
      noUselessPathSegments,
    );
    (listeners.ImportDeclaration as (n: unknown) => void)({
      type: 'ImportDeclaration',
      source: { type: 'Literal', value: './foo/../bar' },
    });
    expect(reports).toHaveLength(1);
    const report = reports[0] as unknown as {
      fix: (f: TSESLint.RuleFixer) => { text: string };
    };
    const fixer = {
      replaceText: (_n: unknown, text: string) => ({ text }),
    } as unknown as TSESLint.RuleFixer;
    expect(report.fix(fixer)).toMatchObject({ text: `'./bar'` });
  });
});

// ---------------------------------------------------------------------------
// prefer-default-export: type declarations and enums are not named exports
// ---------------------------------------------------------------------------
ruleTester.run('prefer-default-export (final)', preferDefaultExport, {
  valid: [
    {
      name: 'exported interfaces are skipped',
      code: `export interface Solo { x: number; }`,
    },
    {
      name: 'exported enums are not tracked as named exports',
      code: `export enum E { A }`,
    },
    {
      name: 'string-named export specifiers are not tracked',
      code: `const v = 1; export { v as "s-name" };`,
    },
  ],
  invalid: [],
});

describe('prefer-default-export — Layer 2 (final)', () => {
  it('synthetic export without source, declaration, or specifiers is inert', () => {
    const { listeners, reports } = createWithMockContext(preferDefaultExport);
    (listeners.ExportNamedDeclaration as (n: unknown) => void)({
      type: 'ExportNamedDeclaration',
      source: null,
      declaration: null,
      specifiers: null,
      exportKind: 'value',
    });
    (listeners['Program:exit'] as (n: unknown) => void)({ type: 'Program' });
    expect(reports).toEqual([]);
  });

  it('value-kind interface declarations hit the type-declaration guard', () => {
    const { listeners, reports } = createWithMockContext(preferDefaultExport);
    (listeners.ExportNamedDeclaration as (n: unknown) => void)({
      type: 'ExportNamedDeclaration',
      source: null,
      declaration: { type: 'TSInterfaceDeclaration' },
      specifiers: [],
      exportKind: 'value',
    });
    (listeners['Program:exit'] as (n: unknown) => void)({ type: 'Program' });
    expect(reports).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// require-import-approval: non-matching ignore patterns fall through
// ---------------------------------------------------------------------------
ruleTester.run('require-import-approval (final)', requireImportApproval, {
  valid: [
    {
      name: 'non-matching ignore pattern falls through to allow policy',
      code: `import x from 'other-pkg';`,
      options: [
        { packages: [], defaultPolicy: 'allow', ignorePatterns: ['internal*'] },
      ],
    },
  ],
  invalid: [],
});
