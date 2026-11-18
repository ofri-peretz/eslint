/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `no-duplicates` under eslint-plugin-import's options, with its meaning.
 *
 * `prefer-inline` and `considerQueryString` were rejected (the schema took
 * no options), so a config carried over from `import/no-duplicates` failed
 * to load (5 of eslint-plugin-import's own cases, graded by
 * benchmarks/suites/ilb-competitor-parity/import-drop-in.mts).
 *
 * `prefer-inline: true` makes `import type` beside a value import a
 * duplicate, merged as inline `type` specifiers, so nothing new is emitted.
 * `considerQueryString: true` is this rule's own reading (a query names a
 * different module, its path part is resolved); `false`, eslint-plugin-
 * import's default, ignores the query.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import * as path from 'node:path';
import { noDuplicates } from '../rules/no-duplicates';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

/** `src/app.ts`: `./files/foo` resolves to src/files/foo.ts. */
const APP = path.resolve(__dirname, '../app.ts');
const inline = [{ 'prefer-inline': true }];
const query = [{ considerQueryString: true }];
const error = [{ messageId: 'noDuplicates' as const }];

describe('no-duplicates — eslint-plugin-import options', () => {
  ruleTester.run('no-duplicates', noDuplicates, {
    valid: [
      {
        name: 'prefer-inline: false keeps import type apart from a value import',
        code: "import type { A } from 'm';\nimport { b } from 'm';",
        options: [{ 'prefer-inline': false }],
      },
      {
        name: 'prefer-inline: a namespace import still cannot merge with named ones',
        code: "import * as ns from 'm';\nimport type { A } from 'm';",
        options: inline,
      },
      {
        name: 'considerQueryString: two queries are two modules',
        filename: APP,
        code: "import a from './files/foo?raw';\nimport b from './files/foo?url';",
        options: query,
      },
      {
        name: 'considerQueryString: a query and none are two modules',
        filename: APP,
        code: "import a from './files/foo';\nimport b from './files/foo?raw';",
        options: query,
      },
      {
        name: 'considerQueryString: false still tells two files apart',
        filename: APP,
        code: "import a from './files/foo?raw';\nimport b from './files/no-default?raw';",
        options: [{ considerQueryString: false }],
      },
    ],
    invalid: [
      {
        name: 'prefer-inline: import type merged into a value import as inline type',
        code: "import { b } from 'm';\nimport type { A } from 'm';",
        options: inline,
        output: "import { b, type A } from 'm';\n",
        errors: error,
      },
      {
        name: 'prefer-inline: import type beside a default import',
        code: "import d from 'm';\nimport type { A } from 'm';",
        options: inline,
        output: "import d, { type A } from 'm';\n",
        errors: error,
      },
      {
        name: 'prefer-inline: a value import is not spliced into import type',
        code: "import type { A } from 'm';\nimport { b } from 'm';",
        options: inline,
        output: null,
        errors: error,
      },
      {
        name: 'prefer-inline: two import type statements merge as before',
        code: "import type { A } from 'm';\nimport type { B } from 'm';",
        options: inline,
        output: "import type { A, B } from 'm';\n",
        errors: error,
      },
      {
        name: 'considerQueryString: one query on one file, spelled two ways',
        filename: APP,
        code: "import a from './files/foo?raw';\nimport b from './files/foo.ts?raw';",
        options: query,
        errors: error,
      },
      {
        name: 'considerQueryString: false ignores the query',
        filename: APP,
        code: "import a from './files/foo?raw';\nimport b from './files/foo?url';\nimport { bar } from './files/foo';",
        options: [{ considerQueryString: false }],
        output:
          "import a, { bar } from './files/foo?raw';\nimport b from './files/foo?url';\n",
        errors: [...error, ...error],
      },
      {
        name: 'considerQueryString: false on a package specifier',
        code: "import a from 'pkg?raw';\nimport b from 'pkg';",
        options: [{ considerQueryString: false }],
        errors: error,
      },
    ],
  });
});
