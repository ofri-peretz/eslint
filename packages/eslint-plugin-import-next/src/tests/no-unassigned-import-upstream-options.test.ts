/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `no-unassigned-import` under eslint-plugin-import's `{ allow: [globs] }`,
 * with its meaning: a package specifier is matched as written, a relative
 * one as the absolute path it names. It was rejected, so a config carried
 * over from `import/no-unassigned-import` failed to load (15 of
 * eslint-plugin-import's own cases, graded by
 * benchmarks/suites/ilb-competitor-parity/import-drop-in.mts). Upstream's
 * schema also carries three dependency keys it never reads; they load here
 * too, with no effect.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import * as path from 'node:path';
import { noUnassignedImport } from '../rules/no-unassigned-import';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const filename = '/project/src/app.js';
/** A file below the working directory, for globs written relative to it. */
const inCwd = path.join(process.cwd(), 'src/app.js');

describe('no-unassigned-import — eslint-plugin-import options', () => {
  ruleTester.run('no-unassigned-import', noUnassignedImport, {
    valid: [
      {
        name: 'allow: a package matched as written',
        filename,
        code: "import 'app.css';\nimport 'foo/bar';",
        options: [{ allow: ['*.css', 'foo/**'] }],
      },
      {
        name: 'allow: a relative import matched as its absolute path',
        filename,
        code: "import './app.css';\nimport '../dir/app.js';\nrequire('./app.css');",
        options: [{ allow: ['**/*.css', '**/dir/**'] }],
      },
      {
        name: 'allow: an absolute import matched as written',
        filename,
        code: "import '/project/styles/app.css';",
        options: [{ allow: ['/project/styles/**'] }],
      },
      {
        name: 'allow: a glob relative to the working directory',
        filename: inCwd,
        code: "import './styles/app.css';",
        options: [{ allow: ['src/styles/**'] }],
      },
      {
        name: 'the no-op dependency keys load',
        filename,
        code: "import a from 'a';",
        options: [
          {
            devDependencies: true,
            optionalDependencies: ['**/*.js'],
            peerDependencies: false,
          },
        ],
      },
    ],
    invalid: [
      {
        name: 'allow: a relative import no glob matches',
        filename,
        code: "import './app.css';",
        options: [{ allow: ['**/*.js', '**/dir/**'] }],
        errors: [{ messageId: 'unassignedImport' }],
      },
      {
        name: 'allow: a glob relative to the working directory is not relative to the file',
        filename: inCwd,
        code: "import './styles/app.css';",
        options: [{ allow: ['styles/*.css'] }],
        errors: [{ messageId: 'unassignedImport' }],
      },
      {
        name: 'allow: a require() no glob matches',
        filename,
        code: "require('./app.css');",
        options: [{ allow: ['**/*.js'] }],
        errors: [{ messageId: 'unassignedImport' }],
      },
    ],
  });
});
