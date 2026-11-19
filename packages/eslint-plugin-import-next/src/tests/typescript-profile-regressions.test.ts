/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Three divergences from eslint-plugin-import that a shared TypeScript
 * config, carried over unchanged, turned into findings on a real project.
 * One small project holds all three, the way they were met:
 *
 *   tsconfig.json  paths: `@/*`, `~/*`, `@app/*` → `./src/*`
 *   package.json   no dependencies
 *
 * 1. `no-extraneous-dependencies` reported a path alias that resolves to a
 *    file in the project (`import { x } from '@/configs'`) as a package
 *    missing from package.json. eslint-plugin-import calls such a specifier
 *    `internal` and checks it only under `includeInternal: true`.
 * 2. `prefer-default-export` counted the value export beside an exported
 *    type as the module's only export. eslint-plugin-import leaves a module
 *    that exports a type alone: a type cannot be its default export.
 * 3. With `import/resolver: { node: { extensions: ['.ts', '.json'] },
 *    typescript: true }`, a `.js` file importing its `.js` sibling did not
 *    resolve: the node resolver failed and the typescript resolver was never
 *    tried. eslint-plugin-import tries the configured resolvers in order
 *    until one resolves.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { noExtraneousDependencies } from '../rules/no-extraneous-dependencies';
import { preferDefaultExport } from '../rules/prefer-default-export';
import { noUnresolved } from '../rules/no-unresolved';
import { extensions } from '../rules/extensions';

const dir = fs.realpathSync(
  fs.mkdtempSync(path.join(os.tmpdir(), 'ts-profile-')),
);
const write = (name: string, text = 'export const x = 1;\n') => {
  fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
  fs.writeFileSync(path.join(dir, name), text);
};
write(
  'package.json',
  JSON.stringify({ name: 'repro', type: 'module', dependencies: {} }),
);
write(
  'tsconfig.json',
  JSON.stringify({
    compilerOptions: {
      module: 'esnext',
      moduleResolution: 'bundler',
      allowJs: true,
      baseUrl: '.',
      paths: {
        '@/*': ['./src/*'],
        '~/*': ['./src/*'],
        '@app/*': ['./src/*'],
        '@vendor/*': ['./vendor_modules/*'],
        '@broken/*': ['./broken/*'],
      },
    },
    include: ['src'],
  }),
);
write('src/configs.ts');
write('src/c.ts');
write('src/lib/constants.ts');
write('src/b.js', 'export default 1;\n');
write('node_modules/installed/package.json', '{"name":"installed"}\n');
write('node_modules/installed/index.js', 'export default 1;\n');
write('vendor_modules/lib.js');
write('pkgs/inner/package.json', JSON.stringify({ name: 'inner' }));
write(
  'pkgs/consumer/package.json',
  JSON.stringify({ name: 'consumer', dependencies: { repro: '*' } }),
);
write('broken/package.json', '{{ "name": "broken" }');
write('broken/b.ts');
const tsFile = path.join(dir, 'src/d.ts');
const jsFile = path.join(dir, 'src/a.js');
/** A file of a nested package: the alias resolves outside it. */
const innerFile = path.join(dir, 'pkgs/inner/x.ts');
/** A file of a nested package that declares the root package. */
const consumerFile = path.join(dir, 'pkgs/consumer/x.ts');
/** A project with a tsconfig and no package.json anywhere above it. */
const bare = fs.realpathSync(
  fs.mkdtempSync(path.join(os.tmpdir(), 'ts-profile-bare-')),
);
fs.mkdirSync(path.join(bare, 'src'));
fs.writeFileSync(path.join(bare, 'src/m.ts'), 'export const m = 1;\n');
fs.writeFileSync(
  path.join(bare, 'tsconfig.json'),
  JSON.stringify({
    compilerOptions: { baseUrl: '.', paths: { '@/*': ['./src/*'] } },
  }),
);
afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.rmSync(bare, { recursive: true, force: true });
});

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

/** A package missing from package.json, with its two TODO suggestions. */
const missingDep = (name: string, code: string) => ({
  messageId: 'missingDependency' as const,
  suggestions: [
    {
      messageId: 'addToDependencies' as const,
      output: `// TODO: Run: npm install ${name}\n${code}`,
    },
    {
      messageId: 'addToDevDependencies' as const,
      output: `// TODO: Run: npm install --save-dev ${name}\n${code}`,
    },
  ],
});

/** A single named export, with its TODO suggestion. */
const singleExport = (code: string) => ({
  messageId: 'preferDefaultExport' as const,
  suggestions: [
    {
      messageId: 'preferDefaultExport' as const,
      output: code.replace(
        'export const c',
        '// TODO: Convert named export to default export\nexport const c',
      ),
    },
  ],
});

/** The resolver chain a shared TypeScript config ships. */
const nodeThenTypescript = {
  'import/resolver': {
    node: { extensions: ['.ts', '.json'] },
    typescript: true,
  },
};

describe('1. no-extraneous-dependencies: a path alias is not a package', () => {
  ruleTester.run('no-extraneous-dependencies', noExtraneousDependencies, {
    valid: [
      {
        name: 'every alias that resolves into the project, by default',
        filename: tsFile,
        code: "import { x } from '@/configs';\nimport { y } from '~/configs';\nimport { c } from '@app/c';\nimport { z } from '@/lib/constants';",
      },
      {
        name: 'an alias imported from a .js file',
        filename: jsFile,
        code: "import u from '@/configs';",
      },
      {
        name: 'an alias resolved by the configured resolver chain',
        filename: jsFile,
        code: "import u from '@/configs';",
        settings: nodeThenTypescript,
      },
      {
        name: 'includeInternal: false, written out, is the same',
        filename: tsFile,
        code: "import { x } from '@/configs';",
        options: [{ includeInternal: false }],
      },
      {
        name: 'a bare name the node resolver finds in its paths',
        filename: jsFile,
        code: "import c from 'configs';",
        settings: {
          'import/resolver': { node: { paths: [path.join(dir, 'src')] } },
        },
      },
      {
        name: 'a folder that is not a module folder by default',
        filename: tsFile,
        code: "import v from '@vendor/lib';",
      },
      {
        name: "an alias into another package, declared under that package's name",
        filename: consumerFile,
        code: "import { x } from '@/configs';",
      },
      {
        name: "no package.json above the file: the file's folder is the package",
        filename: path.join(bare, 'src/n.ts'),
        code: "import { m } from '@/m';",
        options: [{ packageJson: { name: 'bare' } }],
      },
    ],
    invalid: [
      {
        name: 'a package that does not resolve is still checked',
        filename: jsFile,
        code: "import n from 'not-installed';",
        errors: [missingDep('not-installed', "import n from 'not-installed';")],
      },
      {
        name: 'an alias that resolves to nothing is still checked',
        filename: jsFile,
        code: "import u from '@/utils';",
        errors: [missingDep('@/utils', "import u from '@/utils';")],
      },
      {
        name: 'a package installed in node_modules is still checked',
        filename: jsFile,
        code: "import i from 'installed';",
        errors: [missingDep('installed', "import i from 'installed';")],
      },
      {
        name: 'import/external-module-folders: a file in one is external',
        filename: tsFile,
        code: "import v from '@vendor/lib';",
        settings: { 'import/external-module-folders': [42, 'vendor_modules'] },
        errors: [missingDep('@vendor/lib', "import v from '@vendor/lib';")],
      },
      {
        name: 'import/external-module-folders that is not a list: node_modules only',
        filename: tsFile,
        code: "import i from 'installed';",
        settings: { 'import/external-module-folders': 'vendor_modules' },
        errors: [missingDep('installed', "import i from 'installed';")],
      },
      {
        name: "an alias resolving outside the linted file's package is external",
        filename: innerFile,
        code: "import { x } from '@/configs';",
        errors: [missingDep('@/configs', "import { x } from '@/configs';")],
      },
      {
        name: 'an alias into a folder whose package.json does not parse',
        filename: innerFile,
        code: "import { x } from '@broken/b';",
        errors: [missingDep('@broken/b', "import { x } from '@broken/b';")],
      },
      {
        name: 'includeInternal: true, and no package.json above the resolved file',
        filename: path.join(bare, 'src/n.ts'),
        code: "import { m } from '@/m';",
        options: [{ includeInternal: true, packageJson: { name: 'bare' } }],
        errors: [missingDep('@/m', "import { m } from '@/m';")],
      },
      {
        name: 'includeInternal: true checks an alias like a package',
        filename: tsFile,
        code: "import { x } from '@/configs';",
        options: [{ includeInternal: true }],
        errors: [missingDep('@/configs', "import { x } from '@/configs';")],
      },
    ],
  });
});

describe('2. prefer-default-export: a module that exports a type', () => {
  ruleTester.run('prefer-default-export', preferDefaultExport, {
    valid: [
      {
        // eslint-plugin-import's own valid case
        // (tests/src/rules/prefer-default-export.js, TypeScript).
        name: 'an interface beside one function',
        code: 'export interface foo { bar: string; }; export function goo() {}',
      },
      {
        name: 'a type alias beside one const',
        code: 'export type A = string;\nexport const c = 1;',
      },
      {
        name: 'a type re-export beside one const',
        code: "export type { A } from './a';\nexport const c = 1;",
      },
      {
        name: 'an inline type specifier beside one const',
        code: "export { type A } from './a';\nexport const c = 1;",
      },
      {
        name: "target 'any': a type silences it too",
        code: 'export type A = string;\nexport const c = 1;',
        options: [{ target: 'any' }],
      },
      {
        name: "target 'always': a type silences it too",
        code: 'export interface I {}\nexport const c = 1;\nexport const d = 2;',
        options: [{ target: 'always' }],
      },
    ],
    invalid: [
      {
        name: 'one value export and no type is still reported',
        code: 'export const c = 1;',
        errors: [singleExport('export const c = 1;')],
      },
      {
        name: 'a type-only import does not silence it',
        code: "import type { A } from './a';\nexport const c: A = 1;",
        errors: [
          singleExport("import type { A } from './a';\nexport const c: A = 1;"),
        ],
      },
    ],
  });
});

describe('3. the resolver chain: node, then typescript', () => {
  ruleTester.run('no-unresolved', noUnresolved, {
    valid: [
      {
        name: 'node (.ts, .json) misses ./b, typescript finds b.js',
        filename: jsFile,
        code: "import b from './b';",
        settings: nodeThenTypescript,
      },
      {
        name: 'the same chain as an array',
        filename: jsFile,
        code: "import b from './b';",
        settings: {
          'import/resolver': [
            { node: { extensions: ['.ts'] } },
            'eslint-import-resolver-typescript',
          ],
        },
      },
    ],
    invalid: [
      {
        name: 'node alone, with the same extensions, does not resolve it',
        filename: jsFile,
        code: "import b from './b';",
        settings: { 'import/resolver': { node: { extensions: ['.ts'] } } },
        errors: [
          {
            messageId: 'moduleNotFound',
            suggestions: [
              {
                messageId: 'addIgnoreComment',
                output:
                  "// eslint-disable-next-line import-next/no-unresolved\nimport b from './b';",
              },
            ],
          },
        ],
      },
    ],
  });

  ruleTester.run('extensions', extensions, {
    valid: [],
    invalid: [
      {
        name: "a .js extension in a .js file is reported under js: 'never'",
        filename: jsFile,
        code: "import b from './b.js';",
        options: ['ignorePackages', { js: 'never', ts: 'never' }],
        settings: nodeThenTypescript,
        errors: [{ messageId: 'unexpectedExtension' }],
      },
    ],
  });
});
