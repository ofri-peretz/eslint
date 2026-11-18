/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `no-extraneous-dependencies` under eslint-plugin-import's options, with
 * its meaning.
 *
 * `packageDir`, the dependency-kind switches written as glob lists,
 * `includeInternal` and `includeTypes` were rejected, so a config carried
 * over from `import/no-extraneous-dependencies` failed to load (32 of
 * eslint-plugin-import's own cases, graded by
 * benchmarks/suites/ilb-competitor-parity/import-drop-in.mts). The
 * `import/core-modules` setting and an object-form `bundledDependencies`
 * were not honoured either.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { noExtraneousDependencies } from '../rules/no-extraneous-dependencies';

const dir = fs.realpathSync(
  fs.mkdtempSync(path.join(os.tmpdir(), 'extraneous-upstream-')),
);
const write = (name: string, text: string) => {
  fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
  fs.writeFileSync(path.join(dir, name), text);
};
write(
  'pkg/package.json',
  JSON.stringify({
    name: 'pkg',
    dependencies: { dep: '1' },
    devDependencies: { devdep: '1' },
    optionalDependencies: { optdep: '1' },
    peerDependencies: { peerdep: '1' },
    bundleDependencies: { bundled: 'latest' },
  }),
);
// Both npm spellings: `bundleDependencies` wins and `bundledDependencies` is
// ignored — npm's precedence, and eslint-plugin-import's
// (`pkg.bundleDependencies || pkg.bundledDependencies`).
write(
  'both/package.json',
  JSON.stringify({
    name: 'both',
    bundledDependencies: ['shadowed'],
    bundleDependencies: ['winner'],
  }),
);
write(
  'falsy/package.json',
  JSON.stringify({
    name: 'falsy',
    bundleDependencies: false,
    bundledDependencies: ['fallback'],
  }),
);
write('other/package.json', JSON.stringify({ dependencies: { other: '1' } }));
write('broken/package.json', '{{ "name": "broken" }');
write('app/package.json', JSON.stringify({ name: 'app' }));
write('app/src/util.js', 'export const x = 1;\n');
write(
  'app/tsconfig.json',
  JSON.stringify({
    compilerOptions: { baseUrl: '.', paths: { '@app/*': ['src/*'] } },
  }),
);
write('app/node_modules/extpkg/package.json', '{"name":"extpkg"}');
write('app/node_modules/extpkg/index.js', 'module.exports = 1;\n');
const pkg = path.join(dir, 'pkg');
const other = path.join(dir, 'other');
const missing = path.join(dir, 'missing');
const broken = path.join(dir, 'broken');
const inPkg = path.join(pkg, 'src/main.js');
const inPkgTs = path.join(pkg, 'src/main.ts');
const spec = path.join(pkg, 'src/main.spec.js');
const inApp = path.join(dir, 'app/src/main.js');
afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

/**
 * A missing `name`, with the two TODO suggestions above `statement` (by
 * default the whole of `code`).
 */
const missingDep = (name: string, code: string, statement = code) => ({
  messageId: 'missingDependency' as const,
  suggestions: [
    {
      messageId: 'addToDependencies' as const,
      output: code.replace(
        statement,
        `// TODO: Run: npm install ${name}\n${statement}`,
      ),
    },
    {
      messageId: 'addToDevDependencies' as const,
      output: code.replace(
        statement,
        `// TODO: Run: npm install --save-dev ${name}\n${statement}`,
      ),
    },
  ],
});

const TYPE_ONLY = [
  "import type A from 'nope-a';",
  "import { type B } from 'nope-b';",
  "export type { C } from 'nope-c';",
  "export { type D } from 'nope-d';",
  "export type * from 'nope-e';",
  "import type F = require('nope-f');",
];

describe('no-extraneous-dependencies — eslint-plugin-import options', () => {
  ruleTester.run('no-extraneous-dependencies', noExtraneousDependencies, {
    valid: [
      {
        name: 'bundleDependencies wins over bundledDependencies',
        filename: path.join(dir, 'both/a.js'),
        code: "import w from 'winner';",
      },
      {
        name: 'bundleDependencies: false falls through to bundledDependencies',
        filename: path.join(dir, 'falsy/a.js'),
        code: "import f from 'fallback';",
      },
      {
        name: 'packageDir: the dependencies of the named folder',
        filename: path.join(dir, 'elsewhere.js'),
        code: "import dep from 'dep';\nimport b from 'bundled';",
        options: [{ packageDir: pkg }],
      },
      {
        name: 'packageDir: a folder relative to the working directory',
        filename: path.join(dir, 'elsewhere.js'),
        code: "import dep from 'dep';",
        options: [{ packageDir: path.relative(process.cwd(), pkg) }],
      },
      {
        name: 'packageDir: several folders merge',
        filename: path.join(dir, 'elsewhere.js'),
        code: "import dep from 'dep';\nimport o from 'other';\nimport b from 'bundled';",
        options: [{ packageDir: [pkg, other] }],
      },
      {
        name: 'packageDir: of several, a missing or broken one is skipped',
        filename: path.join(dir, 'elsewhere.js'),
        code: "import o from 'other';",
        options: [{ packageDir: [missing, broken, other] }],
      },
      {
        name: 'packageDir: an empty value finds the nearest package.json',
        filename: inPkg,
        code: "import dep from 'dep';",
        options: [{ packageDir: '' }],
      },
      {
        name: 'devDependencies: a glob list allows the files it matches',
        filename: spec,
        code: "import d from 'devdep';",
        options: [{ devDependencies: ['**/*.spec.js'] }],
      },
      {
        name: 'devDependencies: a glob relative to the working directory',
        filename: path.join(process.cwd(), 'foo.spec.js'),
        code: "import d from 'devdep';",
        options: [{ packageDir: pkg, devDependencies: ['*.spec.js'] }],
      },
      {
        name: 'peerDependencies: true is the default',
        filename: inPkg,
        code: "import p from 'peerdep';",
        options: [{ peerDependencies: true }],
      },
      {
        name: 'includeTypes: false skips type-only imports',
        filename: inPkgTs,
        code: "import type T from 'nope';",
        options: [{ includeTypes: false }],
      },
      {
        name: 'includeInternal: false skips an import/internal-regex match',
        filename: inPkg,
        code: "import i from 'internal-thing';",
        options: [{ includeInternal: false }],
        settings: { 'import/internal-regex': '^internal-' },
      },
      {
        name: 'includeInternal: false skips a path alias into the project',
        filename: inApp,
        code: "import u from '@app/util';",
        options: [{ includeInternal: false }],
        settings: { 'import/internal-regex': '^internal-' },
      },
      {
        name: 'import/core-modules: a runtime-provided module and its subpaths',
        filename: inPkg,
        code: "import 'electron';\nimport '@generated/bar/module';",
        settings: { 'import/core-modules': ['electron', '@generated/bar'] },
      },
    ],
    invalid: [
      {
        name: 'a package only in bundledDependencies, beside bundleDependencies, is undeclared',
        filename: path.join(dir, 'both/a.js'),
        code: "import s from 'shadowed';",
        errors: [missingDep('shadowed', "import s from 'shadowed';")],
      },
      {
        name: 'packageDir: a folder with no package.json',
        filename: inPkg,
        code: "import 'bar';",
        options: [{ packageDir: missing }],
        errors: [{ messageId: 'packageJsonNotFound' }],
      },
      {
        name: 'packageDir: a package.json that does not parse',
        filename: inPkg,
        code: "import 'bar';",
        options: [{ packageDir: broken }],
        errors: [{ messageId: 'packageJsonUnparsable' }],
      },
      {
        name: 'packageDir: a package the named folder does not declare',
        filename: path.join(dir, 'elsewhere.js'),
        code: "import o from 'other';",
        options: [{ packageDir: pkg }],
        errors: [missingDep('other', "import o from 'other';")],
      },
      {
        name: 'devDependencies: a file the glob list does not match',
        filename: inPkg,
        code: "import d from 'devdep';",
        options: [{ devDependencies: ['**/*.spec.js'] }],
        errors: [
          {
            messageId: 'devDependencyInProduction',
            suggestions: [
              {
                messageId: 'moveToDependencies',
                output:
                  "// TODO: Move devdep from devDependencies to dependencies in package.json\nimport d from 'devdep';",
              },
            ],
          },
        ],
      },
      {
        name: 'optionalDependencies: an empty glob list allows no file',
        filename: inPkg,
        code: "import o from 'optdep';",
        options: [{ optionalDependencies: [] }],
        errors: [missingDep('optdep', "import o from 'optdep';")],
      },
      {
        name: 'includeTypes: true checks every type-only spelling',
        filename: inPkgTs,
        code: TYPE_ONLY.join('\n'),
        options: [{ includeTypes: true }],
        errors: TYPE_ONLY.map((statement, i) =>
          missingDep(`nope-${'abcdef'[i]}`, TYPE_ONLY.join('\n'), statement),
        ),
      },
      {
        name: 'includeInternal: false still checks a package in node_modules, and one that does not resolve',
        filename: inApp,
        code: "import e from 'extpkg';\nimport n from 'not-installed';",
        options: [{ includeInternal: false }],
        errors: [
          missingDep(
            'extpkg',
            "import e from 'extpkg';\nimport n from 'not-installed';",
            "import e from 'extpkg';",
          ),
          missingDep(
            'not-installed',
            "import e from 'extpkg';\nimport n from 'not-installed';",
            "import n from 'not-installed';",
          ),
        ],
      },
      {
        name: 'includeInternal: true checks a path alias like any package',
        filename: inApp,
        code: "import u from '@app/util';",
        options: [{ includeInternal: true }],
        errors: [missingDep('@app/util', "import u from '@app/util';")],
      },
    ],
  });
});
