import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { extensions } from '../rules/extensions';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('extensions', () => {
  ruleTester.run('extensions', extensions, {
    valid: [
      {
        name: 'no extension',
        code: "import foo from './foo';",
        options: [{ pattern: { js: 'never' } }],
      },
      {
        code: "import data from './data.json';",
        options: [{ pattern: { json: 'always' } }],
      },
      {
        name: 'an export-from already in the configured style',
        code: "export { foo } from './foo';",
        options: [{ pattern: { js: 'never' } }],
      },
      {
        name: 'an export with no source to check',
        code: 'const foo = 1;\nexport { foo };',
        options: [{ pattern: { js: 'never' } }],
      },
      // `import(expr)` takes any expression. A template or a variable carries no
      // specifier the rule can read or rewrite, so it is left alone — the same guard
      // the sibling resolution rules use.
      {
        name: 'a dynamic import of a template literal',
        code: 'const m = await import(`./${name}.js`);',
        options: [{ pattern: { js: 'never' } }],
      },
      {
        name: 'a dynamic import of a variable specifier',
        code: 'const m = await import(specifier);',
        options: [{ pattern: { js: 'never' } }],
      },
      {
        name: 'a dynamic import of a bare package name',
        code: "const m = await import('node:path');",
        options: [{ pattern: { js: 'never' } }],
      },
    ],
    invalid: [
      {
        name: 'an explicit .js extension where the configured style omits it',
        code: "import foo from './foo.js';",
        output: "import foo from './foo';",
        options: [{ pattern: { js: 'never' } }],
        errors: [{ messageId: 'unexpectedExtension' }],
      },
      {
        code: "import data from './data';",
        options: [{ pattern: { json: 'always' }, default: 'always' }], // Default always triggers missing extension check
        errors: [{ messageId: 'missingExtension' }],
      },

      // burgee sweep: packages/burgee/src/commander.ts:6 vs :10 surfaced this. The rule
      // only visited ImportDeclaration, so the *identical* specifier was reported on the
      // import and silent on the re-export one line below — leaving a file that is less
      // consistent after --fix than before it. Sibling rules in this package
      // (no-unresolved, no-internal-modules) already check both export-from forms.
      {
        name: 'an explicit .js extension on an export-from',
        code: "export { foo } from './foo.js';",
        output: "export { foo } from './foo';",
        options: [{ pattern: { js: 'never' } }],
        errors: [{ messageId: 'unexpectedExtension' }],
      },
      {
        name: 'an explicit .js extension on an export-star',
        code: "export * from './foo.js';",
        output: "export * from './foo';",
        options: [{ pattern: { js: 'never' } }],
        errors: [{ messageId: 'unexpectedExtension' }],
      },
      {
        name: 'a missing extension on an export-from when the style requires one',
        code: "export { foo } from './data';",
        options: [{ pattern: { json: 'always' }, default: 'always' }],
        errors: [{ messageId: 'missingExtension' }],
      },

      // burgee sweep: packages/burgee/src/cli.ts:25 vs :172. The same defect one node
      // type over — `await import('./dev.js')` sits below static imports of the same
      // shape that the rule does report, so after --fix the static form reads './dev'
      // and the dynamic form still reads './dev.js'. Sibling rules in this package
      // (no-unresolved, no-internal-modules, no-useless-path-segments) already visit
      // ImportExpression.
      {
        name: 'an explicit .js extension on a dynamic import',
        code: "const m = await import('./foo.js');",
        output: "const m = await import('./foo');",
        options: [{ pattern: { js: 'never' } }],
        errors: [{ messageId: 'unexpectedExtension' }],
      },
      {
        name: 'a missing extension on a dynamic import when the style requires one',
        code: "const m = await import('./data');",
        options: [{ pattern: { json: 'always' }, default: 'always' }],
        errors: [{ messageId: 'missingExtension' }],
      },
    ],
  });
});
