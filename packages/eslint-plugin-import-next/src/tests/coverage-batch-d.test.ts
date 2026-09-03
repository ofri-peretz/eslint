/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Dual-layer coverage tests — batch D
 * (no-nodejs-modules, no-relative-packages, no-relative-parent-imports,
 *  no-restricted-paths, no-self-import, no-unassigned-import, no-unresolved,
 *  no-useless-path-segments, prefer-default-export, prefer-direct-import,
 *  prefer-modern-api, prefer-node-protocol, prefer-tree-shakeable-imports,
 *  require-import-approval, unambiguous)
 *
 * Layer 1: RuleTester fixtures through the real parser (with on-disk package
 * fixtures for cross-package resolution).
 * Layer 2: raw unit tests with synthetic AST nodes via createWithMockContext.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, expect, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import { createWithMockContext } from '@interlace/eslint-devkit';

import { noNodejsModules } from '../rules/no-nodejs-modules';
import { noRelativePackages } from '../rules/no-relative-packages';
import { noRelativeParentImports } from '../rules/no-relative-parent-imports';
import { noRestrictedPaths } from '../rules/no-restricted-paths';
import { noSelfImport } from '../rules/no-self-import';
import { noUnassignedImport } from '../rules/no-unassigned-import';
import { noUnresolved } from '../rules/no-unresolved';
import { noUselessPathSegments } from '../rules/no-useless-path-segments';
import { preferDefaultExport } from '../rules/prefer-default-export';
import { preferDirectImport } from '../rules/prefer-direct-import';
import { preferModernApi } from '../rules/prefer-modern-api';
import { preferNodeProtocol } from '../rules/prefer-node-protocol';
import { preferTreeShakeableImports } from '../rules/prefer-tree-shakeable-imports';
import { requireImportApproval } from '../rules/require-import-approval';
import { unambiguous } from '../rules/unambiguous';

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
// On-disk fixtures for cross-package resolution
// ---------------------------------------------------------------------------
const relRoot = fs.mkdtempSync(path.join(tmpdir(), 'import-next-rel-'));

const pkgADir = path.join(relRoot, 'pkg-a');
fs.mkdirSync(path.join(pkgADir, 'src'), { recursive: true });
fs.writeFileSync(
  path.join(pkgADir, 'package.json'),
  JSON.stringify({ name: 'pkg-a' }),
);

const pkgBDir = path.join(relRoot, 'pkg-b');
fs.mkdirSync(path.join(pkgBDir, 'lib'), { recursive: true });
fs.writeFileSync(path.join(pkgBDir, 'package.json'), JSON.stringify({}));

const pkgCDir = path.join(relRoot, 'pkg-c');
fs.mkdirSync(path.join(pkgCDir, 'src'), { recursive: true });
fs.writeFileSync(
  path.join(pkgCDir, 'package.json'),
  JSON.stringify({ name: '@fix/pkg-c' }),
);

// ---------------------------------------------------------------------------
// no-nodejs-modules
// ---------------------------------------------------------------------------
ruleTester.run('no-nodejs-modules (coverage)', noNodejsModules, {
  valid: [
    {
      name: 'require with non-string literal is ignored',
      code: `const x = require(42);`,
    },
    {
      name: 'dynamic import with non-literal source is ignored',
      code: `const m = 'fs'; const p = import(m);`,
    },
    {
      name: 'TS import-equals of a namespace reference is ignored',
      code: `namespace N { export const x = 1; } import A = N.x;`,
    },
  ],
  invalid: [
    {
      name: 'dynamic import of a builtin is reported',
      code: `const p = import('fs');`,
      errors: [{ messageId: 'nodejsBuiltinDynamic' }],
    },
    {
      name: 'alternatives suppressed when suggestAlternatives is off',
      code: `import fs from 'fs';`,
      options: [{ suggestAlternatives: false }],
      errors: [{ messageId: 'nodejsBuiltinImport' }],
    },
  ],
});

// ---------------------------------------------------------------------------
// no-relative-packages
// ---------------------------------------------------------------------------
ruleTester.run('no-relative-packages (coverage)', noRelativePackages, {
  valid: [
    {
      name: 'same-package relative import is allowed',
      code: `import x from './sibling';`,
      filename: path.join(pkgADir, 'src', 'file.ts'),
    },
    {
      name: 'dynamic import with non-literal source is ignored',
      code: `const m = './x'; const p = import(m);`,
      filename: path.join(pkgADir, 'src', 'file.ts'),
    },
    {
      name: 'non-require calls are ignored',
      code: `load('../../pkg-b/lib/util');`,
      filename: path.join(pkgADir, 'src', 'file.ts'),
    },
  ],
  invalid: [
    {
      name: 'cross-package import into unnamed package falls back to basename',
      code: `import x from '../../pkg-b/lib/util';`,
      filename: path.join(pkgADir, 'src', 'file.ts'),
      errors: [{ messageId: 'relativePackage' }],
      output: `import x from 'pkg-b/lib/util';`,
    },
    {
      name: 'cross-package import uses package.json name and strips extension',
      code: `import x from '../../pkg-c/src/util.ts';`,
      filename: path.join(pkgADir, 'src', 'file.ts'),
      errors: [{ messageId: 'relativePackage' }],
      output: `import x from '@fix/pkg-c/src/util';`,
    },
  ],
});

describe('no-relative-packages — Layer 2', () => {
  it('ignores synthetic imports with non-string sources', () => {
    const { listeners, reports } = createWithMockContext(noRelativePackages, {
      filename: path.join(pkgADir, 'src', 'file.ts'),
    });
    (listeners.ImportDeclaration as (n: unknown) => void)({
      type: 'ImportDeclaration',
      source: { type: 'Literal', value: 42 },
    });
    expect(reports).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// no-relative-parent-imports
// ---------------------------------------------------------------------------
ruleTester.run(
  'no-relative-parent-imports (coverage)',
  noRelativeParentImports,
  {
    valid: [
      {
        name: 'require with non-literal argument is ignored',
        code: `const p = './x'; const m = require(p);`,
      },
      {
        name: 'member-expression calls are ignored',
        code: `loader.require('../parent');`,
      },
      {
        name: 'non-require identifiers are ignored',
        code: `load('../parent');`,
      },
      {
        name: 'require with two arguments is not commonjs require',
        code: `require('../a', '../b');`,
      },
      {
        name: 'AMD define with non-array first argument is ignored',
        code: `define(factory);`,
        options: [{ amd: true, commonjs: false }],
      },
      {
        name: 'TS import-equals of sibling path is allowed',
        code: `import x = require('./sibling');`,
      },
      {
        name: 'TS import-equals of namespace reference is ignored',
        code: `namespace N { export const x = 1; } import A = N.x;`,
      },
    ],
    invalid: [
      {
        name: 'AMD dependency array flags parent paths only',
        code: `define(['../parent', './sibling', 123, , dynamicDep], factory);`,
        options: [{ amd: true, commonjs: false }],
        errors: [{ messageId: 'preferAbsoluteImport' }],
      },
      {
        name: 'AMD require call with dependency array',
        code: `require(['../other'], cb);`,
        options: [{ amd: true, commonjs: false }],
        errors: [{ messageId: 'preferAbsoluteImport' }],
      },
      {
        name: 'TS import-equals of parent path is flagged',
        code: `import x = require('../parent');`,
        errors: [{ messageId: 'preferAbsoluteImport' }],
      },
    ],
  },
);

describe('no-relative-parent-imports — Layer 2', () => {
  it('ignores synthetic imports with non-string sources', () => {
    const { listeners, reports } = createWithMockContext(
      noRelativeParentImports,
    );
    (listeners.ImportDeclaration as (n: unknown) => void)({
      type: 'ImportDeclaration',
      source: { type: 'Literal', value: 42 },
    });
    expect(reports).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// no-restricted-paths
// ---------------------------------------------------------------------------
ruleTester.run('no-restricted-paths (coverage)', noRestrictedPaths, {
  valid: [
    {
      name: 'non-require calls are ignored',
      code: `load('src/internal/x');`,
      options: [{ restricted: ['internal'] }],
    },
    {
      name: 'require with non-string literal is ignored',
      code: `const x = require(42);`,
      options: [{ restricted: ['internal'] }],
    },
  ],
  invalid: [],
});

describe('no-restricted-paths — Layer 2', () => {
  it('ignores synthetic imports with non-string sources', () => {
    const { listeners, reports } = createWithMockContext(noRestrictedPaths, {
      options: [{ restricted: ['internal'] }],
    });
    (listeners.ImportDeclaration as (n: unknown) => void)({
      type: 'ImportDeclaration',
      source: { type: 'Literal', value: 42 },
    });
    expect(reports).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// no-self-import
// ---------------------------------------------------------------------------
ruleTester.run('no-self-import (coverage)', noSelfImport, {
  valid: [
    {
      name: 'require with non-literal argument is ignored',
      code: `const p = './mod'; const m = require(p);`,
      filename: 'src/mod.ts',
    },
    {
      name: 'dynamic import with non-literal source is ignored',
      code: `const p = './mod'; const q = import(p);`,
      filename: 'src/mod.ts',
    },
    {
      name: 'local export without source is not a self-import',
      code: `export const a = 1;`,
      filename: 'src/mod.ts',
    },
  ],
  invalid: [
    {
      name: 'absolute-path self-import is flagged',
      code: `import x from '/proj/mod';`,
      filename: '/proj/mod.ts',
      errors: [{ messageId: 'selfImport' }],
    },
    {
      name: 'self re-export via named export is flagged',
      code: `export { a } from './mod';`,
      filename: '/proj/src/mod.ts',
      errors: [{ messageId: 'selfImport' }],
    },
    {
      name: 'self re-export via export-all is flagged',
      code: `export * from './mod';`,
      filename: '/proj/src/mod.ts',
      errors: [{ messageId: 'selfImport' }],
    },
  ],
});

describe('no-self-import — Layer 2', () => {
  it('never flags stdin input (<text> filename)', () => {
    const { listeners, reports } = createWithMockContext(noSelfImport, {
      filename: '<text>',
    });
    (listeners.ImportDeclaration as (n: unknown) => void)({
      type: 'ImportDeclaration',
      source: { type: 'Literal', value: './x' },
    });
    expect(reports).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// no-unassigned-import
// ---------------------------------------------------------------------------
ruleTester.run('no-unassigned-import (coverage)', noUnassignedImport, {
  valid: [
    {
      name: 'require of an allowed module is fine',
      code: `require('polyfill');`,
      options: [{ allowModules: ['polyfill'] }],
    },
    {
      name: 'require with non-literal argument is ignored',
      code: `const p = 'm'; require(p);`,
    },
    {
      name: 'require as final sequence element is a used value',
      code: `const x = (0, require('m'));`,
    },
  ],
  invalid: [
    {
      name: 'require in non-final sequence position is unassigned',
      code: `const y = (require('side-effect'), compute());`,
      errors: [{ messageId: 'unassignedImport' }],
    },
  ],
});

describe('no-unassigned-import — Layer 2', () => {
  it('ignores synthetic imports with non-string sources', () => {
    const { listeners, reports } = createWithMockContext(noUnassignedImport);
    (listeners.ImportDeclaration as (n: unknown) => void)({
      type: 'ImportDeclaration',
      source: { type: 'Literal', value: 42 },
      specifiers: [],
    });
    expect(reports).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// no-unresolved
// ---------------------------------------------------------------------------
ruleTester.run('no-unresolved (coverage)', noUnresolved, {
  valid: [
    {
      name: 'ignore pattern matches subpaths of the package',
      code: `import x from 'virtual-pkg/sub';`,
      options: [{ ignore: ['virtual-pkg'] }],
    },
    {
      name: 'local export without source is ignored',
      code: `export const a = 1;`,
    },
    {
      name: 'non-require calls are ignored',
      code: `load('./nope');`,
    },
    {
      name: 'require with non-string literal is ignored',
      code: `const x = require(42);`,
    },
    {
      name: 'dynamic import with non-literal source is ignored',
      code: `const m = './x'; const p = import(m);`,
    },
    {
      name: 'TS import-equals of namespace reference is ignored',
      code: `namespace N { export const x = 1; } import A = N.x;`,
    },
  ],
  invalid: [],
});

describe('no-unresolved — Layer 2', () => {
  it('ignores synthetic nodes with non-string sources', () => {
    const { listeners, reports } = createWithMockContext(noUnresolved);
    (listeners.ImportDeclaration as (n: unknown) => void)({
      type: 'ImportDeclaration',
      source: { type: 'Literal', value: 42 },
    });
    (listeners.ExportAllDeclaration as (n: unknown) => void)({
      type: 'ExportAllDeclaration',
      source: { type: 'Literal', value: 42 },
    });
    expect(reports).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// no-useless-path-segments
// ---------------------------------------------------------------------------
ruleTester.run('no-useless-path-segments (coverage)', noUselessPathSegments, {
  valid: [
    {
      name: 'commonjs off skips require calls',
      code: `const x = require('./foo/../bar');`,
      options: [{ commonjs: false }],
    },
    {
      name: 'require with non-literal argument is ignored',
      code: `const p = './x'; const m = require(p);`,
    },
    {
      name: 'dynamic import with non-literal source is ignored',
      code: `const p = './x'; const m = import(p);`,
    },
  ],
  invalid: [
    {
      name: 'segments collapsing to a bare name regain the ./ prefix',
      code: `import x from './foo/../bar';`,
      errors: [{ messageId: 'uselessPathSegments' }],
      output: `import x from './bar';`,
    },
  ],
});

describe('no-useless-path-segments — Layer 2', () => {
  it('ignores synthetic imports with non-string sources', () => {
    const { listeners, reports } = createWithMockContext(
      noUselessPathSegments,
    );
    (listeners.ImportDeclaration as (n: unknown) => void)({
      type: 'ImportDeclaration',
      source: { type: 'Literal', value: 42 },
    });
    expect(reports).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// prefer-default-export
// ---------------------------------------------------------------------------
ruleTester.run('prefer-default-export (coverage)', preferDefaultExport, {
  valid: [
    {
      name: 'ignoreFiles suppresses the rule entirely',
      code: `export const one = 1;`,
      filename: 'src/ignored-file.ts',
      options: [{ ignoreFiles: ['ignored'] }],
    },
    {
      name: 're-export of default counts as a default export',
      code: `export { default } from './other';`,
    },
    {
      name: 'plain re-exports are skipped',
      code: `export { a } from './other';`,
    },
    {
      name: 'sourceless type exports are skipped',
      code: `type T = number; export type { T };`,
    },
    {
      name: 'destructured export declarators are not tracked',
      code: `const obj = { x: 1 }; export const { x } = obj;`,
    },
  ],
  invalid: [
    {
      name: 'single exported function should be default',
      code: `export function solo() {}`,
      errors: [
        {
          messageId: 'preferDefaultExport',
          suggestions: [
            {
              messageId: 'preferDefaultExport',
              output: `// TODO: Convert named export to default export\nexport function solo() {}`,
            },
          ],
        },
      ],
    },
    {
      name: 'single exported class should be default',
      code: `export class Solo {}`,
      errors: [
        {
          messageId: 'preferDefaultExport',
          suggestions: [
            {
              messageId: 'preferDefaultExport',
              output: `// TODO: Convert named export to default export\nexport class Solo {}`,
            },
          ],
        },
      ],
    },
    {
      name: 'type specifiers are skipped but value specifiers count',
      code: `const a = 1; type T = number; export { type T, a };`,
      errors: [
        {
          messageId: 'preferDefaultExport',
          suggestions: [
            {
              messageId: 'preferDefaultExport',
              output: `const a = 1; type T = number; // TODO: Convert named export to default export\nexport { type T, a };`,
            },
          ],
        },
      ],
    },
    {
      name: 'target always reports multiple named exports',
      code: `export const a = 1;\nexport const b = 2;`,
      options: [{ target: 'always' }],
      errors: [{ messageId: 'multipleNamedToDefault' }],
    },
  ],
});

describe('prefer-default-export — Layer 2', () => {
  it('returns no listeners when the filename is empty', () => {
    const { listeners } = createWithMockContext(preferDefaultExport, {
      filename: '',
    });
    expect(Object.keys(listeners)).toEqual([]);
  });

  it('synthetic source-only export without specifiers hits the re-export guard', () => {
    const { listeners, reports } = createWithMockContext(preferDefaultExport);
    (listeners.ExportNamedDeclaration as (n: unknown) => void)({
      type: 'ExportNamedDeclaration',
      source: { type: 'Literal', value: './x' },
      specifiers: null,
      exportKind: 'value',
    });
    (listeners['Program:exit'] as (n: unknown) => void)({ type: 'Program' });
    expect(reports).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// prefer-direct-import
// ---------------------------------------------------------------------------
const directMappings = [
  { barrel: '(', directPath: 'my-barrel/lib/{name}' },
];

ruleTester.run('prefer-direct-import (coverage)', preferDirectImport, {
  valid: [
    {
      name: 'invalid mapping regex falls back to exact matching (no match)',
      code: `import { thing } from '(other';`,
      options: [{ mappings: directMappings }],
    },
  ],
  invalid: [
    {
      name: 'invalid mapping regex falls back to exact matching (match)',
      code: `import { thing } from '(';`,
      options: [{ mappings: directMappings }],
      errors: [{ messageId: 'preferDirectImport' }],
      output: `import { thing } from 'my-barrel/lib/thing';`,
    },
    {
      name: 'string-literal single import name feeds the direct path',
      code: `import { "str-thing" as t } from 'known-barrel';`,
      options: [
        {
          mappings: [
            { barrel: '^known-barrel$', directPath: 'known-barrel/lib/{name}' },
          ],
        },
      ],
      errors: [{ messageId: 'preferDirectImport' }],
      output: `import { "str-thing" as t } from 'known-barrel/lib/str-thing';`,
    },
    {
      name: 'suggestion mode when autoFix is off',
      code: `import { thing } from 'known-barrel';`,
      options: [
        {
          autoFix: false,
          mappings: [
            { barrel: '^known-barrel$', directPath: 'known-barrel/lib/{name}' },
          ],
        },
      ],
      errors: [
        {
          messageId: 'preferDirectImport',
          suggestions: [
            {
              messageId: 'preferDirectImport',
              output: `import { thing } from 'known-barrel/lib/thing';`,
            },
          ],
        },
      ],
    },
    {
      name: 'multiple string-literal imports are reported per specifier',
      code: `import { "s-one" as a, "s-two" as b } from 'known-barrel';`,
      options: [
        {
          mappings: [
            { barrel: '^known-barrel$', directPath: 'known-barrel/lib/{name}' },
          ],
        },
      ],
      errors: [
        { messageId: 'preferDirectImport' },
        { messageId: 'preferDirectImport' },
      ],
    },
  ],
});

describe('prefer-direct-import — Layer 2', () => {
  it('treats a falsy options object as defaults and skips non-string sources', () => {
    const { listeners, reports } = createWithMockContext(preferDirectImport, {
      options: [0],
    });
    (listeners.ImportDeclaration as (n: unknown) => void)({
      type: 'ImportDeclaration',
      importKind: 'value',
      source: { type: 'Literal', value: 42 },
      specifiers: [],
    });
    expect(reports).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// prefer-modern-api
// ---------------------------------------------------------------------------
ruleTester.run('prefer-modern-api (coverage)', preferModernApi, {
  valid: [
    {
      name: 'dynamic import with non-literal source is ignored',
      code: `const m = 'request'; const p = import(m);`,
    },
    {
      name: 'dynamic import of non-string literal is ignored',
      code: `const p = import(123);`,
    },
    {
      name: 'non-require calls are ignored',
      code: `load('request');`,
    },
    {
      name: 'require with non-string literal is ignored',
      code: `const x = require(42);`,
    },
  ],
  invalid: [
    {
      name: 'scoped custom mapping matches by package name',
      code: `import c from '@old/pkg/sub';`,
      options: [
        {
          customMappings: [
            { deprecated: '@old/pkg', modern: '@new/pkg', reason: 'legacy' },
          ],
        },
      ],
      errors: [{ messageId: 'preferModernApi' }],
    },
    {
      name: 'slash-containing mapping matches by path prefix',
      code: `import c from 'old/sub/deep';`,
      options: [
        {
          customMappings: [
            { deprecated: 'old/sub', modern: 'new-lib', reason: 'legacy' },
          ],
        },
      ],
      errors: [{ messageId: 'preferModernApi' }],
    },
  ],
});

describe('prefer-modern-api — Layer 2', () => {
  it('ignores synthetic imports with non-string sources', () => {
    const { listeners, reports } = createWithMockContext(preferModernApi);
    (listeners.ImportDeclaration as (n: unknown) => void)({
      type: 'ImportDeclaration',
      source: { type: 'Literal', value: 42 },
    });
    expect(reports).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// prefer-node-protocol
// ---------------------------------------------------------------------------
ruleTester.run('prefer-node-protocol (coverage)', preferNodeProtocol, {
  valid: [
    {
      name: 'non-require calls are ignored',
      code: `load('fs');`,
    },
    {
      name: 'require with non-string literal is ignored',
      code: `const x = require(42);`,
    },
    {
      name: 'dynamic import with non-literal source is ignored',
      code: `const m = 'fs'; const p = import(m);`,
    },
  ],
  invalid: [
    {
      name: 'case-insensitive builtin match',
      code: `import fs from 'FS';`,
      errors: [{ messageId: 'preferNodeProtocol' }],
      output: `import fs from "node:FS";`,
    },
  ],
});

describe('prefer-node-protocol — Layer 2', () => {
  it('treats a falsy options object as defaults', () => {
    const { listeners, reports } = createWithMockContext(preferNodeProtocol, {
      options: [0],
    });
    (listeners.ImportDeclaration as (n: unknown) => void)({
      type: 'ImportDeclaration',
      source: { type: 'Literal', value: 'fs' },
    });
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ messageId: 'preferNodeProtocol' });
  });
});

// ---------------------------------------------------------------------------
// prefer-tree-shakeable-imports — Layer 2
// ---------------------------------------------------------------------------
describe('prefer-tree-shakeable-imports — Layer 2', () => {
  it('treats a falsy options object as defaults and skips non-string sources', () => {
    const { listeners, reports } = createWithMockContext(
      preferTreeShakeableImports,
      { options: [0] },
    );
    (listeners.ImportDeclaration as (n: unknown) => void)({
      type: 'ImportDeclaration',
      source: { type: 'Literal', value: 42 },
      specifiers: [],
    });
    expect(reports).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// require-import-approval
// ---------------------------------------------------------------------------
ruleTester.run('require-import-approval (coverage)', requireImportApproval, {
  valid: [
    {
      name: 'relative imports are not package imports',
      code: `import x from './local';`,
      options: [{ packages: [], defaultPolicy: 'deny' }],
    },
    {
      name: 'trailing-star ignore pattern matches by prefix',
      code: `import x from 'internal-tools';`,
      options: [
        { packages: [], defaultPolicy: 'deny', ignorePatterns: ['internal*'] },
      ],
    },
    {
      name: 'approved package produces no report',
      code: `import x from 'approved-pkg';`,
      options: [
        {
          packages: [{ package: 'approved-pkg', status: 'approved' }],
          defaultPolicy: 'deny',
        },
      ],
    },
    {
      name: 'dynamic import with non-literal source is ignored',
      code: `const m = 'evil'; const p = import(m);`,
      options: [{ packages: [], defaultPolicy: 'deny' }],
    },
    {
      name: 'dynamic import of a non-string literal is ignored',
      code: `const p = import(123);`,
      options: [{ packages: [], defaultPolicy: 'deny' }],
    },
    {
      name: 'non-require calls are ignored',
      code: `load('evil');`,
      options: [{ packages: [], defaultPolicy: 'deny' }],
    },
    {
      name: 'require with non-string literal is ignored',
      code: `const x = require(42);`,
      options: [{ packages: [], defaultPolicy: 'deny' }],
    },
  ],
  invalid: [
    {
      name: 'bare scope import is treated as its own package name',
      code: `import s from '@scope';`,
      options: [{ packages: [], defaultPolicy: 'deny' }],
      errors: [{ messageId: 'unapprovedPackage' }],
    },
    {
      name: 'blocked package without reason/alternative uses fallbacks',
      code: `import e from 'evil-pkg';`,
      options: [
        {
          packages: [{ package: 'evil-pkg', status: 'blocked' }],
          defaultPolicy: 'allow',
        },
      ],
      errors: [{ messageId: 'blockedPackage' }],
    },
    {
      name: 'pending package without reason/alternative uses fallbacks',
      code: `import p from 'pending-pkg';`,
      options: [
        {
          packages: [{ package: 'pending-pkg', status: 'pending' }],
          defaultPolicy: 'allow',
        },
      ],
      errors: [{ messageId: 'unapprovedPackage' }],
    },
  ],
});

describe('require-import-approval — Layer 2', () => {
  it('ignores synthetic imports with non-string sources', () => {
    const { listeners, reports } = createWithMockContext(
      requireImportApproval,
      { options: [{ packages: [], defaultPolicy: 'deny' }] },
    );
    (listeners.ImportDeclaration as (n: unknown) => void)({
      type: 'ImportDeclaration',
      source: { type: 'Literal', value: 42 },
    });
    expect(reports).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// unambiguous
// ---------------------------------------------------------------------------
ruleTester.run('unambiguous (coverage)', unambiguous, {
  valid: [
    {
      name: 'export-all marks the file as a module',
      code: `export * from './m';`,
    },
    {
      name: 'only empty statements is not ambiguous',
      code: `;;`,
    },
  ],
  invalid: [],
});
