/**
 * Tests for no-deprecated on imports: the other module is read through
 * TypeScript, so this suite builds a real program through `projectService`
 * and its cases get the type-aware budget (see type-aware-timeout.lock.test.ts).
 *
 * Fidelity: benchmarks/suites/fidelity/models/import-next/no_deprecated.qnt.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll, expect } from 'vitest';
import parser from '@typescript-eslint/parser';
import * as path from 'node:path';
import { noDeprecated } from '../rules/no-deprecated';
import * as api from '../files/deprecated-api';

const TYPE_AWARE_CASE_TIMEOUT_MS = 120_000;

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = (text, callback) =>
  it(text, callback, TYPE_AWARE_CASE_TIMEOUT_MS);

const typedRuleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      tsconfigRootDir: path.resolve(__dirname, '../../'),
      projectService: {
        allowDefaultProject: ['src/*.ts'],
        defaultProject: 'tsconfig.json',
      },
    },
  },
});

/** Imports of deprecated exports, read through TypeScript. */
typedRuleTester.run('no-deprecated — fidelity (imports)', noDeprecated, {
  valid: [
    {
      name: 'importing an export that is not deprecated',
      code: `import { newApi } from './files/deprecated-api.ts';\nnewApi();`,
      filename: 'src/valid_deprecated.ts',
    },
    {
      name: 'an allowed deprecated import',
      code: `import { oldApi } from './files/deprecated-api.ts';\noldApi();`,
      filename: 'src/valid_deprecated.ts',
      options: [{ allow: ['oldApi'] }],
    },
    {
      name: 'an import from a module that does not resolve is unknown',
      code: `import { gone } from './files/missing.ts';\ngone();`,
      filename: 'src/valid_deprecated.ts',
    },
    {
      name: 'a member of a plain object is not a namespace export',
      code: `const o = { oldApi: 1 };\nexport const v = o.oldApi;`,
      filename: 'src/valid_deprecated.ts',
    },
    {
      name: 'checkDecorators: false ignores a decorator mark',
      code: `import { OldWidget } from './files/deprecated-api.ts';\nnew OldWidget();`,
      filename: 'src/valid_deprecated.ts',
      options: [{ checkDecorators: false }],
    },
    {
      name: 'checkJSDoc: false ignores a JSDoc mark',
      code: `import { oldApi } from './files/deprecated-api.ts';\noldApi();`,
      filename: 'src/valid_deprecated.ts',
      options: [{ checkJSDoc: false }],
    },
    {
      name: 'a namespace read of a name the module does not export',
      code: `import * as api from './files/deprecated-api.ts';\nexport const v = api.missingThing;\nexport const w = api.newApi;`,
      filename: 'src/valid_deprecated.ts',
    },
    {
      name: 'a namespace read with a runtime key, or of an allowed name',
      code: `import * as api from './files/deprecated-api.ts';\nexport const f = (k: 'newApi') => api[k];\nexport const g = api.oldApi;`,
      filename: 'src/valid_deprecated.ts',
      options: [{ allow: ['oldApi'] }],
    },
    {
      name: 'importing a class with no decorators and no JSDoc',
      code: `import { PlainWidget } from './files/deprecated-api.ts';\nnew PlainWidget();`,
      filename: 'src/valid_deprecated.ts',
    },
  ],
  invalid: [
    {
      name: 'a default import of a deprecated default export',
      code: `import legacy from './files/deprecated-api.ts';\nlegacy();`,
      filename: 'src/invalid_deprecated.ts',
      errors: [{ messageId: 'deprecatedImport' }],
    },
    {
      name: "the string-literal spelling import { 'oldApi' as o }",
      code: `import { 'oldApi' as o } from './files/deprecated-api.ts';\no();`,
      filename: 'src/invalid_deprecated.ts',
      errors: [{ messageId: 'deprecatedImport' }],
    },
    {
      name: 'importing a class marked with a @deprecated decorator',
      code: `import { OldWidget } from './files/deprecated-api.ts';\nnew OldWidget();`,
      filename: 'src/invalid_deprecated.ts',
      errors: [{ messageId: 'deprecatedImport' }],
    },
    {
      name: 'importing a class marked with a @deprecated() decorator call',
      code: `import { OldGadget } from './files/deprecated-api.ts';\nnew OldGadget();`,
      filename: 'src/invalid_deprecated.ts',
      errors: [{ messageId: 'deprecatedImport' }],
    },
    {
      name: 'importing a deprecated export',
      code: `import { oldApi } from './files/deprecated-api.ts';\noldApi();`,
      filename: 'src/invalid_deprecated.ts',
      errors: [{ messageId: 'deprecatedImport' }],
    },
    {
      name: 'reading a deprecated export through a namespace import',
      code: `import * as api from './files/deprecated-api.ts';\napi.oldApi();`,
      filename: 'src/invalid_deprecated.ts',
      errors: [{ messageId: 'deprecatedExport' }],
    },
  ],
});

describe('deprecated-api fixture', () => {
  it('is a loadable module (its exports are what the cases import)', () => {
    api.oldApi();
    api.newApi();
    api.default();
    expect(new api.PlainWidget()).toBeInstanceOf(api.PlainWidget);
    expect(new api.OldWidget()).toBeInstanceOf(api.OldWidget);
    expect(new api.OldGadget()).toBeInstanceOf(api.OldGadget);
  });
});
