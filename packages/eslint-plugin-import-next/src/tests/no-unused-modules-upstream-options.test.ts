/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `no-unused-modules` under eslint-plugin-import's `missingExports`, `src`
 * and `ignoreExports`.
 *
 * They were rejected, so a config carried over from `import/no-unused-modules`
 * failed to load (13 of eslint-plugin-import's own cases, graded by
 * benchmarks/suites/ilb-competitor-parity/import-drop-in.mts). This rule's
 * check IS `missingExports`, so the option switches it, and the two glob lists
 * narrow which files it runs on. `unusedExports` — cross-file usage — is not
 * implemented, and stays rejected rather than accepted and ignored.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import * as path from 'node:path';
import { noUnusedModules } from '../rules/no-unused-modules';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

const at = (p: string) => path.join(process.cwd(), p);
const inSrc = at('src/a.js');
const ignored = path.join(process.cwd(), 'src/a.ignored.js');

describe('no-unused-modules — eslint-plugin-import options', () => {
  ruleTester.run('no-unused-modules', noUnusedModules, {
    valid: [
      {
        name: 'missingExports: false turns the check off',
        code: 'const a = 1;',
        options: [{ missingExports: false }],
      },
      {
        name: 'a file outside src is not checked',
        filename: path.join(process.cwd(), 'lib/a.js'),
        code: 'const a = 1;',
        options: [{ missingExports: true, src: [at('src/**/*.js')] }],
      },
      {
        name: 'a file matching ignoreExports is not checked',
        filename: ignored,
        code: 'const a = 1;',
        options: [
          { missingExports: true, ignoreExports: [at('src/*ignored*.js')] },
        ],
      },
    ],
    invalid: [
      {
        name: 'missingExports: true reports a module with no exports',
        code: 'const a = 1;',
        options: [{ missingExports: true }],
        errors: [{ messageId: 'missingExports' }],
      },
      {
        name: 'a file inside src, not ignored, is checked',
        filename: inSrc,
        code: 'const a = 1;',
        options: [
          {
            missingExports: true,
            src: [at('src/**/*.js')],
            ignoreExports: [at('src/*ignored*.js')],
          },
        ],
        errors: [{ messageId: 'missingExports' }],
      },
    ],
  });
});
