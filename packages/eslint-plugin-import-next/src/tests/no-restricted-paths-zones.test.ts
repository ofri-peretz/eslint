/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `no-restricted-paths` under eslint-plugin-import's `zones` option.
 *
 * `zones` and `basePath` were rejected, so a config carried over from
 * `import/no-restricted-paths` failed to load (53 of eslint-plugin-import's own
 * cases, graded by benchmarks/suites/ilb-competitor-parity/import-drop-in.mts).
 * They now load and mean what they mean there: a file inside a zone's
 * `target` may not import a file inside its `from`, unless it is inside one of
 * its `except` paths. Paths are resolved files, not specifier text, so
 * `../server/db` and `@/server/db` are the same import.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { noRestrictedPaths } from '../rules/no-restricted-paths';

const dir = fs.realpathSync(
  fs.mkdtempSync(path.join(os.tmpdir(), 'restricted-zones-')),
);
for (const name of [
  'client/a.js',
  'client/sub/b.js',
  'server/db.js',
  'server/public/api.js',
  'other/x.js',
]) {
  fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
  fs.writeFileSync(path.join(dir, name), 'export const x = 1;\n');
}
const inClient = path.join(dir, 'client/a.js');
const inOther = path.join(dir, 'other/x.js');
afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

const zone = (extra: object = {}) => ({
  zones: [{ target: './client', from: './server', ...extra }],
  basePath: dir,
});

describe('no-restricted-paths — zones', () => {
  ruleTester.run('no-restricted-paths', noRestrictedPaths, {
    valid: [
      {
        name: 'a file outside every target is not restricted',
        filename: inOther,
        code: "import db from '../server/db';",
        options: [zone()],
      },
      {
        name: 'an import outside the zone’s from is allowed',
        filename: inClient,
        code: "import x from '../other/x';",
        options: [zone()],
      },
      {
        name: 'an import that resolves nowhere proves nothing',
        filename: inClient,
        code: "import x from '../server/missing';",
        options: [zone()],
      },
      {
        name: 'an except path inside from is allowed',
        filename: inClient,
        code: "import api from '../server/public/api';",
        options: [zone({ except: ['./public'] })],
      },
      {
        name: 'glob from with a glob except',
        filename: inClient,
        code: "import api from '../server/public/api';",
        options: [
          {
            zones: [
              {
                target: './client/**/*',
                from: './server/**/*',
                except: ['**/public/**'],
              },
            ],
            basePath: dir,
          },
        ],
      },
      {
        name: 'target as a list, matched by none',
        filename: inOther,
        code: "import db from '../server/db';",
        options: [
          {
            zones: [{ target: ['./client', './nowhere'], from: './server' }],
            basePath: dir,
          },
        ],
      },
    ],
    invalid: [
      {
        name: 'a file in target imports a file in from',
        filename: inClient,
        code: "import db from '../server/db';\nexport * from '../server/db';",
        options: [zone()],
        errors: [
          { messageId: 'zoneViolation' },
          { messageId: 'zoneViolation' },
        ],
      },
      {
        name: 'the zone message is appended',
        filename: inClient,
        code: "const db = require('../server/db');",
        options: [zone({ message: 'Use the API.' })],
        errors: [
          {
            messageId: 'zoneViolation',
            data: { importPath: '../server/db', message: ' Use the API.' },
          },
        ],
      },
      {
        name: 'an except path that does not cover the import',
        filename: inClient,
        code: "import db from '../server/db';",
        options: [zone({ except: ['./public'] })],
        errors: [{ messageId: 'zoneViolation' }],
      },
      {
        name: 'an except path outside from is a configuration error',
        filename: inClient,
        code: "import db from '../server/db';",
        options: [zone({ except: ['../other'] })],
        errors: [{ messageId: 'exceptionNotInside' }],
      },
      {
        name: 'glob target and glob from',
        filename: inClient,
        code: "import db from '../server/db';",
        options: [
          {
            zones: [{ target: './client/**/*', from: ['./server/**/*'] }],
            basePath: dir,
          },
        ],
        errors: [{ messageId: 'zoneViolation' }],
      },
      {
        name: 'a glob from with a non-glob except is a configuration error',
        filename: inClient,
        code: "import db from '../server/db';",
        options: [
          {
            zones: [
              {
                target: './client',
                from: './server/**/*',
                except: ['./public'],
              },
            ],
            basePath: dir,
          },
        ],
        errors: [{ messageId: 'exceptionNotGlob' }],
      },
      {
        name: 'a from list mixing globs and paths is a configuration error',
        filename: inClient,
        code: "import x from '../other/x';",
        options: [
          {
            zones: [{ target: './client', from: ['./server/**/*', './other'] }],
            basePath: dir,
          },
        ],
        errors: [{ messageId: 'fromMixesGlobs' }],
      },
      {
        name: 'without basePath, paths are relative to the cwd (absolute here)',
        filename: inClient,
        code: "import db from '../server/db';",
        options: [
          {
            zones: [
              {
                target: path.join(dir, 'client'),
                from: path.join(dir, 'server'),
              },
            ],
          },
        ],
        errors: [{ messageId: 'zoneViolation' }],
      },
      {
        name: 'a nested client file is inside the target too',
        filename: path.join(dir, 'client/sub/b.js'),
        code: "import db from '../../server/db';",
        options: [zone()],
        errors: [{ messageId: 'zoneViolation' }],
      },
    ],
  });
});
