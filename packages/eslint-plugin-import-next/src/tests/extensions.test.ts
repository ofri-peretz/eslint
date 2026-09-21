import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { extensions } from '../rules/extensions';

/**
 * A REAL directory on disk, because one case below is about RESOLUTION rather
 * than about syntax: `./width.js` is how a `.ts` file must spell its sibling
 * `width.ts` under `moduleResolution: NodeNext`, and the rule can only know the
 * extension is load-bearing by resolving it. Written at module scope because
 * RuleTester builds its case table when `run()` is called.
 */
const nodeNextDir = fs.mkdtempSync(
  path.join(os.tmpdir(), 'extensions-nodenext-'),
);
fs.writeFileSync(
  path.join(nodeNextDir, 'width.ts'),
  'export const width = 1;\n',
);
// A file whose extension really IS `.js`, so both spellings name it and the
// extension is decoration — the bundler user this rule exists for.
fs.writeFileSync(path.join(nodeNextDir, 'real.js'), 'export const real = 1;\n');
// A file the shortened specifier cannot name at all: `./only` resolves to
// nothing, so `.mjs` is carrying the resolution.
fs.writeFileSync(
  path.join(nodeNextDir, 'only.mjs'),
  'export const only = 1;\n',
);
const nodeNextImporter = path.join(nodeNextDir, 'yargs.ts');
afterAll(() => {
  fs.rmSync(nodeNextDir, { recursive: true, force: true });
});

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

      // Every other case in this file passes explicit `options`, so none of them
      // exercised the path a consumer who just enables the rule actually takes.
      // `defaultOptions` declares `svg`/`png`/`jpg` as `always`, but `create`
      // took only `context` — the merged options the devkit factory passes as a
      // SECOND argument (rule-creator.ts: `create(context, applyDefault(…))`)
      // were dropped on the floor. A stale local fallback map, a 7-of-10 copy of
      // `defaultOptions` missing exactly these three keys, won instead, so an
      // asset import fell through to `default: 'never'` and was reported and
      // stripped: `./logo.svg` → `./logo`.
      {
        name: 'the declared defaults govern when no options are configured, so an asset extension is kept',
        code: [
          "import logo from './logo.svg';",
          "import shot from './shot.png';",
          "import photo from './photo.jpg';",
        ].join('\n'),
      },

      // `{ default: 'always' }` is the obvious way to configure this rule for
      // ESM, and it was a no-op: the rule took `pattern` as a WHOLE object, so a
      // user who set only `default` got the package's own map, whose
      // `js: 'never'` then beat their `default`. The only configuration that
      // worked was `{ pattern: { js: 'always' } }`, which no documentation asks
      // for. `default` now governs every extension the user did not name in
      // `pattern`; a key they did name still wins.
      //
      // burgee provenance: 213 such specifiers across 69 files — e.g.
      // packages/burgee/src/yargs.ts:10 (`'./yargs/factory.js'`) and
      // packages/bellpull/src/cross-spawn.ts:56 (`'./ambient.js'`) — under
      // tsconfig.base.json:4-5,10 (NodeNext + `verbatimModuleSyntax: true`).
      // Stripping any of them is a build break, so the escape hatch has to work.
      {
        name: 'a user-supplied default governs an extension they did not name in pattern',
        code: "import { width } from './width.js';",
        options: [{ default: 'always' }],
      },

      // The fixer produced specifiers that do not resolve. Measured on burgee:
      // as authored, `tsc` exits 0 with zero TS2835; after
      // `import-next/extensions --fix`, it exits 2 with 207 TS2835 ("Relative
      // import paths need explicit file extensions…") plus runtime
      // ERR_MODULE_NOT_FOUND. Upstream eslint-plugin-import ships no fixer at
      // all AND guards the report on resolvability
      // (lib/rules/extensions.js:231). This case restores that guard: the
      // extension in `./width.js` is not the extension of the file it names
      // (`width.ts`), so it is an emit-facing extension the loader requires —
      // and removing it is not a style change, it is a break.
      {
        name: 'an extension the resolver proves is load-bearing is left alone even when the pattern says never',
        code: "import { width } from './width.js';",
        filename: nodeNextImporter,
        options: [{ pattern: { js: 'never' } }],
      },
      {
        name: 'an extension the shortened specifier cannot resolve without is left alone',
        code: "import { only } from './only.mjs';",
        filename: nodeNextImporter,
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

      // RECALL for the resolvability guard above. When the file on disk really
      // is `real.js`, both `./real.js` and `./real` name it, so the extension is
      // decoration and removing it changes nothing about what loads — the
      // bundler user this rule is a complement for (ROADMAP.md:479). A guard
      // that withheld here would have turned a false positive into a rule that
      // does nothing.
      {
        name: 'an extension both spellings resolve to the same file is still reported and fixed',
        code: "import { real } from './real.js';",
        output: "import { real } from './real';",
        filename: nodeNextImporter,
        options: [{ pattern: { js: 'never' } }],
        errors: [{ messageId: 'unexpectedExtension' }],
      },
    ],
  });
});
