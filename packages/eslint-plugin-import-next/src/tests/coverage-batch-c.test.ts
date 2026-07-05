/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Dual-layer coverage tests — batch C
 * (no-default-export, no-deprecated, no-duplicates, no-empty-named-blocks,
 *  no-extraneous-dependencies, no-full-package-import, no-internal-modules,
 *  no-legacy-imports, no-mutable-exports, no-named-as-default-member,
 *  no-named-as-default, no-named-default, no-named-export)
 *
 * Layer 1: RuleTester fixtures through the real parser (including on-disk
 * package.json fixtures for the dependency rules).
 * Layer 2: raw unit tests with synthetic AST nodes via createWithMockContext.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, expect, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import type { TSESLint } from '@interlace/eslint-devkit';
import { createWithMockContext } from '@interlace/eslint-devkit';

import { noDefaultExport } from '../rules/no-default-export';
import { noDeprecated } from '../rules/no-deprecated';
import { noDuplicates } from '../rules/no-duplicates';
import { noEmptyNamedBlocks } from '../rules/no-empty-named-blocks';
import { noExtraneousDependencies } from '../rules/no-extraneous-dependencies';
import { noFullPackageImport } from '../rules/no-full-package-import';
import { noInternalModules } from '../rules/no-internal-modules';
import { noLegacyImports } from '../rules/no-legacy-imports';
import { noMutableExports } from '../rules/no-mutable-exports';
import { noNamedAsDefaultMember } from '../rules/no-named-as-default-member';
import { noNamedAsDefault } from '../rules/no-named-as-default';
import { noNamedDefault } from '../rules/no-named-default';
import { noNamedExport } from '../rules/no-named-export';

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
// On-disk fixtures for package.json-reading rules
// ---------------------------------------------------------------------------
const fixtureRoot = fs.mkdtempSync(path.join(tmpdir(), 'import-next-cov-'));

const explicitPkgJson = path.join(fixtureRoot, 'explicit-package.json');
fs.writeFileSync(
  explicitPkgJson,
  JSON.stringify({ dependencies: { 'pkg-a': '1.0.0' } }),
);

const autoPkgDir = path.join(fixtureRoot, 'auto-pkg');
fs.mkdirSync(path.join(autoPkgDir, 'src'), { recursive: true });
fs.writeFileSync(
  path.join(autoPkgDir, 'package.json'),
  JSON.stringify({ dependencies: { 'pkg-b': '1.0.0' } }),
);

const brokenPkgDir = path.join(fixtureRoot, 'broken-pkg');
fs.mkdirSync(path.join(brokenPkgDir, 'src'), { recursive: true });
fs.writeFileSync(path.join(brokenPkgDir, 'package.json'), '{ not-json');

// ---------------------------------------------------------------------------
// no-default-export
// ---------------------------------------------------------------------------
ruleTester.run('no-default-export (coverage)', noDefaultExport, {
  valid: [
    {
      name: 'glob allowInFiles pattern',
      code: `const x = 1; export default x;`,
      filename: 'src/legacy/file.ts',
      options: [{ allowInFiles: ['*legacy*'] }],
    },
    {
      name: 'substring allowInFiles pattern',
      code: `const x = 1; export default x;`,
      filename: 'src/legacy/file.ts',
      options: [{ allowInFiles: ['legacy'] }],
    },
    {
      name: 'glob allowPatterns pattern',
      code: `const x = 1; export default x;`,
      filename: 'src/page.stories.ts',
      options: [{ allowPatterns: ['*stories*'] }],
    },
    {
      name: 'substring allowPatterns pattern',
      code: `const x = 1; export default x;`,
      filename: 'src/page.stories.ts',
      options: [{ allowPatterns: ['stories'] }],
    },
    {
      name: 'export { default } re-export allowed in allowed file',
      code: `export { default } from './m';`,
      filename: 'src/legacy/file.ts',
      options: [{ allowInFiles: ['legacy'] }],
    },
    {
      name: 'export-assignment allowed in allowed file',
      code: `const v = 1; export = v;`,
      filename: 'src/legacy/file.ts',
      options: [{ allowInFiles: ['legacy'] }],
    },
  ],
  invalid: [
    {
      name: 'TS export assignment is reported',
      code: `const v = 1; export = v;`,
      errors: [{ messageId: 'defaultExportRefactor' }],
    },
    {
      name: 'suggestion text suppressed when suggestNamed is off',
      code: `export default 1;`,
      options: [{ suggestNamed: false }],
      errors: [{ messageId: 'defaultExport' }],
      output: `const defaultExport = 1;\nexport { defaultExport };`,
    },
  ],
});

describe('no-default-export — Layer 2', () => {
  const fixer = {
    replaceText: (_n: unknown, text: string) => ({ text }),
  } as unknown as TSESLint.RuleFixer;

  function runExportDefault(sourceText: string, declaration: unknown) {
    const { listeners, reports } = createWithMockContext(noDefaultExport, {
      sourceText,
    });
    (listeners.ExportDefaultDeclaration as (n: unknown) => void)({
      type: 'ExportDefaultDeclaration',
      declaration,
    });
    expect(reports).toHaveLength(1);
    return reports[0] as unknown as {
      messageId: string;
      data: Record<string, string>;
      fix: (f: TSESLint.RuleFixer) => { text: string };
    };
  }

  it('anonymous default function suggests a generated name', () => {
    const report = runExportDefault('export default function() {}', {
      type: 'FunctionDeclaration',
      id: null,
    });
    expect(report.data.example).toBe('// Convert to: export { defaultFunction };');
    expect(report.fix(fixer)).toMatchObject({ text: 'export function() {}' });
  });

  it('anonymous default class suggests a generated name', () => {
    const report = runExportDefault('export default class {}', {
      type: 'ClassDeclaration',
      id: null,
    });
    expect(report.data.example).toBe('// Convert to: export { DefaultClass };');
    expect(report.fix(fixer)).toMatchObject({ text: 'export class {}' });
  });

  it('reports even when the filename is empty', () => {
    const { listeners, reports } = createWithMockContext(noDefaultExport, {
      filename: '',
    });
    (listeners.ExportDefaultDeclaration as (n: unknown) => void)({
      type: 'ExportDefaultDeclaration',
      declaration: { type: 'Identifier', name: 'x' },
    });
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ messageId: 'defaultExport' });
  });

  it('tolerates synthetic named-export nodes without specifiers', () => {
    const { listeners, reports } = createWithMockContext(noDefaultExport);
    (listeners.ExportNamedDeclaration as (n: unknown) => void)({
      type: 'ExportNamedDeclaration',
      specifiers: null,
    });
    expect(reports).toEqual([]);
  });

  it('skips type-alias declarations under a default export wrapper', () => {
    const { listeners, reports } = createWithMockContext(noDefaultExport);
    (listeners.TSTypeAliasDeclaration as (n: unknown) => void)({
      type: 'TSTypeAliasDeclaration',
      parent: { type: 'ExportDefaultDeclaration' },
    });
    expect(reports).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// no-deprecated
// ---------------------------------------------------------------------------
ruleTester.run('no-deprecated (coverage)', noDeprecated, {
  valid: [
    {
      name: 'JSDoc without deprecation marker registers nothing',
      code: `/** just docs */\nconst a = 1;\nfoo(a);`,
    },
    {
      name: 'line comments are not JSDoc',
      code: `// @deprecated\nconst a = 1;\nfoo(a);`,
    },
    {
      name: 'checkJSDoc off disables JSDoc detection',
      code: `/** @deprecated use b instead */\nconst a = 1;\nfoo(a);`,
      options: [{ checkJSDoc: false }],
    },
    {
      name: 'checkDecorators off disables decorator detection',
      code: `@deprecated\nclass Old {}\nconst i = new Old();`,
      options: [{ checkDecorators: false }],
    },
    {
      name: 'destructured declarations are not tracked',
      code: `/** @deprecated gone */\nconst { a } = obj;\nfoo(a);`,
    },
    {
      name: 'default-exported anonymous class has no id to track',
      code: `export default class {}`,
    },
    {
      name: 'computed method keys are not tracked',
      code: `class C { ['m']() { return 1; } }`,
    },
    {
      name: 'deprecated name as member property is not the deprecated object',
      code: `/** @deprecated use newFn instead */\nconst oldFn = 1;\nconsole.log(win.oldFn);`,
    },
    {
      name: 'non-matching decorators register nothing',
      code: `@other\nclass Fine {}\nconst i = new Fine();`,
    },
  ],
  invalid: [
    {
      name: 'reason text without use/replaced-by pattern',
      code: `/** @deprecated no longer maintained */\nconst oldApi = 1;\nfoo(oldApi);`,
      errors: [{ messageId: 'deprecatedUsage' }],
    },
    {
      name: 'identifier-form deprecated decorator',
      code: `@deprecated\nclass Old {}\nconst i = new Old();`,
      errors: [{ messageId: 'deprecatedUsage' }],
    },
    {
      name: 'call-form deprecated decorator',
      code: `@deprecated('legacy')\nclass Old2 {}\nconst i = new Old2();`,
      errors: [{ messageId: 'deprecatedUsage' }],
    },
    {
      name: 'deprecated exported function usage',
      code: `/** @deprecated use newFn instead */\nexport function oldFn() {}\nregister(oldFn);`,
      errors: [
        {
          messageId: 'deprecatedUsage',
          suggestions: [
            {
              messageId: 'deprecatedUsage',
              output: `/** @deprecated use newFn instead */\nexport function oldFn() {}\nregister(newFn);`,
            },
          ],
        },
      ],
    },
    {
      name: 'deprecated exported class usage',
      code: `/** @deprecated use NewClass instead */\nexport class OldClass {}\nconst i = new OldClass();`,
      errors: [
        {
          messageId: 'deprecatedUsage',
          suggestions: [
            {
              messageId: 'deprecatedUsage',
              output: `/** @deprecated use NewClass instead */\nexport class OldClass {}\nconst i = NewClass;`,
            },
          ],
        },
      ],
    },
    {
      name: 'deprecated export specifier usage',
      code: `const a = 1;\n/** @deprecated gone for good */\nexport { a };\nfoo(a);`,
      errors: [{ messageId: 'deprecatedUsage' }],
    },
  ],
});

describe('no-deprecated — Layer 2', () => {
  it('returns no listeners when the filename is empty', () => {
    const { listeners } = createWithMockContext(noDeprecated, {
      filename: '',
    });
    expect(Object.keys(listeners)).toEqual([]);
  });

  it('reads deprecation info from node.leadingComments', () => {
    const { listeners, reports } = createWithMockContext(noDeprecated);
    (listeners.VariableDeclaration as (n: unknown) => void)({
      type: 'VariableDeclaration',
      leadingComments: [
        { type: 'Block', value: '* @deprecated use newThing instead ' },
      ],
      declarations: [
        { type: 'VariableDeclarator', id: { type: 'Identifier', name: 'legacyVar' } },
      ],
    });
    (listeners.CallExpression as (n: unknown) => void)({
      type: 'CallExpression',
      callee: { type: 'Identifier', name: 'legacyVar' },
      arguments: [],
    });
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ messageId: 'deprecatedUsage' });
  });

  it('tolerates synthetic export nodes without specifiers', () => {
    const { listeners, reports } = createWithMockContext(noDeprecated);
    (listeners.ExportNamedDeclaration as (n: unknown) => void)({
      type: 'ExportNamedDeclaration',
      declaration: null,
      specifiers: null,
    });
    expect(reports).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// no-duplicates
// ---------------------------------------------------------------------------
ruleTester.run('no-duplicates (coverage)', noDuplicates, {
  valid: [],
  invalid: [
    {
      name: 'namespace imports are too complex to merge',
      code: `import * as a from 'm';\nimport { b } from 'm';`,
      errors: [{ messageId: 'noDuplicates' }],
      output: null,
    },
    {
      name: 'two default imports cannot be merged',
      code: `import a from 'm';\nimport b from 'm';`,
      errors: [{ messageId: 'noDuplicates' }],
      output: null,
    },
    {
      name: 'duplicate side-effect import is removed',
      code: `import { a } from 'm';\nimport 'm';`,
      errors: [{ messageId: 'noDuplicates' }],
      output: `import { a } from 'm';\n`,
    },
    {
      name: 'side-effect first import cannot absorb specifiers',
      code: `import 'm';\nimport { a } from 'm';`,
      errors: [{ messageId: 'noDuplicates' }],
      output: null,
    },
  ],
});

// ---------------------------------------------------------------------------
// no-empty-named-blocks — Layer 2 (namespace + empty braces is unparseable)
// ---------------------------------------------------------------------------
describe('no-empty-named-blocks — Layer 2', () => {
  it('namespace import with stray empty braces in text is not reported', () => {
    const { listeners, reports } = createWithMockContext(noEmptyNamedBlocks, {
      sourceText: `import * as ns, {} from 'm';`,
    });
    (listeners.ImportDeclaration as (n: unknown) => void)({
      type: 'ImportDeclaration',
      specifiers: [{ type: 'ImportNamespaceSpecifier' }],
      source: { type: 'Literal', value: 'm' },
    });
    expect(reports).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// no-extraneous-dependencies
// ---------------------------------------------------------------------------
ruleTester.run(
  'no-extraneous-dependencies (coverage)',
  noExtraneousDependencies,
  {
    valid: [
      {
        name: 'explicit packageJsonPath with declared dependency',
        code: `import a from 'pkg-a';`,
        options: [{ packageJsonPath: explicitPkgJson }],
      },
      {
        name: 'unreadable packageJsonPath skips the rule',
        code: `import missing from 'not-declared-anywhere';`,
        options: [
          { packageJsonPath: path.join(fixtureRoot, 'nope', 'package.json') },
        ],
      },
      {
        name: 'auto-discovered package.json with declared dependency',
        code: `import b from 'pkg-b';`,
        filename: path.join(autoPkgDir, 'src', 'file.ts'),
      },
      {
        name: 'no package.json found anywhere up the tree',
        code: `import missing from 'not-declared-anywhere';`,
        filename: path.join(fixtureRoot, 'orphan.ts'),
      },
      {
        name: 'auto-discovered package.json with invalid JSON skips the rule',
        code: `import missing from 'not-declared-anywhere';`,
        filename: path.join(brokenPkgDir, 'src', 'file.ts'),
      },
      {
        name: 'absolute-path imports are skipped',
        code: `import abs from '/opt/tool';`,
        options: [{ packageJson: {} }],
      },
      {
        name: 'workspace strategy allows workspace-scoped packages',
        code: `import u from '@workspace/utils';`,
        options: [
          { packageJson: { dependencies: {} }, resolutionStrategy: 'workspace' },
        ],
      },
      {
        name: 'monorepo strategy allows company-scoped packages',
        code: `import u from '@company/utils';`,
        options: [
          { packageJson: { dependencies: {} }, resolutionStrategy: 'monorepo' },
        ],
      },
      {
        name: 'devDependencies-only manifest is honored',
        code: `import d from 'pkg-dev';`,
        options: [{ packageJson: { devDependencies: { 'pkg-dev': '1.0.0' } } }],
      },
      {
        name: 'require with non-string literal is ignored',
        code: `const x = require(42);`,
        options: [{ packageJson: {} }],
      },
      {
        name: 'dynamic import with non-literal source is ignored',
        code: `const m = 'x'; const p = import(m);`,
        options: [{ packageJson: {} }],
      },
    ],
    invalid: [
      {
        name: 'workspace strategy still flags unknown packages',
        code: `import u from 'totally-unknown-pkg';`,
        options: [
          { packageJson: { dependencies: {} }, resolutionStrategy: 'workspace' },
        ],
        errors: [
          {
            messageId: 'missingDependency',
            suggestions: [
              {
                messageId: 'addToDependencies',
                output: `// TODO: Run: npm install totally-unknown-pkg\nimport u from 'totally-unknown-pkg';`,
              },
              {
                messageId: 'addToDevDependencies',
                output: `// TODO: Run: npm install --save-dev totally-unknown-pkg\nimport u from 'totally-unknown-pkg';`,
              },
            ],
          },
        ],
      },
      {
        name: 'more than five allowed packages elides the list',
        code: `import u from 'unknown-pkg';`,
        options: [
          {
            packageJson: {
              dependencies: {
                d1: '1',
                d2: '1',
                d3: '1',
                d4: '1',
                d5: '1',
                d6: '1',
              },
            },
          },
        ],
        errors: [
          {
            messageId: 'missingDependency',
            suggestions: [
              {
                messageId: 'addToDependencies',
                output: `// TODO: Run: npm install unknown-pkg\nimport u from 'unknown-pkg';`,
              },
              {
                messageId: 'addToDevDependencies',
                output: `// TODO: Run: npm install --save-dev unknown-pkg\nimport u from 'unknown-pkg';`,
              },
            ],
          },
        ],
      },
      {
        name: 'dev dependency in production code with suggestion',
        code: `import d from 'pkg-dev';`,
        options: [
          {
            packageJson: { devDependencies: { 'pkg-dev': '1.0.0' } },
            devDependencies: false,
          },
        ],
        errors: [
          {
            messageId: 'devDependencyInProduction',
            suggestions: [
              {
                messageId: 'moveToDependencies',
                output: `// TODO: Move pkg-dev from devDependencies to dependencies in package.json\nimport d from 'pkg-dev';`,
              },
            ],
          },
        ],
      },
      {
        name: 'missing dependency suggestions insert TODO comments',
        code: `import u from 'unknown-pkg';`,
        options: [{ packageJson: { dependencies: {} } }],
        errors: [
          {
            messageId: 'missingDependency',
            suggestions: [
              {
                messageId: 'addToDependencies',
                output: `// TODO: Run: npm install unknown-pkg\nimport u from 'unknown-pkg';`,
              },
              {
                messageId: 'addToDevDependencies',
                output: `// TODO: Run: npm install --save-dev unknown-pkg\nimport u from 'unknown-pkg';`,
              },
            ],
          },
        ],
      },
    ],
  },
);

describe('no-extraneous-dependencies — Layer 2', () => {
  it('returns no listeners when the filename is empty', () => {
    const { listeners } = createWithMockContext(noExtraneousDependencies, {
      filename: '',
      options: [{ packageJson: {} }],
    });
    expect(Object.keys(listeners)).toEqual([]);
  });

  it('suggestion fixes fall back to the reported node without a parent chain', () => {
    const { listeners, reports } = createWithMockContext(
      noExtraneousDependencies,
      { options: [{ packageJson: { dependencies: {} } }] },
    );
    (listeners.ImportDeclaration as (n: unknown) => void)({
      type: 'ImportDeclaration',
      source: { type: 'Literal', value: 'unknown-pkg', parent: undefined },
    });
    expect(reports).toHaveLength(1);
    const report = reports[0] as unknown as {
      suggest: { fix: (f: TSESLint.RuleFixer) => { text: string } }[];
    };
    const fixer = {
      insertTextBefore: (_n: unknown, text: string) => ({ text }),
    } as unknown as TSESLint.RuleFixer;
    expect(report.suggest[0].fix(fixer)).toMatchObject({
      text: `// TODO: Run: npm install unknown-pkg\n`,
    });
    expect(report.suggest[1].fix(fixer)).toMatchObject({
      text: `// TODO: Run: npm install --save-dev unknown-pkg\n`,
    });
  });

  it('dev-dependency suggestion falls back without a parent chain', () => {
    const { listeners, reports } = createWithMockContext(
      noExtraneousDependencies,
      {
        options: [
          {
            packageJson: { devDependencies: { 'pkg-dev': '1.0.0' } },
            devDependencies: false,
          },
        ],
      },
    );
    (listeners.ImportDeclaration as (n: unknown) => void)({
      type: 'ImportDeclaration',
      source: { type: 'Literal', value: 'pkg-dev', parent: undefined },
    });
    expect(reports).toHaveLength(1);
    const report = reports[0] as unknown as {
      suggest: { fix: (f: TSESLint.RuleFixer) => { text: string } }[];
    };
    const fixer = {
      insertTextBefore: (_n: unknown, text: string) => ({ text }),
    } as unknown as TSESLint.RuleFixer;
    expect(report.suggest[0].fix(fixer)).toMatchObject({
      text: `// TODO: Move pkg-dev from devDependencies to dependencies in package.json\n`,
    });
  });

  it('ignores import declarations with non-string sources', () => {
    const { listeners, reports } = createWithMockContext(
      noExtraneousDependencies,
      { options: [{ packageJson: { dependencies: {} } }] },
    );
    (listeners.ImportDeclaration as (n: unknown) => void)({
      type: 'ImportDeclaration',
      source: { type: 'Literal', value: 42 },
    });
    expect(reports).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// no-full-package-import
// ---------------------------------------------------------------------------
ruleTester.run('no-full-package-import (coverage)', noFullPackageImport, {
  valid: [],
  invalid: [
    {
      name: 'custom blocked package without example uses the fallback text',
      code: `import * as h from 'huge-lib';`,
      options: [
        {
          blockedPackages: [
            { name: 'huge-lib', suggestion: 'import huge-lib/slim instead' },
          ],
        },
      ],
      errors: [{ messageId: 'fullPackageImport' }],
    },
  ],
});

describe('no-full-package-import — Layer 2', () => {
  it('treats a falsy options object as defaults and skips non-string sources', () => {
    const { listeners, reports } = createWithMockContext(noFullPackageImport, {
      options: [0],
    });
    (listeners.ImportDeclaration as (n: unknown) => void)({
      type: 'ImportDeclaration',
      source: { type: 'Literal', value: 42 },
      specifiers: [],
    });
    expect(reports).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// no-internal-modules
// ---------------------------------------------------------------------------
ruleTester.run('no-internal-modules (coverage)', noInternalModules, {
  valid: [
    {
      name: 'local exports without a source are ignored',
      code: `export const x = 1;`,
    },
    {
      name: 'non-require call expressions are ignored',
      code: `load('lodash/fp/get/extra');`,
    },
    {
      name: 'require with non-string literal is ignored',
      code: `const x = require(42);`,
    },
    {
      name: 'dynamic import with non-literal source is ignored',
      code: `const m = 'x'; const p = import(m);`,
    },
  ],
  invalid: [
    {
      name: 'autofix strategy rewrites deep require to the package root',
      code: `const x = require('lodash/fp/get/extra');`,
      options: [{ strategy: 'autofix' }],
      errors: [{ messageId: 'internalModuleImport' }],
      output: `const x = require('lodash');`,
    },
    {
      name: 'suggest strategy offers public API and barrel paths',
      code: `const x = require('lodash/fp/get/extra');`,
      options: [{ strategy: 'suggest' }],
      errors: [
        {
          messageId: 'internalModuleImport',
          suggestions: [
            {
              messageId: 'suggestPublicApi',
              output: `const x = require('lodash');`,
            },
            {
              messageId: 'suggestBarrelExport',
              output: `const x = require('lodash/fp/get');`,
            },
          ],
        },
      ],
    },
  ],
});

describe('no-internal-modules — Layer 2', () => {
  it('ignores synthetic nodes with non-string sources', () => {
    const { listeners, reports } = createWithMockContext(noInternalModules);
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
// no-legacy-imports
// ---------------------------------------------------------------------------
const legacyExactOptions = {
  mappings: [{ deprecated: '(', replacement: 'modern-lib' }],
};

ruleTester.run('no-legacy-imports (coverage)', noLegacyImports, {
  valid: [
    {
      name: 'dynamic import with non-literal source is ignored',
      code: `const m = 'x'; const p = import(m);`,
      options: [legacyExactOptions],
    },
    {
      name: 'dynamic import of non-string literal is ignored',
      code: `const p = import(null);`,
      options: [legacyExactOptions],
    },
    {
      name: 'non-require calls are ignored',
      code: `load('legacy-lib');`,
      options: [legacyExactOptions],
    },
    {
      name: 'require with non-string literal is ignored',
      code: `const x = require(42);`,
      options: [legacyExactOptions],
    },
  ],
  invalid: [
    {
      name: 'invalid regex falls back to exact matching',
      code: `import x from '(';`,
      options: [legacyExactOptions],
      errors: [{ messageId: 'legacyImport' }],
      output: `import x from 'modern-lib';`,
    },
    {
      name: 'invalid regex falls back to prefix matching',
      code: `import x from '(sub/path';`,
      options: [legacyExactOptions],
      errors: [{ messageId: 'legacyImport' }],
      output: `import x from 'modern-lib';`,
    },
    {
      name: 'mapping without reason or deadline uses empty placeholders',
      code: `import x from 'old-lib';`,
      options: [
        { mappings: [{ deprecated: '^old-lib$', replacement: 'new-lib' }] },
      ],
      errors: [{ messageId: 'legacyImport' }],
      output: `import x from 'new-lib';`,
    },
  ],
});

describe('no-legacy-imports — Layer 2', () => {
  it('ignores import declarations with non-string sources', () => {
    const { listeners, reports } = createWithMockContext(noLegacyImports, {
      options: [legacyExactOptions],
    });
    (listeners.ImportDeclaration as (n: unknown) => void)({
      type: 'ImportDeclaration',
      source: { type: 'Literal', value: 42 },
    });
    expect(reports).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// no-mutable-exports
// ---------------------------------------------------------------------------
ruleTester.run('no-mutable-exports (coverage)', noMutableExports, {
  valid: [
    {
      name: 'allowInFiles suppresses reports',
      code: `export let x = 1;`,
      filename: 'src/generated/file.ts',
      options: [{ allowInFiles: ['generated'] }],
    },
    {
      name: 'const declarations are never mutable exports',
      code: `const c = 1; export { c };`,
    },
  ],
  invalid: [
    {
      name: 'object pattern with rest element flags each binding',
      code: `const src = { a: 1, b: 2 }; export let { a, ...rest } = src;`,
      errors: [{ messageId: 'letExport' }, { messageId: 'letExport' }],
    },
    {
      name: 'array pattern with holes flags present elements',
      code: `const arr = [1, 2, 3]; export let [first, , third] = arr;`,
      errors: [{ messageId: 'letExport' }, { messageId: 'letExport' }],
    },
    {
      name: 'let exported later via specifier is flagged',
      code: `let mut = 1;\nexport { mut };`,
      errors: [{ messageId: 'letExport' }],
    },
  ],
});

describe('no-mutable-exports — Layer 2', () => {
  it('returns no listeners when the filename is empty', () => {
    const { listeners } = createWithMockContext(noMutableExports, {
      filename: '',
    });
    expect(Object.keys(listeners)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// no-named-as-default-member
// ---------------------------------------------------------------------------
ruleTester.run(
  'no-named-as-default-member (coverage)',
  noNamedAsDefaultMember,
  {
    valid: [
      {
        name: 'namespace specifiers are not tracked',
        code: `import * as ns from 'm'; ns.x;`,
      },
      {
        name: 'multiple named imports from one source accumulate',
        code: `import { a, b } from 'm'; a(); b();`,
      },
      {
        name: 'string-literal import names are tracked by value',
        code: `import { "s-name" as s } from 'm'; s();`,
      },
      {
        name: 'member access on call results is ignored',
        code: `foo().bar;`,
      },
      {
        name: 'computed member access on default import is ignored',
        code: `import def from 'm'; const k = 'a'; def[k];`,
      },
      {
        name: 'member access on non-import identifiers is ignored',
        code: `import def from 'm'; other.prop;`,
      },
    ],
    invalid: [],
  },
);

describe('no-named-as-default-member — Layer 2', () => {
  it('skips non-computed member access with a non-identifier property', () => {
    const { listeners, reports } = createWithMockContext(
      noNamedAsDefaultMember,
    );
    (listeners.ImportDeclaration as (n: unknown) => void)({
      type: 'ImportDeclaration',
      source: { type: 'Literal', value: 'm' },
      specifiers: [
        {
          type: 'ImportDefaultSpecifier',
          local: { type: 'Identifier', name: 'def' },
        },
      ],
    });
    (listeners.MemberExpression as (n: unknown) => void)({
      type: 'MemberExpression',
      computed: false,
      object: { type: 'Identifier', name: 'def' },
      property: { type: 'Literal', value: 'x' },
    });
    expect(reports).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// no-named-as-default
// ---------------------------------------------------------------------------
ruleTester.run('no-named-as-default (coverage)', noNamedAsDefault, {
  valid: [
    {
      name: 'type-alias exports are not tracked as names',
      code: `export type T = number;`,
    },
    {
      name: 'destructured export declarators are skipped',
      code: `const obj = { d: 1 }; export const { d } = obj;`,
    },
    {
      name: 'string-literal export names are skipped',
      code: `const foo = 1; export { foo as "s-name" };`,
    },
    {
      name: 'string-literal import names do not collide with default alias',
      code: `import def, { "s" as x } from 'm';`,
    },
  ],
  invalid: [],
});

// ---------------------------------------------------------------------------
// no-named-default
// ---------------------------------------------------------------------------
ruleTester.run('no-named-default (coverage)', noNamedDefault, {
  valid: [
    {
      name: 'string-literal non-default import name is fine',
      code: `import { "s-name" as s } from 'm';`,
    },
  ],
  invalid: [
    {
      name: 'string-literal "default" import name is flagged',
      code: `import { "default" as d } from 'm';`,
      errors: [{ messageId: 'namedDefault' }],
    },
  ],
});

// ---------------------------------------------------------------------------
// no-named-export
// ---------------------------------------------------------------------------
ruleTester.run('no-named-export (coverage)', noNamedExport, {
  valid: [
    {
      name: 'glob allowPatterns match',
      code: `export const x = 1;`,
      filename: 'src/pages/index.ts',
      options: [{ allowPatterns: ['**/pages/**'] }],
    },
    {
      name: 'substring allowPatterns match',
      code: `export const x = 1;`,
      filename: 'src/pages/index.ts',
      options: [{ allowPatterns: ['pages'] }],
    },
    {
      name: 'glob allowInFiles match',
      code: `export const x = 1;`,
      filename: 'src/pages/index.ts',
      options: [{ allowInFiles: ['**/pages/**'] }],
    },
    {
      name: 're-exporting as default is allowed',
      code: `const x = 1; export { x as default };`,
    },
    {
      name: 'empty export statement is ignored',
      code: `export {};`,
    },
    {
      name: 'named function allowed via allowNames',
      code: `export function allowedFn() {}`,
      options: [{ allowNames: ['allowedFn'] }],
    },
  ],
  invalid: [
    {
      name: 'destructured export declarators are reported',
      code: `const obj = { a: 1 }; export const { a } = obj;`,
      errors: [{ messageId: 'namedExport' }],
    },
  ],
});

describe('no-named-export — Layer 2', () => {
  it('reports even when the filename is empty', () => {
    const { listeners, reports } = createWithMockContext(noNamedExport, {
      filename: '',
    });
    (listeners.ExportNamedDeclaration as (n: unknown) => void)({
      type: 'ExportNamedDeclaration',
      exportKind: 'value',
      declaration: null,
      specifiers: [
        {
          type: 'ExportSpecifier',
          exportKind: 'value',
          exported: { type: 'Identifier', name: 'x' },
        },
      ],
    });
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ messageId: 'namedExport' });
  });
});
