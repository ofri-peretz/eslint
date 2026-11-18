/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `extensions` under eslint-plugin-import's option shapes, with its meaning.
 *
 * `['always']`, `['never', { js: 'always' }]`, `[{ json: 'always' }]` and
 * `['always', { ignorePackages, checkTypeImports, pathGroupOverrides }]` were
 * all rejected, so a config carried over from `import/extensions` failed to
 * load (65 of eslint-plugin-import's own cases, graded by
 * benchmarks/suites/ilb-competitor-parity/import-drop-in.mts). They now load,
 * and lint the way that plugin lints them: package subpaths are checked, an
 * unresolved specifier is judged by what is written, and a directory import
 * needs its extension under `always`.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { extensions } from '../rules/extensions';

const dir = fs.realpathSync(
  fs.mkdtempSync(path.join(os.tmpdir(), 'extensions-upstream-')),
);
const write = (name: string, text = 'export const x = 1;\n') => {
  fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
  fs.writeFileSync(path.join(dir, name), text);
};
write('foo.js');
write('pick.js');
write('pick.jsx');
write('bar.json', '{}\n');
write('only.mjs');
write('index.js');
write('src/util.js');
write(
  'tsconfig.json',
  JSON.stringify({
    compilerOptions: { baseUrl: '.', paths: { 'app/*': ['src/*'] } },
  }),
);
write('node_modules/pkg/package.json', '{"name":"pkg","version":"1.0.0"}\n');
write('node_modules/pkg/index.js');
write('node_modules/pkg/sub.js');
const filename = path.join(dir, 'importer.js');
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

describe('extensions — eslint-plugin-import option shapes', () => {
  ruleTester.run('extensions', extensions, {
    valid: [
      {
        name: "['always']: the extension is written",
        filename,
        code: "import a from './foo.js';",
        options: ['always'],
      },
      {
        name: "['always']: a query string is not part of the extension",
        filename,
        code: "import a from './foo.js?raw';",
        options: ['always'],
      },
      {
        name: "['always']: builtins are never checked",
        filename,
        code: "import fs from 'fs';\nimport p from 'node:path';\nimport fsp from 'fs/promises';",
        options: ['always'],
      },
      {
        name: "['always']: an import/core-modules name is a builtin",
        filename,
        code: "import m from 'electron/main';",
        options: ['always'],
        settings: { 'import/core-modules': ['electron'] },
      },
      {
        name: "['always']: a package root may itself end in .js, so it is never checked",
        filename,
        code: "import p from 'pkg';\nimport s from '@scope/pkg';\nimport d from 'decimal.js';",
        options: ['always'],
      },
      {
        name: "['always']: an empty specifier is half-typed code",
        filename,
        code: "import x from '';",
        options: ['always'],
      },
      {
        name: "['always']: a type-only import is not checked",
        filename,
        code: "import type { T } from './foo';\nexport type { U } from './foo';",
        options: ['always'],
      },
      {
        name: "['never']: no extension written",
        filename,
        code: "import a from './foo';\nexport * from './foo';",
        options: ['never'],
      },
      {
        name: "['never']: the extension is load-bearing — without it the specifier names nothing",
        filename,
        code: "import a from './only.mjs';",
        options: ['never'],
      },
      {
        name: "[{ json: 'always', js: 'never' }]: the older bare-map form",
        filename,
        code: "import d from './bar.json';\nimport f from './foo';",
        options: [{ json: 'always', js: 'never' }],
      },
      {
        name: "['always', { ignorePackages }]: a package subpath is not checked",
        filename,
        code: "import s from 'pkg/sub';\nimport t from '@scope/pkg/sub';\nimport u from 'not-installed/sub';",
        options: ['always', { ignorePackages: true }],
      },
      {
        name: "['ignorePackages']: shorthand for always + ignorePackages",
        filename,
        code: "import s from 'pkg/sub';",
        options: ['ignorePackages'],
      },
      {
        // eslint-plugin-import reads `pathGroupOverrides` only beside
        // `pattern`, `ignorePackages` or `checkTypeImports`; alone, the object
        // is its older bare map. Ported as it reads them.
        name: "pathGroupOverrides 'ignore' skips a matching specifier",
        filename,
        code: "import s from 'pkg/sub';",
        options: [
          'always',
          {
            ignorePackages: false,
            pathGroupOverrides: [{ pattern: 'pkg/**', action: 'ignore' }],
          },
        ],
      },
      {
        name: "['always', { pattern }]: an extension set to never",
        filename,
        code: "import a from './foo';",
        options: ['always', { pattern: { js: 'never' } }],
      },
    ],
    invalid: [
      {
        name: "['always']: a missing extension",
        filename,
        code: "import a from './foo';",
        options: ['always'],
        errors: [{ messageId: 'missingExtension' }],
      },
      {
        name: "['always']: a directory import needs its index extension",
        filename,
        code: "import a from '.';",
        options: ['always'],
        errors: [{ messageId: 'missingExtension' }],
      },
      {
        name: "['always']: a specifier that resolves nowhere is judged as written",
        filename,
        code: "import a from './missing';",
        options: ['always'],
        errors: [{ messageId: 'missingExtension' }],
      },
      {
        name: "['always']: a package subpath is checked",
        filename,
        code: "import s from 'pkg/sub';",
        options: ['always'],
        errors: [{ messageId: 'missingExtension' }],
      },
      {
        name: "['always', { ignorePackages }]: a relative or alias import is still checked",
        filename,
        code: "import a from './foo';\nimport c from '@/configs/chart';\nimport u from 'app/util';",
        options: ['always', { ignorePackages: true }],
        errors: [
          { messageId: 'missingExtension' },
          { messageId: 'missingExtension' },
          { messageId: 'missingExtension' },
        ],
      },
      {
        name: "['never']: an extension that is decoration",
        filename,
        code: "import a from './foo.js';\nconst b = require('./foo.js?raw');",
        options: ['never'],
        errors: [
          { messageId: 'unexpectedExtension' },
          { messageId: 'unexpectedExtension' },
        ],
      },
      {
        name: "['always', { checkTypeImports }]: a type-only import is checked",
        filename,
        code: "import type { T } from './foo';\nexport type { U } from './foo';",
        options: ['always', { checkTypeImports: true }],
        errors: [
          { messageId: 'missingExtension' },
          { messageId: 'missingExtension' },
        ],
      },
      {
        name: "pathGroupOverrides 'enforce' checks a package subpath despite ignorePackages, and a builtin",
        filename,
        code: "import s from 'pkg/sub';\nimport fsp from 'fs/promises';",
        options: [
          'always',
          {
            ignorePackages: true,
            pathGroupOverrides: [
              { pattern: 'pkg/**', action: 'enforce' },
              { pattern: 'fs/**', action: 'enforce' },
            ],
          },
        ],
        errors: [
          { messageId: 'missingExtension' },
          { messageId: 'missingExtension' },
        ],
      },
      {
        name: "['never', { js: 'always' }]: the per-extension setting wins",
        filename,
        code: "import a from './foo';",
        options: ['never', { js: 'always' }],
        errors: [{ messageId: 'missingExtension' }],
      },
    ],
  });
});

// eslint-plugin-import's node resolver tries `import/resolve` (or
// `import/resolver: { node }`) extensions in their order: with `.jsx` first,
// `./pick` is pick.jsx, so `./pick.jsx` under `jsx: never` is decoration.
ruleTester.run('extensions — the resolver settings', extensions, {
  valid: [
    {
      name: 'the default order resolves ./pick to pick.js: the .jsx carries weight',
      code: `import a from './pick.jsx';`,
      filename,
      options: [{ jsx: 'never' }],
    },
  ],
  invalid: [
    {
      name: 'import/resolve extensions resolve ./pick to pick.jsx: the extension is decoration',
      code: `import a from './pick.jsx';`,
      filename,
      options: [{ jsx: 'never' }],
      settings: { 'import/resolve': { extensions: ['.jsx', '.js'] } },
      errors: [{ messageId: 'unexpectedExtension' }],
    },
    {
      name: 'the same order under import/resolver.node',
      code: `import a from './pick.jsx';`,
      filename,
      options: ['never'],
      settings: {
        'import/resolver': { node: { extensions: ['.jsx', '.js'] } },
      },
      errors: [{ messageId: 'unexpectedExtension' }],
    },
  ],
});
