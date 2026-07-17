/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Dual-layer coverage tests — batch A
 * (consistent-type-specifier-style, default, dynamic-import-chunkname,
 *  enforce-dependency-direction, enforce-import-order, enforce-team-boundaries,
 *  export)
 *
 * Layer 1: RuleTester fixtures through the real parser.
 * Layer 2: raw unit tests — rule.create(mockContext()) with synthetic AST
 * objects for parser-unreachable branches (createWithMockContext from
 * @interlace/eslint-devkit; a local parser-services mock helper is defined
 * below for rules that require type information).
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, expect, afterAll, vi } from 'vitest';
import type { TSESLint } from '@interlace/eslint-devkit';
import { createWithMockContext } from '@interlace/eslint-devkit';

import { consistentTypeSpecifierStyle } from '../rules/consistent-type-specifier-style';
import { defaultRule } from '../rules/default';
import { dynamicImportChunkname } from '../rules/dynamic-import-chunkname';
import { enforceDependencyDirection } from '../rules/enforce-dependency-direction';
import { enforceImportOrder } from '../rules/enforce-import-order';
import { enforceTeamBoundaries } from '../rules/enforce-team-boundaries';
import { exportRule } from '../rules/export';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

/**
 * Local Layer-2 helper for rules that consult parser services
 * (createWithMockContext does not expose sourceCode.parserServices).
 */
function createWithParserServices(
  rule: { create(context: never): Record<string, unknown> },
  parserServices: unknown,
  opts: { options?: readonly unknown[]; filename?: string } = {},
) {
  const reports: TSESLint.ReportDescriptor<string>[] = [];
  const filename = opts.filename ?? 'mock.ts';
  const sourceCode = {
    text: '',
    getText: () => '',
    parserServices,
    getCommentsBefore: () => [],
  };
  const context = {
    id: 'mock-rule',
    filename,
    physicalFilename: filename,
    cwd: '/',
    options: opts.options ?? [],
    settings: {},
    sourceCode,
    getFilename: () => filename,
    getSourceCode: () => sourceCode,
    report: (d: TSESLint.ReportDescriptor<string>) => {
      reports.push(d);
    },
  } as unknown as never;
  const listeners = rule.create(context);
  return { listeners, reports };
}

// ---------------------------------------------------------------------------
// consistent-type-specifier-style
// ---------------------------------------------------------------------------
ruleTester.run(
  'consistent-type-specifier-style (coverage)',
  consistentTypeSpecifierStyle,
  {
    valid: [
      {
        name: 'type-only default import has no named specifiers to convert',
        code: `import type Foo from 'mod';`,
        options: ['prefer-inline'],
      },
    ],
    invalid: [],
  },
);

describe('consistent-type-specifier-style — Layer 2 (string import names)', () => {
  it('builds the inline fix from a string-literal imported name', () => {
    const { listeners, reports } = createWithMockContext(
      consistentTypeSpecifierStyle,
      { options: ['prefer-inline'], sourceText: `'mod'` },
    );
    const node = {
      type: 'ImportDeclaration',
      importKind: 'type',
      source: { type: 'Literal', value: 'mod' },
      specifiers: [
        {
          type: 'ImportSpecifier',
          imported: { type: 'Literal', value: 'str-name' },
          local: { type: 'Identifier', name: 'alias' },
        },
      ],
    };
    (listeners.ImportDeclaration as (n: unknown) => void)(node);
    expect(reports).toHaveLength(1);
    const report = reports[0] as unknown as {
      messageId: string;
      fix: (f: TSESLint.RuleFixer) => { text: string };
    };
    expect(report.messageId).toBe('preferInline');
    const fixer = {
      replaceText: (_n: unknown, text: string) => ({ text }),
    } as unknown as TSESLint.RuleFixer;
    expect(report.fix(fixer)).toMatchObject({
      text: `import { type str-name as alias } from 'mod';`,
    });
  });
});

// ---------------------------------------------------------------------------
// default (parser-services rule) — Layer 2
// ---------------------------------------------------------------------------
describe('default rule — Layer 2 (mock parser services)', () => {
  it('returns no listeners when parser services are unavailable', () => {
    const { listeners, reports } = createWithMockContext(defaultRule);
    expect(Object.keys(listeners)).toEqual([]);
    expect(reports).toEqual([]);
  });

  it('skips type-only default imports without consulting the checker', () => {
    const getSymbolAtLocation = vi.fn();
    const services = {
      program: { getTypeChecker: () => ({ getSymbolAtLocation }) },
      esTreeNodeToTSNodeMap: { get: (n: unknown) => n },
    };
    const { listeners, reports } = createWithParserServices(
      defaultRule,
      services,
    );
    const node = {
      type: 'ImportDefaultSpecifier',
      parent: {
        type: 'ImportDeclaration',
        importKind: 'type',
        source: { type: 'Literal', value: 'mod' },
      },
    };
    (
      listeners.ImportDefaultSpecifier as (n: unknown) => void
    )(node);
    expect(reports).toEqual([]);
    expect(getSymbolAtLocation).not.toHaveBeenCalled();
  });

  it('does not report when the default-import symbol resolves', () => {
    const symbol = { exports: new Map() };
    const services = {
      program: {
        getTypeChecker: () => ({ getSymbolAtLocation: () => symbol }),
      },
      esTreeNodeToTSNodeMap: { get: (n: unknown) => n },
    };
    const { listeners, reports } = createWithParserServices(
      defaultRule,
      services,
    );
    const node = {
      type: 'ImportDefaultSpecifier',
      parent: {
        type: 'ImportDeclaration',
        importKind: 'value',
        source: { type: 'Literal', value: 'mod' },
      },
    };
    (
      listeners.ImportDefaultSpecifier as (n: unknown) => void
    )(node);
    expect(reports).toEqual([]);
  });

  it('does not report when module exports contain a default', () => {
    const source = { type: 'Literal', value: 'mod' };
    const node = {
      type: 'ImportDefaultSpecifier',
      parent: { type: 'ImportDeclaration', importKind: 'value', source },
    };
    const moduleSymbol = { exports: new Map([['default', {}]]) };
    const services = {
      program: {
        getTypeChecker: () => ({
          getSymbolAtLocation: (tsNode: unknown) =>
            tsNode === source ? moduleSymbol : undefined,
        }),
      },
      esTreeNodeToTSNodeMap: { get: (n: unknown) => n },
    };
    const { listeners, reports } = createWithParserServices(
      defaultRule,
      services,
    );
    (
      listeners.ImportDefaultSpecifier as (n: unknown) => void
    )(node);
    expect(reports).toEqual([]);
  });

  it('reports when module exports lack a default export', () => {
    const source = { type: 'Literal', value: 'mod' };
    const node = {
      type: 'ImportDefaultSpecifier',
      parent: { type: 'ImportDeclaration', importKind: 'value', source },
    };
    const moduleSymbol = { exports: new Map([['named', {}]]) };
    const services = {
      program: {
        getTypeChecker: () => ({
          getSymbolAtLocation: (tsNode: unknown) =>
            tsNode === source ? moduleSymbol : undefined,
        }),
      },
      esTreeNodeToTSNodeMap: { get: (n: unknown) => n },
    };
    const { listeners, reports } = createWithParserServices(
      defaultRule,
      services,
    );
    (
      listeners.ImportDefaultSpecifier as (n: unknown) => void
    )(node);
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ messageId: 'noDefaultExport' });
  });
});

// ---------------------------------------------------------------------------
// dynamic-import-chunkname
// ---------------------------------------------------------------------------
ruleTester.run('dynamic-import-chunkname (coverage)', dynamicImportChunkname, {
  valid: [],
  invalid: [
    {
      name: 'comment present but without webpackChunkName → missing chunk name',
      code: `const p = import(/* not-a-chunk-comment */ './mod');`,
      errors: [
        {
          messageId: 'missingChunkName',
          suggestions: [
            {
              messageId: 'suggestChunkName',
              output: `const p = import(/* not-a-chunk-comment */ /* webpackChunkName: "mod" */ './mod');`,
            },
          ],
        },
      ],
    },
  ],
});

describe('dynamic-import-chunkname — Layer 2 (suggestion fix)', () => {
  const fixer = {
    insertTextBefore: (node: unknown, text: string) => ({
      node,
      text,
    }),
  } as unknown as TSESLint.RuleFixer;

  function getSuggestionFix(sourceNode: unknown) {
    const { listeners, reports } = createWithMockContext(
      dynamicImportChunkname,
    );
    (listeners.ImportExpression as (n: unknown) => void)({
      type: 'ImportExpression',
      source: sourceNode,
    });
    expect(reports).toHaveLength(1);
    const report = reports[0] as unknown as {
      messageId: string;
      suggest: { fix: (f: TSESLint.RuleFixer) => unknown }[];
    };
    expect(report.messageId).toBe('missingChunkName');
    return report.suggest[0].fix(fixer);
  }

  it('suggestion fix returns null for a non-literal import source', () => {
    expect(getSuggestionFix({ type: 'Identifier', name: 'dynamicPath' })).toBe(
      null,
    );
  });

  it('suggestion fix sanitizes the chunk name from the import path', () => {
    expect(getSuggestionFix({ type: 'Literal', value: './pages/user.page' }))
      .toMatchObject({ text: '/* webpackChunkName: "user-page" */ ' });
  });

  it('suggestion fix falls back to "chunk" for an empty import path', () => {
    expect(getSuggestionFix({ type: 'Literal', value: '' })).toMatchObject({
      text: '/* webpackChunkName: "chunk" */ ',
    });
  });
});

// ---------------------------------------------------------------------------
// enforce-dependency-direction
// ---------------------------------------------------------------------------
ruleTester.run(
  'enforce-dependency-direction (coverage)',
  enforceDependencyDirection,
  {
    valid: [
      {
        name: 'source layer not in configured layers → skipped',
        code: `import x from '../domain/entity';`,
        filename: 'src/ui/panel.ts',
      },
      {
        name: 'same-layer import allowed by default',
        code: `import x from '../domain/other';`,
        filename: 'src/domain/entity.ts',
      },
      {
        name: 'dynamic import with non-literal source is skipped',
        code: `const mod = 'x'; const p = import(mod);`,
        filename: 'src/domain/entity.ts',
      },
    ],
    invalid: [
      {
        name: 'custom layers+layerPatterns of non-default length',
        code: `import shell from '../shell/api';`,
        filename: 'src/core/service.ts',
        options: [{ layers: ['core', 'shell'], layerPatterns: ['core', 'shell'] }],
        errors: [{ messageId: 'dependencyDirectionViolation' }],
      },
      {
        name: 'slash-containing pattern resolved via regex fallback',
        code: `import btn from '../shared/ui/button';`,
        filename: 'src/domain/service.ts',
        options: [
          {
            layers: ['domain', 'shared/ui'],
            layerPatterns: ['domain', 'shared/ui'],
          },
        ],
        errors: [{ messageId: 'dependencyDirectionViolation' }],
      },
      {
        name: 'dynamic import with literal source is checked',
        code: `const p = import('../presentation/view');`,
        filename: 'src/domain/entity.ts',
        errors: [{ messageId: 'dependencyDirectionViolation' }],
      },
    ],
  },
);

describe('enforce-dependency-direction — Layer 2', () => {
  it('falls back to default layers when the options object is falsy', () => {
    const { listeners, reports } = createWithMockContext(
      enforceDependencyDirection,
      { options: [0], filename: 'src/domain/entity.ts' },
    );
    // Defaults still apply: presentation depends downward on domain → report.
    (listeners.ImportDeclaration as (n: unknown) => void)({
      type: 'ImportDeclaration',
      source: { type: 'Literal', value: '../presentation/view' },
    });
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      messageId: 'dependencyDirectionViolation',
      data: { sourceLayer: 'domain', targetLayer: 'presentation' },
    });
  });

  it('ignores synthetic nodes that are neither import declarations nor expressions', () => {
    const { listeners, reports } = createWithMockContext(
      enforceDependencyDirection,
      { filename: 'src/domain/entity.ts' },
    );
    (listeners.ImportDeclaration as (n: unknown) => void)({
      type: 'CallExpression',
    });
    expect(reports).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// enforce-import-order
// ---------------------------------------------------------------------------
ruleTester.run('enforce-import-order (coverage)', enforceImportOrder, {
  valid: [
    {
      name: 'file without imports is skipped',
      code: `const x = 1;`,
    },
    {
      name: 'alphabetize order "ignore" keeps original order within a group',
      code: `import b from 'bbb';\nimport a from 'aaa';`,
      options: [{ alphabetize: { order: 'ignore' } }],
    },
  ],
  invalid: [
    {
      name: 'side-effect import sorted after builtin',
      code: `import './styles.css';\nimport fs from 'fs';`,
      errors: [{ messageId: 'importOrder' }],
      output: `import fs from 'fs';\n\nimport './styles.css';`,
    },
    {
      name: './index import sorted after builtin',
      code: `import idx from './index';\nimport fs from 'fs';`,
      errors: [{ messageId: 'importOrder' }],
      output: `import fs from 'fs';\n\nimport idx from './index';`,
    },
    {
      name: 'empty internalPatterns → alias imports treated as external',
      code: `import b from '@app/b';\nimport a from '@app/a';`,
      options: [{ internalPatterns: [] }],
      errors: [{ messageId: 'importOrder' }],
      output: `import a from '@app/a';\nimport b from '@app/b';`,
    },
    {
      name: 'import type missing from groups gets rank 999',
      code: `import z from 'zzz';\nimport fs from 'fs';`,
      options: [{ groups: ['builtin'] }],
      errors: [{ messageId: 'importOrder' }],
      output: `import fs from 'fs';\n\nimport z from 'zzz';`,
    },
    {
      name: 'case-sensitive alphabetization',
      code: `import x from 'b';\nimport y from 'a';`,
      options: [{ alphabetize: { order: 'asc', caseInsensitive: false } }],
      errors: [{ messageId: 'importOrder' }],
      output: `import y from 'a';\nimport x from 'b';`,
    },
    {
      name: 'descending alphabetization',
      code: `import a from 'aaa';\nimport b from 'bbb';`,
      options: [{ alphabetize: { order: 'desc' } }],
      errors: [{ messageId: 'importOrder' }],
      output: `import b from 'bbb';\nimport a from 'aaa';`,
    },
    {
      name: 'newlinesBetween "never" collapses group separator lines',
      code: `import fs from 'fs';\n\nimport a from 'aaa';`,
      options: [{ newlinesBetween: 'never' }],
      errors: [{ messageId: 'importOrder' }],
      output: `import fs from 'fs';\nimport a from 'aaa';`,
    },
    {
      name: 'leading comment on the first import moves with it',
      code: `// header\nimport z from 'zzz';\nimport fs from 'fs';`,
      errors: [{ messageId: 'importOrder' }],
      output: `import fs from 'fs';\n\n// header\nimport z from 'zzz';`,
    },
    {
      name: 'comment between imports attaches to the following import',
      code: `import z from 'zzz';\n// mid\nimport fs from 'fs';`,
      errors: [{ messageId: 'importOrder' }],
      output: `// mid\nimport fs from 'fs';\n\nimport z from 'zzz';`,
    },
    {
      name: 'stray semicolon after the last import is preserved',
      code: `import z from 'zzz';\nimport fs from 'fs';;`,
      errors: [{ messageId: 'importOrder' }],
      output: `import fs from 'fs';;\n\nimport z from 'zzz';`,
    },
    {
      name: 'trailing same-line comment extends the import range',
      code: `import z from 'zzz'; // zc\nimport fs from 'fs';`,
      errors: [{ messageId: 'importOrder' }],
      output: `// zc\nimport fs from 'fs';\n\nimport z from 'zzz'; // zc`,
    },
  ],
});

// ---------------------------------------------------------------------------
// enforce-team-boundaries
// ---------------------------------------------------------------------------
const teamOptions = {
  teams: [
    {
      team: 'alpha',
      paths: ['src/alpha/**'],
    },
    {
      team: 'beta',
      paths: ['src/beta/**'],
      publicPackages: ['@company/beta-sdk'],
    },
    {
      team: 'gamma',
      paths: ['src/gamma/**'],
      allowedDependencies: ['beta'],
    },
  ],
  sharedPaths: [],
  allowExternalPackages: true,
};

ruleTester.run('enforce-team-boundaries (coverage)', enforceTeamBoundaries, {
  valid: [
    {
      name: 'alias import treated as internal but unowned → allowed',
      code: `import x from '~/utils/helper';`,
      filename: 'src/alpha/feature.ts',
      options: [teamOptions],
    },
    {
      name: 'same-team import via team path',
      code: `import x from 'src/alpha/other';`,
      filename: 'src/alpha/feature.ts',
      options: [teamOptions],
    },
    {
      name: 'allowed dependency team import',
      code: `import x from 'src/beta/module';`,
      filename: 'src/gamma/feature.ts',
      options: [teamOptions],
    },
    {
      name: 'dynamic import with non-literal source is ignored',
      code: `const m = 'x'; const p = import(m);`,
      filename: 'src/alpha/feature.ts',
      options: [teamOptions],
    },
    {
      name: 'require with non-string literal argument is ignored',
      code: `const x = require(123);`,
      filename: 'src/alpha/feature.ts',
      options: [teamOptions],
    },
    {
      name: 'require with no arguments is ignored',
      code: `const x = require();`,
      filename: 'src/alpha/feature.ts',
      options: [teamOptions],
    },
    {
      name: 'require with non-literal argument is ignored',
      code: `const p = 'x'; const x = require(p);`,
      filename: 'src/alpha/feature.ts',
      options: [teamOptions],
    },
    {
      name: 'non-require call expressions are ignored',
      code: `load('src/beta/module');`,
      filename: 'src/alpha/feature.ts',
      options: [teamOptions],
    },
    {
      name: 'member-expression calls are ignored',
      code: `loader.require('src/beta/module');`,
      filename: 'src/alpha/feature.ts',
      options: [teamOptions],
    },
    {
      name: 'dynamic import of a non-string literal is ignored',
      code: `const p = import(123);`,
      filename: 'src/alpha/feature.ts',
      options: [teamOptions],
    },
    {
      name: 'public package import resolves to owning team, allowed via allowedDependencies',
      code: `import sdk from '@company/beta-sdk';`,
      filename: 'src/gamma/feature.ts',
      options: [{ ...teamOptions, allowExternalPackages: false }],
    },
  ],
  invalid: [
    {
      name: 'dynamic import crossing team boundary',
      code: `const p = import('src/beta/internal');`,
      filename: 'src/alpha/feature.ts',
      options: [teamOptions],
      errors: [{ messageId: 'unauthorizedTeamImport' }],
    },
    {
      name: 'require crossing team boundary (team without allowedDependencies)',
      code: `const x = require('src/beta/internal');`,
      filename: 'src/alpha/feature.ts',
      options: [teamOptions],
      errors: [{ messageId: 'unauthorizedTeamImport' }],
    },
  ],
});

describe('enforce-team-boundaries — Layer 2', () => {
  it('ignores an ImportDeclaration whose source value is not a string', () => {
    const { listeners, reports } = createWithMockContext(
      enforceTeamBoundaries,
      {
        filename: 'src/alpha/feature.ts',
        options: [teamOptions],
      },
    );
    (listeners.ImportDeclaration as (n: unknown) => void)({
      type: 'ImportDeclaration',
      source: { type: 'Literal', value: 123 },
    });
    expect(reports).toEqual([]);
  });

  it('ignores synthetic nodes of unrelated types', () => {
    const { listeners, reports } = createWithMockContext(
      enforceTeamBoundaries,
      {
        filename: 'src/alpha/feature.ts',
        options: [teamOptions],
      },
    );
    (listeners.ImportDeclaration as (n: unknown) => void)({
      type: 'Identifier',
      name: 'x',
    });
    expect(reports).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// export
// ---------------------------------------------------------------------------
ruleTester.run('export (coverage)', exportRule, {
  valid: [
    {
      name: 'destructuring export declarators are skipped',
      code: `const obj = { a: 1 }; export const { a } = obj;`,
    },
    {
      name: 'string-literal export name is tracked',
      code: `const foo = 1; export { foo as "string name" };`,
    },
  ],
  invalid: [
    {
      name: 'duplicate string-literal export name',
      code: `const foo = 1; const bar = 2; export { foo as "dup" }; export { bar as "dup" };`,
      errors: [{ messageId: 'duplicateExport' }],
    },
  ],
});

describe('export — Layer 2 (synthetic declarations)', () => {
  it('skips named function/class declarations without an id', () => {
    const { listeners, reports } = createWithMockContext(exportRule);
    (listeners.ExportNamedDeclaration as (n: unknown) => void)({
      type: 'ExportNamedDeclaration',
      declaration: { type: 'FunctionDeclaration', id: null },
      specifiers: [],
    });
    expect(reports).toEqual([]);
  });

  it('skips TS enum declarations without an id', () => {
    const { listeners, reports } = createWithMockContext(exportRule);
    (listeners.ExportNamedDeclaration as (n: unknown) => void)({
      type: 'ExportNamedDeclaration',
      declaration: { type: 'TSEnumDeclaration', id: null },
      specifiers: [],
    });
    expect(reports).toEqual([]);
  });

  it('ignores declaration types outside the tracked set', () => {
    const { listeners, reports } = createWithMockContext(exportRule);
    (listeners.ExportNamedDeclaration as (n: unknown) => void)({
      type: 'ExportNamedDeclaration',
      declaration: { type: 'TSModuleDeclaration' },
      specifiers: [],
    });
    expect(reports).toEqual([]);
  });
});
