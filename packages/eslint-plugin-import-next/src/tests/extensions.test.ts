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
      // A dot in a filename is not an extension. `path.extname` cannot tell the two
      // apart, so `config`, `v2`, `setup` and `d` all read as extensions and the
      // fixer strips them — rewriting the specifier to a DIFFERENT module. burgee
      // surfaces this shape at packages/*/vitest.config.ts:5, which imports
      // '../../vitest-coverage.config.js'.
      // The rule declares `defaultOptions` with svg/png/jpg at 'always', but read
      // its options from `context.options` (raw) instead of the merged options the
      // factory supplies, so that block never applied and a hardcoded in-`create`
      // table won instead. Stripping an asset extension breaks the import outright.
      {
        name: 'an asset extension is kept under the shipped defaults',
        code: "import logo from './logo.svg';",
      },
      // Same cause, second symptom: a partial `pattern` replaced the whole default
      // table rather than merging into it, so json fell through to `default`.
      {
        name: 'a partial pattern does not discard the default table',
        code: "import data from './data.json';",
        options: [{ pattern: { vue: 'always' } }],
      },
      {
        name: 'a dotted but extensionless specifier is not an extension',
        code: "import cfg from './source.config';",
      },
      {
        name: 'a versioned filename is not an extension',
        code: "import v from './schema.v2';",
      },
      // Same file, one config over: an unknown token is only left alone while the
      // user has not claimed it. Listing it in `pattern` opts back in.
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

      // A specifier whose name still carries a dot after the extension comes off is
      // a compound name, not a clean strip: `./types.d.ts` -> `./types.d` -> `./types`
      // across --fix passes, and `./a.min.js` -> `./a`. Both name a different module
      // than the source did. Report, but refuse the rewrite.
      {
        name: 'a compound .d.ts name is reported without a fix',
        code: "import x from './types.d.ts';",
        output: null,
        options: [{ pattern: { ts: 'never' } }],
        errors: [{ messageId: 'unexpectedExtension' }],
      },
      {
        name: 'a compound .min.js name is reported without a fix',
        code: "import x from './a.min.js';",
        output: null,
        options: [{ pattern: { js: 'never' } }],
        errors: [{ messageId: 'unexpectedExtension' }],
      },
      // The fixer hardcoded single quotes and never escaped, so a double-quoted
      // specifier containing an apostrophe fixed to unparseable output, and every
      // double-quoted specifier was silently reflowed to single quotes.
      {
        name: 'a double-quoted specifier keeps its quote style through the fix',
        code: 'import x from "./utils.js";',
        output: 'import x from "./utils";',
        options: [{ pattern: { js: 'never' } }],
        errors: [{ messageId: 'unexpectedExtension' }],
      },
      // `ext` is measured on the DECODED `source.value` but the rewrite slices the
      // RAW token, so an escape anywhere in the extension makes the arithmetic
      // overrun: './utils\u002ejs' fixed to '"./utils\u002"', which is not a
      // valid escape and does not parse. Report, but refuse the rewrite.
      {
        name: 'an escaped dot in the extension is reported without a fix',
        code: 'import x from "./utils\\u002ejs";',
        output: null,
        options: [{ pattern: { js: 'never' } }],
        errors: [{ messageId: 'unexpectedExtension' }],
      },
      {
        name: 'an apostrophe in the path survives the fix',
        code: 'import x from "./o\'s-utils.js";',
        output: 'import x from "./o\'s-utils";',
        options: [{ pattern: { js: 'never' } }],
        errors: [{ messageId: 'unexpectedExtension' }],
      },
    ],
  });
});
