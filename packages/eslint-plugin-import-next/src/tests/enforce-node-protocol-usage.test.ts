/**
 * Tests for enforce-node-protocol-usage: eslint-plugin-import's rule, with
 * its `'always'` / `'never'` option.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, expect, it } from 'vitest';
import { Linter } from 'eslint';
import parser from '@typescript-eslint/parser';
import { enforceNodeProtocolUsage } from '../rules/enforce-node-protocol-usage';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run(
  'enforce-node-protocol-usage: always',
  enforceNodeProtocolUsage,
  {
    valid: [
      {
        name: 'a builtin already written with the scheme',
        code: `import fs from 'node:fs';`,
        options: ['always'],
      },
      {
        name: 'an npm package is not a builtin',
        code: `import unicorn from 'unicorn';`,
        options: ['always'],
      },
      {
        name: 'a relative file named like a builtin',
        code: `import fs from './fs';`,
        options: ['always'],
      },
      {
        name: '`punycode/` is the documented way to load the npm package',
        code: `import 'punycode/';`,
        options: ['always'],
      },
      {
        name: 'a builtin subpath already written with the scheme',
        code: `const fs = require('node:fs/promises');`,
        options: ['always'],
        settings: { 'import/node-version': '16.0.0' },
      },
      {
        name: 'a runtime specifier names nothing',
        code: `async function f(fs) { return import(fs); }`,
        options: ['always'],
      },
      {
        name: 'a template literal is left alone, as eslint-plugin-import does',
        code: 'const fs = require(`fs`);',
        options: ['always'],
      },
      {
        name: 'a non-string argument names nothing',
        code: `async function f() { return import(0); }`,
        options: ['always'],
      },
      {
        name: 'require.resolve is not a module load',
        code: `const p = require.resolve('fs');`,
        options: ['always'],
      },
      {
        name: 'a method named require is not the global',
        code: `const fs = foo.require('fs');`,
        options: ['always'],
      },
      {
        name: 'an optional call is not a static require',
        code: `const fs = require?.('fs');`,
        options: ['always'],
      },
      {
        name: 'require with two arguments is not a static require',
        code: `const fs = require('fs', extra);`,
        options: ['always'],
      },
      {
        name: 'a spread argument names nothing',
        code: `const fs = require(...['fs']);`,
        options: ['always'],
      },
      {
        name: 'an export without a source loads nothing',
        code: `const a = 1; export { a };`,
        options: ['always'],
      },
    ],
    invalid: [
      {
        name: 'a bare builtin import',
        code: `import fs from 'fs';`,
        output: `import fs from 'node:fs';`,
        options: ['always'],
        errors: [{ messageId: 'requireNodeProtocol' }],
      },
      {
        name: 'a bare builtin subpath in require()',
        code: `const fsp = require("fs/promises");`,
        output: `const fsp = require("node:fs/promises");`,
        options: ['always'],
        errors: [{ messageId: 'requireNodeProtocol' }],
      },
      {
        name: 'a re-export of a builtin',
        code: `export { promises } from 'fs';`,
        output: `export { promises } from 'node:fs';`,
        options: ['always'],
        errors: [{ messageId: 'requireNodeProtocol' }],
      },
      {
        name: 'TS import = require() of a builtin',
        code: `import fs = require('fs');`,
        output: `import fs = require('node:fs');`,
        options: ['always'],
        errors: [{ messageId: 'requireNodeProtocol' }],
      },
      {
        name: 'export * from a builtin',
        code: `export * from 'path';`,
        output: `export * from 'node:path';`,
        options: ['always'],
        errors: [{ messageId: 'requireNodeProtocol' }],
      },
      {
        name: 'a dynamic import of a builtin',
        code: `async function f() { return import('child_process'); }`,
        output: `async function f() { return import('node:child_process'); }`,
        options: ['always'],
        errors: [{ messageId: 'requireNodeProtocol' }],
      },
    ],
  },
);

ruleTester.run('enforce-node-protocol-usage: never', enforceNodeProtocolUsage, {
  valid: [
    {
      name: 'a bare builtin under never',
      code: `import fs from 'fs';`,
      options: ['never'],
    },
    {
      name: 'a scheme-only builtin keeps its scheme: `test` is another module',
      code: `const test = require('node:test');`,
      options: ['never'],
      settings: { 'import/node-version': '16.0.0' },
    },
    {
      name: 'node: on something that is not a builtin is not judged',
      code: `import x from 'node:unicorn';`,
      options: ['never'],
    },
  ],
  invalid: [
    {
      name: 'a builtin import with the scheme',
      code: `import x from 'node:fs';`,
      output: `import x from 'fs';`,
      options: ['never'],
      settings: { 'import/node-version': '16.0.0' },
      errors: [{ messageId: 'forbidNodeProtocol' }],
    },
    {
      name: 'a builtin subpath re-export with the scheme',
      code: `export { default } from "node:fs/promises";`,
      output: `export { default } from "fs/promises";`,
      options: ['never'],
      errors: [{ messageId: 'forbidNodeProtocol' }],
    },
    {
      name: 'a builtin require with the scheme',
      code: `const { promises } = require('node:fs');`,
      output: `const { promises } = require('fs');`,
      options: ['never'],
      errors: [{ messageId: 'forbidNodeProtocol' }],
    },
    {
      name: 'a side-effect import with the scheme',
      code: `import 'node:timers/promises';`,
      output: `import 'timers/promises';`,
      options: ['never'],
      errors: [{ messageId: 'forbidNodeProtocol' }],
    },
  ],
});

describe('enforce-node-protocol-usage: settings and options', () => {
  const lint = (settings: Record<string, unknown>, options: unknown[]) =>
    new Linter({ configType: 'flat' }).verify(`import fs from 'fs';`, {
      plugins: {
        i: {
          rules: { 'enforce-node-protocol-usage': enforceNodeProtocolUsage },
        },
      },
      settings,
      rules: { 'i/enforce-node-protocol-usage': ['error', ...options] },
    } as never);

  it('refuses an import/node-version that is not a semver string', () => {
    expect(() => lint({ 'import/node-version': '16' }, ['always'])).toThrow(
      /import\/node-version/,
    );
    expect(() => lint({ 'import/node-version': 16 }, ['always'])).toThrow(
      /import\/node-version/,
    );
  });

  it('requires the mode, as eslint-plugin-import does', () => {
    expect(() => lint({}, [])).toThrow(/should NOT have fewer than 1 items/);
  });
});
