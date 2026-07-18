/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Dual-layer coverage tests — batch B
 * (extensions, max-dependencies, named, namespace, no-absolute-path, no-amd,
 *  no-anonymous-default-export, no-barrel-file, no-barrel-import, no-commonjs,
 *  no-cross-domain-imports)
 *
 * Layer 1: RuleTester fixtures through the real parser.
 * Layer 2: raw unit tests with synthetic AST nodes / mock parser services
 * (createWithMockContext from @interlace/eslint-devkit; a local helper below
 * mocks parser services for type-aware rules).
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, expect, afterAll, vi } from 'vitest';
import ts from 'typescript';
import type { TSESLint } from '@interlace/eslint-devkit';
import { createWithMockContext } from '@interlace/eslint-devkit';

import { extensions } from '../rules/extensions';
import { maxDependencies } from '../rules/max-dependencies';
import { named } from '../rules/named';
import { namespace } from '../rules/namespace';
import { noAbsolutePath } from '../rules/no-absolute-path';
import { noAmd } from '../rules/no-amd';
import { noAnonymousDefaultExport } from '../rules/no-anonymous-default-export';
import { noBarrelFile } from '../rules/no-barrel-file';
import { noBarrelImport } from '../rules/no-barrel-import';
import { noCommonjs } from '../rules/no-commonjs';
import {
  noCrossDomainImports,
  violatesDomainBoundary,
} from '../rules/no-cross-domain-imports';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

/** Local Layer-2 helper: mock context with parser services attached. */
function createWithParserServices(
  rule: { create(context: never): Record<string, unknown> },
  parserServices: unknown,
) {
  const reports: TSESLint.ReportDescriptor<string>[] = [];
  const sourceCode = { text: '', getText: () => '', parserServices };
  const context = {
    id: 'mock-rule',
    filename: 'mock.ts',
    physicalFilename: 'mock.ts',
    cwd: '/',
    options: [],
    settings: {},
    sourceCode,
    getFilename: () => 'mock.ts',
    getSourceCode: () => sourceCode,
    report: (d: TSESLint.ReportDescriptor<string>) => {
      reports.push(d);
    },
  } as unknown as never;
  const listeners = rule.create(context);
  return { listeners, reports };
}

// ---------------------------------------------------------------------------
// extensions
// ---------------------------------------------------------------------------
ruleTester.run('extensions (coverage)', extensions, {
  valid: [
    {
      name: 'bare package imports are not checked',
      code: `import fs from 'fs';`,
      options: [{ default: 'always' }],
    },
  ],
  invalid: [
    {
      name: 'falls back to the built-in pattern map when only default is set',
      code: `import x from './x.js';`,
      options: [{ default: 'always' }],
      errors: [{ messageId: 'unexpectedExtension' }],
      output: `import x from './x';`,
    },
  ],
});

// ---------------------------------------------------------------------------
// max-dependencies
// ---------------------------------------------------------------------------
ruleTester.run('max-dependencies (coverage)', maxDependencies, {
  valid: [
    {
      name: 'non-glob ignoreFiles pattern matches by substring',
      code: `import a from 'pkg-a'; import b from 'pkg-b';`,
      filename: 'src/generated/file.ts',
      options: [{ max: 1, ignoreFiles: ['generated'] }],
    },
    {
      name: 'require of an ignored import is not counted',
      code: `import a from 'pkg-a'; const l = require('lodash');`,
      options: [{ max: 1, ignoreImports: ['lodash'] }],
    },
    {
      name: 'require of a relative path is not counted',
      code: `import a from 'pkg-a'; const l = require('./local');`,
      options: [{ max: 1 }],
    },
    {
      name: 'require of a node builtin is not counted',
      code: `import a from 'pkg-a'; const fs = require('fs'); const nfs = require('node:fs');`,
      options: [{ max: 1 }],
    },
    {
      name: 'non-require calls are ignored',
      code: `import a from 'pkg-a'; load('pkg-b');`,
      options: [{ max: 1 }],
    },
    {
      name: 'require with a non-string literal is ignored',
      code: `import a from 'pkg-a'; const x = require(42);`,
      options: [{ max: 1 }],
    },
    {
      name: 'dynamic import with non-literal source is ignored',
      code: `import a from 'pkg-a'; const m = 'pkg'; const p = import(m);`,
      options: [{ max: 1 }],
    },
    {
      name: 'dynamic import of a relative path is not counted',
      code: `import a from 'pkg-a'; const p = import('./local');`,
      options: [{ max: 1 }],
    },
  ],
  invalid: [],
});

describe('max-dependencies — Layer 2', () => {
  it('returns no listeners when the filename is empty', () => {
    const { listeners } = createWithMockContext(maxDependencies, {
      filename: '',
    });
    expect(Object.keys(listeners)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// named (parser-services rule) — Layer 2
// ---------------------------------------------------------------------------
describe('named — Layer 2 (mock parser services)', () => {
  const makeServices = (checker: unknown) => ({
    program: { getTypeChecker: () => checker },
    esTreeNodeToTSNodeMap: { get: (n: unknown) => n },
  });

  it('returns no listeners when parser services are unavailable', () => {
    const { listeners } = createWithMockContext(named);
    expect(Object.keys(listeners)).toEqual([]);
  });

  it('skips specifiers of type-only imports', () => {
    const getSymbolAtLocation = vi.fn();
    const { listeners, reports } = createWithParserServices(
      named,
      makeServices({ getSymbolAtLocation }),
    );
    (listeners.ImportSpecifier as (n: unknown) => void)({
      type: 'ImportSpecifier',
      imported: { type: 'Identifier', name: 'x' },
      parent: { type: 'ImportDeclaration', importKind: 'type' },
    });
    expect(reports).toEqual([]);
    expect(getSymbolAtLocation).not.toHaveBeenCalled();
  });

  it('treats an alias whose resolution throws as broken, but bails without a source', () => {
    const aliasSymbol = { flags: ts.SymbolFlags.Alias, escapedName: 'x' };
    const checker = {
      getSymbolAtLocation: () => aliasSymbol,
      getAliasedSymbol: () => {
        throw new Error('unresolved alias');
      },
    };
    const { listeners, reports } = createWithParserServices(
      named,
      makeServices(checker),
    );
    (listeners.ImportSpecifier as (n: unknown) => void)({
      type: 'ImportSpecifier',
      imported: { type: 'Identifier', name: 'x' },
      parent: { type: 'ImportDeclaration', importKind: 'value', source: null },
    });
    expect(reports).toEqual([]);
  });

  it('treats an "unknown" symbol as unresolved and bails when the module has no symbol', () => {
    const unknownSymbol = { flags: 0, escapedName: 'unknown' };
    const source = { type: 'Literal', value: 'mod' };
    const checker = {
      getSymbolAtLocation: (tsNode: unknown) =>
        tsNode === source ? undefined : unknownSymbol,
    };
    const { listeners, reports } = createWithParserServices(
      named,
      makeServices(checker),
    );
    (listeners.ImportSpecifier as (n: unknown) => void)({
      type: 'ImportSpecifier',
      imported: { type: 'Identifier', name: 'x' },
      parent: { type: 'ImportDeclaration', importKind: 'value', source },
    });
    expect(reports).toEqual([]);
  });

  it('reports when the named import is missing but the module resolves', () => {
    const source = { type: 'Literal', value: 'mod' };
    const moduleSymbol = { flags: 0, escapedName: 'mod' };
    const checker = {
      getSymbolAtLocation: (tsNode: unknown) =>
        tsNode === source ? moduleSymbol : undefined,
    };
    const { listeners, reports } = createWithParserServices(
      named,
      makeServices(checker),
    );
    (listeners.ImportSpecifier as (n: unknown) => void)({
      type: 'ImportSpecifier',
      imported: { type: 'Identifier', name: 'missing' },
      parent: { type: 'ImportDeclaration', importKind: 'value', source },
    });
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ messageId: 'named' });
  });
});

// ---------------------------------------------------------------------------
// namespace (parser-services rule) — Layer 2
// ---------------------------------------------------------------------------
describe('namespace — Layer 2 (mock parser services)', () => {
  const makeServices = (checker: unknown) => ({
    program: { getTypeChecker: () => checker },
    esTreeNodeToTSNodeMap: { get: (n: unknown) => n },
  });

  const namespaceDeclSymbol = {
    declarations: [{ kind: ts.SyntaxKind.NamespaceImport }],
  };

  it('returns no listeners when parser services are unavailable', () => {
    const { listeners } = createWithMockContext(namespace);
    expect(Object.keys(listeners)).toEqual([]);
  });

  it('skips member expressions with non-identifier objects', () => {
    const getSymbolAtLocation = vi.fn();
    const { listeners, reports } = createWithParserServices(
      namespace,
      makeServices({ getSymbolAtLocation }),
    );
    (listeners.MemberExpression as (n: unknown) => void)({
      type: 'MemberExpression',
      object: { type: 'CallExpression' },
      property: { type: 'Identifier', name: 'x' },
    });
    expect(reports).toEqual([]);
    expect(getSymbolAtLocation).not.toHaveBeenCalled();
  });

  it('does nothing when the symbol has no declarations', () => {
    const checker = { getSymbolAtLocation: () => ({ declarations: [] }) };
    const { listeners, reports } = createWithParserServices(
      namespace,
      makeServices(checker),
    );
    (listeners.MemberExpression as (n: unknown) => void)({
      type: 'MemberExpression',
      object: { type: 'Identifier', name: 'ns' },
      property: { type: 'Identifier', name: 'x' },
    });
    expect(reports).toEqual([]);
  });

  it('ignores declarations that are not namespace imports', () => {
    const checker = {
      getSymbolAtLocation: () => ({
        declarations: [{ kind: ts.SyntaxKind.ImportSpecifier }],
      }),
    };
    const { listeners, reports } = createWithParserServices(
      namespace,
      makeServices(checker),
    );
    (listeners.MemberExpression as (n: unknown) => void)({
      type: 'MemberExpression',
      object: { type: 'Identifier', name: 'ns' },
      property: { type: 'Identifier', name: 'x' },
    });
    expect(reports).toEqual([]);
  });

  it('skips computed property access on a namespace import', () => {
    const checker = {
      getSymbolAtLocation: () => namespaceDeclSymbol,
      getTypeAtLocation: vi.fn(),
    };
    const { listeners, reports } = createWithParserServices(
      namespace,
      makeServices(checker),
    );
    (listeners.MemberExpression as (n: unknown) => void)({
      type: 'MemberExpression',
      object: { type: 'Identifier', name: 'ns' },
      property: { type: 'Literal', value: 'x' },
    });
    expect(reports).toEqual([]);
    expect(checker.getTypeAtLocation).not.toHaveBeenCalled();
  });

  it('bails when the namespace type cannot be resolved', () => {
    const checker = {
      getSymbolAtLocation: () => namespaceDeclSymbol,
      getTypeAtLocation: () => undefined,
      getPropertyOfType: vi.fn(),
    };
    const { listeners, reports } = createWithParserServices(
      namespace,
      makeServices(checker),
    );
    (listeners.MemberExpression as (n: unknown) => void)({
      type: 'MemberExpression',
      object: { type: 'Identifier', name: 'ns' },
      property: { type: 'Identifier', name: 'x' },
    });
    expect(reports).toEqual([]);
    expect(checker.getPropertyOfType).not.toHaveBeenCalled();
  });

  it('reports when the accessed property does not exist on the namespace', () => {
    const checker = {
      getSymbolAtLocation: () => namespaceDeclSymbol,
      getTypeAtLocation: () => ({ kind: 'type' }),
      getPropertyOfType: () => undefined,
    };
    const { listeners, reports } = createWithParserServices(
      namespace,
      makeServices(checker),
    );
    (listeners.MemberExpression as (n: unknown) => void)({
      type: 'MemberExpression',
      object: { type: 'Identifier', name: 'ns' },
      property: { type: 'Identifier', name: 'missing' },
    });
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      messageId: 'namespace',
      data: { name: 'missing' },
    });
  });

  it('does not report when the property exists on the namespace', () => {
    const checker = {
      getSymbolAtLocation: () => namespaceDeclSymbol,
      getTypeAtLocation: () => ({ kind: 'type' }),
      getPropertyOfType: () => ({ name: 'present' }),
    };
    const { listeners, reports } = createWithParserServices(
      namespace,
      makeServices(checker),
    );
    (listeners.MemberExpression as (n: unknown) => void)({
      type: 'MemberExpression',
      object: { type: 'Identifier', name: 'ns' },
      property: { type: 'Identifier', name: 'present' },
    });
    expect(reports).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// no-absolute-path
// ---------------------------------------------------------------------------
ruleTester.run('no-absolute-path (coverage)', noAbsolutePath, {
  valid: [
    {
      name: 'require with a non-string literal is ignored',
      code: `const x = require(123);`,
      filename: '/project/src/file.js',
    },
    {
      name: 'dynamic import with non-literal source is ignored',
      code: `const m = '/abs'; const p = import(m);`,
      filename: '/project/src/file.js',
    },
    {
      name: 'member-expression calls are ignored',
      code: `loader.require('/abs/path');`,
      filename: '/project/src/file.js',
    },
  ],
  invalid: [
    {
      name: 'relative fix inside the current directory gets ./ prefix',
      code: `import u from '/project/src/utils';`,
      filename: '/project/src/file.js',
      errors: [{ messageId: 'absolutePath' }],
      output: `import u from './utils';`,
    },
    {
      name: 'AMD require with multiple literal arguments flags each one',
      code: `require('/abs/a', '/abs/b');`,
      filename: '/project/src/file.js',
      options: [{ amd: true, commonjs: false }],
      errors: [{ messageId: 'absolutePath' }, { messageId: 'absolutePath' }],
      output: `require('../../abs/a', '../../abs/b');`,
    },
  ],
});

// ---------------------------------------------------------------------------
// no-amd — Layer 2 (empty filename)
// ---------------------------------------------------------------------------
describe('no-amd — Layer 2', () => {
  it('allow patterns never match when the filename is empty', () => {
    const { listeners, reports } = createWithMockContext(noAmd, {
      filename: '',
      options: [{ allow: ['**/legacy/**'] }],
    });
    (listeners.CallExpression as (n: unknown) => void)({
      type: 'CallExpression',
      callee: { type: 'Identifier', name: 'define' },
      arguments: [],
    });
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ messageId: 'preferES6' });
  });
});

// ---------------------------------------------------------------------------
// no-anonymous-default-export
// ---------------------------------------------------------------------------
ruleTester.run(
  'no-anonymous-default-export (coverage)',
  noAnonymousDefaultExport,
  {
    valid: [
      {
        name: 'identifier default export is a named reference',
        code: `const x = 1; export default x;`,
      },
    ],
    invalid: [
      {
        name: 'parenthesized class expression',
        code: `export default (class {});`,
        errors: [{ messageId: 'anonymousDefaultExport' }],
      },
      {
        name: 'parenthesized function expression',
        code: `export default (function () {});`,
        errors: [{ messageId: 'anonymousDefaultExport' }],
      },
      {
        name: 'template literal falls into the default switch arm',
        code: 'export default `template`;',
        errors: [{ messageId: 'anonymousDefaultExport' }],
      },
    ],
  },
);

// ---------------------------------------------------------------------------
// no-barrel-file
// ---------------------------------------------------------------------------
ruleTester.run('no-barrel-file (coverage)', noBarrelFile, {
  valid: [
    {
      name: 'invalid barrelPatterns regex falls back to substring matching',
      code: `export * from './a'; export * from './b'; export * from './c';`,
      filename: 'src/index.ts',
      options: [{ barrelPatterns: ['('] }],
    },
    {
      name: 'specifier-only export without source is neither re-export nor local export',
      code: `const x = 1; export { x };`,
      filename: 'src/index.ts',
    },
  ],
  invalid: [],
});

describe('no-barrel-file — Layer 2 (synthetic exports)', () => {
  it('counts synthetic re-export nodes with falsy sources without crashing', () => {
    const { listeners, reports } = createWithMockContext(noBarrelFile, {
      filename: 'src/index.ts',
    });
    // ExportAllDeclaration with an empty source value → skipped by
    // countReexportSources.
    (listeners.ExportAllDeclaration as (n: unknown) => void)({
      type: 'ExportAllDeclaration',
      source: { type: 'Literal', value: '' },
    });
    // A synthetic ExportAllDeclaration routed through the named-export
    // listener is classified as a re-export (isReexport true branch).
    (listeners.ExportNamedDeclaration as (n: unknown) => void)({
      type: 'ExportAllDeclaration',
      source: { type: 'Literal', value: '' },
    });
    // A synthetic non-export node routed through the default-export listener
    // is not a local export.
    (listeners.ExportDefaultDeclaration as (n: unknown) => void)({
      type: 'Identifier',
      name: 'x',
    });
    (listeners['Program:exit'] as (n: unknown) => void)({ type: 'Program' });
    // Two re-exports with zero distinct sources → below threshold, no report.
    expect(reports).toEqual([]);
  });

  it('treats a falsy options object as empty options', () => {
    const { listeners } = createWithMockContext(noBarrelFile, {
      options: [0],
      filename: 'src/module.ts',
    });
    // 'src/module.ts' does not match the default barrel patterns → no listeners.
    expect(Object.keys(listeners)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// no-barrel-import
// ---------------------------------------------------------------------------
ruleTester.run('no-barrel-import (coverage)', noBarrelImport, {
  valid: [
    {
      name: 'local exports without a source are ignored',
      code: `export const x = 1;`,
    },
  ],
  invalid: [
    {
      name: 'invalid knownBarrels regex falls back to exact matching',
      code: `import x from '(';`,
      options: [{ knownBarrels: ['('] }],
      errors: [{ messageId: 'barrelImportDetected' }],
    },
  ],
});

describe('no-barrel-import — Layer 2', () => {
  it('treats a falsy options object as defaults', () => {
    const { listeners, reports } = createWithMockContext(noBarrelImport, {
      options: [0],
    });
    (listeners.ImportDeclaration as (n: unknown) => void)({
      type: 'ImportDeclaration',
      source: { type: 'Literal', value: './utils/index' },
    });
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ messageId: 'barrelImportDetected' });
  });

  it('ignores non-string sources on all three listeners', () => {
    const { listeners, reports } = createWithMockContext(noBarrelImport);
    (listeners.ImportDeclaration as (n: unknown) => void)({
      type: 'ImportDeclaration',
      source: { type: 'Literal', value: 42 },
    });
    (listeners.ExportAllDeclaration as (n: unknown) => void)({
      type: 'ExportAllDeclaration',
      source: { type: 'Literal', value: 42 },
    });
    (listeners.ExportNamedDeclaration as (n: unknown) => void)({
      type: 'ExportNamedDeclaration',
      source: { type: 'Literal', value: 42 },
    });
    expect(reports).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// no-commonjs
// ---------------------------------------------------------------------------
ruleTester.run('no-commonjs (coverage)', noCommonjs, {
  valid: [
    {
      name: 'non-glob allowInFiles pattern allows both require and module.exports',
      code: `const x = require('m'); module.exports = x;`,
      filename: 'src/legacy/file.js',
      options: [{ allowInFiles: ['legacy'] }],
    },
    {
      name: 'TS import-equals of a namespace reference is not require()',
      code: `namespace B { export const C = 1; } import A = B.C;`,
    },
  ],
  invalid: [
    {
      name: 'require with non-literal argument falls back to generic suggestion',
      code: `const foo = 'm'; const y = require(foo);`,
      errors: [
        {
          messageId: 'commonjsRequire',
          suggestions: [
            {
              messageId: 'commonjsRequire',
              output: `const foo = 'm'; const y = // Convert to ES6 import/export syntax\nrequire(foo);`,
            },
          ],
        },
      ],
    },
    {
      name: 'computed exports property falls back to generic suggestion',
      code: `exports['a'] = 1;`,
      errors: [
        {
          messageId: 'commonjsModule',
          suggestions: [
            {
              messageId: 'commonjsModule',
              output: `// Convert to ES6 import/export syntax\nexports['a'] = 1;`,
            },
          ],
        },
      ],
    },
    {
      name: 'exports.prop = identifier suggests a named export of that identifier',
      code: `const bar = 1; exports.foo = bar;`,
      errors: [
        {
          messageId: 'commonjsModule',
          suggestions: [
            {
              messageId: 'commonjsModule',
              output: `const bar = 1; // Convert to: export const foo = bar;\nexports.foo = bar;`,
            },
          ],
        },
      ],
    },
    {
      name: 'require report without suggestions when suggestES6 is off',
      code: `const x = require('m');`,
      options: [{ suggestES6: false }],
      errors: [{ messageId: 'commonjsRequire' }],
    },
    {
      name: 'module.exports report without suggestions when suggestES6 is off',
      code: `const x = 1; module.exports = x;`,
      options: [{ suggestES6: false }],
      errors: [{ messageId: 'commonjsExport' }],
    },
    {
      name: 'module.exports.prop report without suggestions when suggestES6 is off',
      code: `module.exports.a = 1;`,
      options: [{ suggestES6: false }],
      errors: [{ messageId: 'commonjsModule' }],
    },
    {
      name: 'exports.prop report without suggestions when suggestES6 is off',
      code: `exports.a = 1;`,
      options: [{ suggestES6: false }],
      errors: [{ messageId: 'commonjsModule' }],
    },
    {
      name: 'import-equals-require report without suggestions when suggestES6 is off',
      code: `import x = require('m');`,
      options: [{ suggestES6: false }],
      errors: [{ messageId: 'commonjsRequire' }],
    },
  ],
});

describe('no-commonjs — Layer 2', () => {
  it('an empty filename never matches allowInFiles patterns', () => {
    const { listeners, reports } = createWithMockContext(noCommonjs, {
      filename: '',
      options: [{ allowInFiles: ['legacy'] }],
    });
    (listeners.CallExpression as (n: unknown) => void)({
      type: 'CallExpression',
      callee: { type: 'Identifier', name: 'require' },
      arguments: [{ type: 'Literal', value: 'm' }],
    });
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ messageId: 'commonjsRequire' });
  });

  it('import-equals suggestion falls back to "unknown" for non-literal module refs', () => {
    const { listeners, reports } = createWithMockContext(noCommonjs);
    (listeners.TSImportEqualsDeclaration as (n: unknown) => void)({
      type: 'TSImportEqualsDeclaration',
      id: { type: 'Identifier', name: 'x' },
      moduleReference: {
        type: 'TSExternalModuleReference',
        expression: { type: 'Identifier', name: 'dynamic' },
      },
    });
    expect(reports).toHaveLength(1);
    const report = reports[0] as unknown as {
      suggest: { fix: (f: TSESLint.RuleFixer) => unknown }[];
    };
    const fixer = {
      replaceText: (_n: unknown, text: string) => ({ text }),
    } as unknown as TSESLint.RuleFixer;
    expect(report.suggest[0].fix(fixer)).toMatchObject({
      text: `import x from 'unknown';`,
    });
  });
});

// ---------------------------------------------------------------------------
// no-cross-domain-imports
// ---------------------------------------------------------------------------
ruleTester.run('no-cross-domain-imports (coverage)', noCrossDomainImports, {
  valid: [
    {
      name: 'dynamic import with non-literal source is skipped',
      code: `const m = './x'; const p = import(m);`,
      filename: 'domains/user/service.ts',
    },
  ],
  invalid: [
    {
      name: 'dynamic import crossing domains is reported',
      code: `const p = import('../../domains/order/order-service');`,
      filename: 'domains/user/user-service.ts',
      errors: [{ messageId: 'crossDomainImport' }],
    },
  ],
});

describe('violatesDomainBoundary — Layer 2', () => {
  it('treats falsy options as defaults', () => {
    const result = violatesDomainBoundary(
      'domains/user/a.ts',
      'external-pkg',
      0 as unknown as Parameters<typeof violatesDomainBoundary>[2],
    );
    expect(result).toEqual({
      violates: false,
      sourceDomain: null,
      targetDomain: null,
    });
  });

  it('returns no source domain for files outside any domain pattern', () => {
    const result = violatesDomainBoundary(
      'src/app/main.ts',
      '../../domains/order/service',
      {},
    );
    expect(result.violates).toBe(false);
    expect(result.sourceDomain).toBe(null);
    expect(result.targetDomain).toBe('order');
  });

  it('extracts sibling directories that resemble domain patterns', () => {
    const result = violatesDomainBoundary(
      'domains/user/a.ts',
      '../domain/helper',
      {},
    );
    expect(result).toMatchObject({
      violates: true,
      sourceDomain: 'user',
      targetDomain: 'domain',
    });
  });

  it('allows same-domain relative imports', () => {
    const result = violatesDomainBoundary(
      'domains/user/a.ts',
      '../../domains/user/service',
      {},
    );
    expect(result).toMatchObject({ violates: false, sourceDomain: 'user' });
  });

  it('skips custom rules whose "from" does not match the source file', () => {
    const result = violatesDomainBoundary(
      'domains/user/a.ts',
      '../../domains/order/service',
      { customRules: [{ from: 'domains/billing', to: ['order'] }] },
    );
    expect(result.violates).toBe(true);
  });

  it('allows imports whitelisted by a custom rule', () => {
    const result = violatesDomainBoundary(
      'domains/user/a.ts',
      '../../domains/order/service',
      {
        customRules: [
          { from: 'domains/user', allowed: ['order'], to: ['order'] },
        ],
      },
    );
    expect(result.violates).toBe(false);
  });

  it('falls through custom rules whose "to" does not match', () => {
    const result = violatesDomainBoundary(
      'domains/user/a.ts',
      '../../domains/order/service',
      { customRules: [{ from: 'domains/user', to: ['billing'] }] },
    );
    expect(result.violates).toBe(true);
  });
});

describe('no-cross-domain-imports — Layer 2', () => {
  it('ignores synthetic nodes of unrelated types', () => {
    const { listeners, reports } = createWithMockContext(noCrossDomainImports, {
      filename: 'domains/user/a.ts',
    });
    (listeners.ImportDeclaration as (n: unknown) => void)({
      type: 'CallExpression',
    });
    expect(reports).toEqual([]);
  });
});
