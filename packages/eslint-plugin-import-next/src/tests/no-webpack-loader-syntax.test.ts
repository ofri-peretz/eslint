/**
 * Tests for no-webpack-loader-syntax: a `!` in a module specifier configures
 * webpack loaders inline.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noWebpackLoaderSyntax } from '../rules/no-webpack-loader-syntax';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('no-webpack-loader-syntax', noWebpackLoaderSyntax, {
  valid: [
    { name: 'a package import', code: `import _ from 'lodash';` },
    { name: 'a stylesheet import', code: `import './foo.css';` },
    {
      name: 'a scoped package subpath',
      code: `import data from '@scope/my-package/data.json';`,
    },
    { name: 'a plain require', code: `const foo = require('./foo');` },
    {
      name: 'a runtime specifier names nothing',
      code: `const load = (m) => require(m);`,
    },
    {
      name: 'require with two arguments is not a module load',
      code: `const x = require('style!a', 1);`,
    },
    {
      name: 'a method named require is not the global',
      code: `const x = loader.require('style!a');`,
    },
    {
      name: 'an export without a source loads nothing',
      code: `const a = 1; export { a };`,
    },
    {
      name: 'import x = Namespace.member is not a module specifier',
      code: `namespace A { export const b = 1; }\nimport x = A.b;`,
    },
  ],
  invalid: [
    {
      name: 'a loader chain in an import',
      code: `import foo from 'style!css!./foo.css';`,
      errors: [{ messageId: 'loaderSyntax' }],
    },
    {
      name: 'a loader prefix in require()',
      code: `const find = require('-babel-loader!lodash.find');`,
      errors: [{ messageId: 'loaderSyntax' }],
    },
    {
      name: 'a loader in a static template literal',
      code: 'const data = require(`json!@scope/my-package/data.json`);',
      errors: [{ messageId: 'loaderSyntax' }],
    },
    {
      name: 'a loader in a re-export',
      code: `export { a } from 'babel!./a';`,
      errors: [{ messageId: 'loaderSyntax' }],
    },
    {
      name: 'a loader in export *',
      code: `export * from 'babel!./a';`,
      errors: [{ messageId: 'loaderSyntax' }],
    },
    {
      name: 'a loader in a dynamic import',
      code: `const m = import('raw!./a.txt');`,
      errors: [{ messageId: 'loaderSyntax' }],
    },
    {
      name: 'a loader in TS import = require()',
      code: `import a = require('raw!./a.txt');`,
      errors: [{ messageId: 'loaderSyntax' }],
    },
  ],
});
