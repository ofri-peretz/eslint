/**
 * Tests for no-relative-packages rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noRelativePackages } from '../rules/no-relative-packages';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

/**
 * A workspace on disk: `app` and `other` are packages; `tools` has a nameless
 * package.json and `app/src/esm` a `{"type":"module"}` scope marker, neither
 * of which is a package anyone imports by name.
 */
const ROOT = fs.realpathSync(
  fs.mkdtempSync(path.join(os.tmpdir(), 'relative-packages-')),
);
const FILES: Record<string, string> = {
  'repo/package.json': '{ "name": "monorepo", "private": true }',
  'repo/packages/app/package.json': '{ "name": "app" }',
  'repo/packages/app/src/util.ts': 'export const a = 1;',
  'repo/packages/app/src/esm/package.json': '{ "type": "module" }',
  'repo/packages/app/src/esm/y.ts': 'export const a = 1;',
  'repo/packages/other/package.json': '{ "name": "other" }',
  'repo/packages/other/src/x.ts': 'export const a = 1;',
  'repo/packages/tools/package.json': '{ "private": true }',
  'repo/packages/tools/src/x.ts': 'export const a = 1;',
};
for (const [rel, text] of Object.entries(FILES)) {
  fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, rel), text);
}
const APP = path.join(ROOT, 'repo/packages/app/src/app.ts');
const ESM_APP = path.join(ROOT, 'repo/packages/app/src/esm/app.ts');
afterAll(() => fs.rmSync(ROOT, { recursive: true, force: true }));

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
    },
  },
});

// The no-relative-packages rule requires filesystem access to detect package boundaries.
// In RuleTester, we primarily test valid cases and rule structure.
ruleTester.run('no-relative-packages', noRelativePackages, {
  valid: [
    // Package imports (not relative) - always valid
    { code: `import foo from 'foo';` },
    { code: `import bar from '@scope/bar';` },
    { code: `import lodash from 'lodash';` },
    
    // Local relative imports within same package context
    { code: `import utils from './utils';` },
    { code: `import helper from '../helpers/helper';` },
    
    // Node.js builtins
    { code: `import fs from 'node:fs';` },
    { code: `import path from 'node:path';` },
    
    // Absolute paths
    { code: `import abs from '/absolute/path';` },
    
    // Scoped packages
    { code: `import { util } from '@myorg/utils';` },
    { code: `import { component } from '@myorg/ui';` },
    
    // CommonJS require with package names
    { code: `const express = require('express');` },
    { code: `const lodash = require('lodash');` },
    
    // Dynamic imports with package names
    { code: `const pkg = await import('some-package');` },
  ],
  
  invalid: [],
});

// Test allowSamePackage option structure
ruleTester.run('no-relative-packages - options', noRelativePackages, {
  valid: [
    // With allowSamePackage: true (default)
    {
      code: `import foo from './foo';`,
      options: [{ allowSamePackage: true }],
    },
    
    // With allowSamePackage: false, still needs filesystem context
    {
      code: `import bar from '@scope/bar';`,
      options: [{ allowSamePackage: false }],
    },
  ],
  
  invalid: [],
});

// Found by the fidelity model (benchmarks/suites/fidelity/models/import-next/
// no_relative_packages): nameless package.json files were treated as package
// boundaries, and re-exports / `import = require()` were not read.
ruleTester.run('no-relative-packages - fidelity', noRelativePackages, {
  valid: [
    {
      name: 'importing across a {"type":"module"} scope marker stays in the package',
      code: `import a from './esm/y';`,
      filename: APP,
    },
    {
      name: 'importing out of a scope marker stays in the package',
      code: `import a from '../util';`,
      filename: ESM_APP,
    },
    {
      name: 'a folder with a nameless package.json is not a package to import by name',
      code: `import a from '../../tools/src/x';`,
      filename: APP,
    },
    {
      name: 'export { a } without a source loads nothing',
      code: `const a = 1;\nexport { a };`,
      filename: APP,
    },
    {
      name: 'import x = Namespace.member is not a module specifier',
      code: `namespace A { export const b = 1; }\nimport x = A.b;`,
      filename: APP,
    },
    {
      name: 'allowSamePackage: false does not report imports inside one package',
      code: `import a from './util';`,
      filename: APP,
      options: [{ allowSamePackage: false }],
    },
  ],
  invalid: [
    {
      name: 'export { a } from another package',
      code: `export { a } from '../../other/src/x';`,
      output: `export { a } from 'other/src/x';`,
      filename: APP,
      errors: [{ messageId: 'relativePackage' }],
    },
    {
      name: 'export * from another package',
      code: `export * from '../../other/src/x';`,
      output: `export * from 'other/src/x';`,
      filename: APP,
      errors: [{ messageId: 'relativePackage' }],
    },
    {
      name: 'TS import x = require() from another package',
      code: `import a = require('../../other/src/x');`,
      output: `import a = require('other/src/x');`,
      filename: APP,
      errors: [{ messageId: 'relativePackage' }],
    },
    {
      name: 'the other package root itself is imported by its name',
      code: `import a from '../../other';`,
      output: `import a from 'other';`,
      filename: APP,
      errors: [{ messageId: 'relativePackage', data: { importPath: '../../other', packageName: 'other' } }],
    },
  ],
});
