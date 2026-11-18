/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `order` / `enforce-import-order` under eslint-plugin-import's options, with
 * eslint-plugin-import's meaning (src/utils/order-upstream.ts).
 *
 * `pathGroups`, `newlines-between`, `distinctGroup`, `named`,
 * `sortTypesGroup`, `consolidateIslands`, nested `groups` and the rest were
 * rejected, so a config carried over from `import/order` failed to load (145
 * of eslint-plugin-import's own cases). Graded by
 * benchmarks/suites/ilb-competitor-parity/import-drop-in.mts.
 *
 * Expectations were checked against eslint-plugin-import@2.32.0 itself; where
 * a case differs from it on purpose, the case name says so.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll, expect } from 'vitest';
import parser from '@typescript-eslint/parser';
import { enforceImportOrder } from '../rules/enforce-import-order';
import { isUpstreamOrderForm } from '../utils/order-upstream';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

/**
 * A package `app` with a dependency inside it, one hoisted above it, and one
 * symlinked from node_modules to a folder of its own (`vendor/`) — the three
 * places a bare specifier can resolve to. `orphan/` has no package.json
 * anywhere above it.
 */
// Every file is linted through a symlink to the fixture, on every OS. The
// resolver returns real paths; this pins that the rule compares like with like
// (it did not, and the cases recorded on macOS — whose tmpdir is a symlink —
// failed on Linux CI).
const real = fs.mkdtempSync(path.join(os.tmpdir(), 'order-upstream-'));
const root = `${real}-link`;
fs.symlinkSync(real, root);
const pkg = (dir: string, name: string) => {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ name, main: 'index.js' }),
  );
  fs.writeFileSync(path.join(dir, 'index.js'), 'module.exports = 1;\n');
};
fs.mkdirSync(path.join(root, 'app/src'), { recursive: true });
fs.writeFileSync(
  path.join(root, 'app/package.json'),
  JSON.stringify({ name: 'app' }),
);
pkg(path.join(root, 'app/node_modules/inside-pkg'), 'inside-pkg');
pkg(path.join(root, 'node_modules/hoisted-pkg'), 'hoisted-pkg');
pkg(path.join(root, 'app/vendor/vendored'), 'vendored');
fs.symlinkSync(
  path.join(root, 'app/vendor/vendored'),
  path.join(root, 'app/node_modules/vendored'),
);
pkg(path.join(root, 'app/..dotdot'), 'dotdot-pkg');
fs.symlinkSync(
  path.join(root, 'app/..dotdot'),
  path.join(root, 'app/node_modules/dotdot-pkg'),
);
pkg(path.join(root, 'app/node_modules/..weird'), 'weird-pkg');
fs.symlinkSync(
  path.join(root, 'app/node_modules/..weird'),
  path.join(root, 'app/node_modules/weird-pkg'),
);
fs.mkdirSync(path.join(root, 'orphan'));
afterAll(() => {
  fs.unlinkSync(root);
  fs.rmSync(real, { recursive: true, force: true });
});

const at = (file: string) => path.join(root, file);

const ts = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('isUpstreamOrderForm', () => {
  it('keeps import-next’s reading for its own keys and group names', () => {
    expect(isUpstreamOrderForm([])).toBe(false);
    expect(
      isUpstreamOrderForm([
        {
          groups: ['builtin', 'external', 'side-effect'],
          alphabetize: { order: 'asc', caseInsensitive: true },
          internalPatterns: ['^~/'],
          newlinesBetween: 'always',
        },
      ]),
    ).toBe(false);
  });
  it('switches on any upstream-only key, orderImportKind, a nested group or `unknown`', () => {
    expect(isUpstreamOrderForm([{ distinctGroup: true }])).toBe(true);
    expect(
      isUpstreamOrderForm([{ alphabetize: { orderImportKind: 'asc' } }]),
    ).toBe(true);
    expect(isUpstreamOrderForm([{ groups: [['builtin', 'external']] }])).toBe(
      true,
    );
    expect(isUpstreamOrderForm([{ groups: ['unknown'] }])).toBe(true);
  });
});

describe('order — eslint-plugin-import options', () => {
  ts.run('order', enforceImportOrder, {
    valid: [
      {
        // The LAST of two equal keys is the export; sorting them would swap
        // which value is exported. (`['z']` is the same key as `z`.)
        name: 'named.cjsExports leaves an object with a repeated key alone',
        code: "module.exports = { z: second, ['z']: first, a };\nmodule.exports = { y: b, y: a };\n",
        filename: at('app/src/file.ts'),
        options: [
          { named: { cjsExports: true }, alphabetize: { order: 'asc' } },
        ],
      },
      {
        // `..dotdot` and `..weird` are folders whose names start with `..`:
        // inside the package and inside node_modules respectively, though
        // their relative paths start with `..` (eslint-plugin-import tests the
        // prefix and gets both wrong).
        name: 'classification: a folder named ..x is inside, not a parent',
        code: "import d from 'dotdot-pkg';\nimport w from 'weird-pkg';\n",
        filename: at('app/src/file.ts'),
        options: [{ groups: ['internal', 'external'], distinctGroup: true }],
      },
      {
        name: 'alphabetize.orderImportKind selects the upstream engine: no newline is required between groups',
        code: "import fs from 'fs';\nimport a from './a';\n",
        filename: at('app/src/file.ts'),
        options: [{ alphabetize: { order: 'asc', orderImportKind: 'asc' } }],
      },
      {
        name: 'a file in a directory that does not exist yet (an unsaved buffer) still lints',
        code: "import fs from 'fs';\nimport a from './a';\n",
        filename: at('not-on-disk/src/file.ts'),
        options: [{ alphabetize: { order: 'asc', orderImportKind: 'asc' } }],
      },
      {
        name: 'a nested group ranks its members together',
        code: "import x from 'ext-x';\nimport fs from 'fs';\nimport a from './a';\n",
        filename: at('app/src/file.ts'),
        options: [{ groups: [['builtin', 'external'], 'sibling'] }],
      },
      {
        name: 'the `unknown` group can be placed first',
        code: "import u from '~/u';\nimport fs from 'fs';\n",
        filename: at('app/src/file.ts'),
        options: [{ groups: ['unknown', 'builtin'] }],
      },
      {
        name: 'classification: builtin, core-modules, external (inside, hoisted, unresolved, scoped), internal (symlinked, internal-regex), unknown, parent, sibling, index; absolute paths unranked',
        code: "import fs from 'node:fs';\nimport e from 'electron';\nimport abs from '/abs/path';\nimport n from 'inside-pkg';\nimport h from 'hoisted-pkg';\nimport x from 'unresolved-ext';\nimport sc from '@scope/unresolved/deep';\nimport v from 'vendored';\nimport hi from '#hash';\nimport u from '~/u';\nimport p from '../p';\nimport pp from '..';\nimport s from './s';\nimport i from './';\nimport ii from './index';\n",
        filename: at('app/src/file.ts'),
        options: [
          {
            groups: [
              'builtin',
              'external',
              'internal',
              'unknown',
              'parent',
              'sibling',
              'index',
            ],
            'newlines-between': 'ignore',
          },
        ],
        settings: {
          'import/internal-regex': '^#',
          'import/core-modules': ['electron'],
        },
      },
      {
        name: 'differs from eslint-plugin-import (which crashes): a file with no package.json above it still lints',
        code: "import h from 'hoisted-pkg';\nimport e from 'unresolved-x';\n",
        filename: at('orphan/file.ts'),
        options: [{ groups: ['internal', 'external'], distinctGroup: true }],
      },
      {
        name: 'pathGroups: before/after positions order around their group',
        code: "import fs from 'fs';\n\nimport React from 'react';\n\nimport x from 'ext-x';\n\nimport app from '@app/x';\n\nimport lib from '@lib/y';\n\nimport t from '~/t';\n",
        filename: at('app/src/file.ts'),
        options: [
          {
            groups: ['builtin', 'external', 'internal'],
            pathGroupsExcludedImportTypes: ['builtin'],
            'newlines-between': 'always',
            pathGroups: [
              { pattern: 'react', group: 'external', position: 'before' },
              { pattern: '@app/**', group: 'external', position: 'after' },
              { pattern: '@lib/**', group: 'external', position: 'after' },
              { pattern: '~/**', group: 'internal' },
            ],
          },
        ],
      },
      {
        name: 'a character class is case-sensitive on every platform',
        code: "import fs from 'fs';\nimport Bar from 'Bar';\n",
        filename: at('app/src/file.ts'),
        options: [
          {
            pathGroupsExcludedImportTypes: [],
            pathGroups: [
              { pattern: '[a-z]*', group: 'builtin', position: 'before' },
            ],
          },
        ],
      },
      {
        name: 'a leading `!` negates the pattern by default',
        code: "import fs from 'fs';\nimport _ from 'lodash';\nimport a from 'ext-a';\nimport p from '../p';\n",
        filename: at('app/src/file.ts'),
        options: [
          {
            pathGroupsExcludedImportTypes: ['builtin'],
            pathGroups: [
              { pattern: '!lodash', group: 'parent', position: 'after' },
            ],
          },
        ],
      },
      {
        name: 'with patternOptions, a `#` pattern is a comment and matches nothing',
        code: "import fs from 'fs';\nimport x from '#x';\n",
        filename: at('app/src/file.ts'),
        options: [
          {
            pathGroupsExcludedImportTypes: [],
            pathGroups: [
              {
                pattern: '#x',
                patternOptions: {},
                group: 'builtin',
                position: 'before',
              },
            ],
          },
        ],
      },
      {
        name: 'named.cjsExports: a declared `exports` or `module` is not CommonJS',
        code: 'var exports = {};\nvar module = {};\nexports.b = 1;\nexports.a = 2;\nmodule.exports.d = 1;\nmodule.exports.c = 1;\n',
        filename: at('app/src/file.ts'),
        options: [
          { named: { cjsExports: true }, alphabetize: { order: 'asc' } },
        ],
      },
      {
        name: 'named.cjsExports: a parameter named `exports` is not CommonJS',
        code: 'function f(exports) {\n  exports.b = 1;\n  exports.a = 2;\n}\n',
        filename: at('app/src/file.ts'),
        options: [
          { named: { cjsExports: true }, alphabetize: { order: 'asc' } },
        ],
      },
      {
        name: 'named.cjsExports without alphabetize does not order assignments',
        code: 'exports.b = 1;\nexports.a = 2;\nx = 1;\nconst q = (exports.q = 1);\n',
        filename: at('app/src/file.ts'),
        options: [{ named: { cjsExports: true } }],
      },
      {
        name: 'named.import false overrides named.enabled',
        code: "import { b, a } from 'x';\n",
        filename: at('app/src/file.ts'),
        options: [
          {
            named: { enabled: true, import: false },
            alphabetize: { order: 'asc' },
          },
        ],
      },
      {
        name: 'unassigned imports are ignored by default',
        code: "import './a';\nimport fs from 'fs';\n",
        filename: at('app/src/file.ts'),
        options: [{ distinctGroup: true }],
      },
      {
        name: 'alphabetize does not compare a parent with a sibling path',
        code: "import a from './a';\nimport b from '../b';\n",
        filename: at('app/src/file.ts'),
        options: [
          { groups: [['parent', 'sibling']], alphabetize: { order: 'asc' } },
        ],
      },
      {
        name: 'without upstream options, requires, import-equals and exports are left to import-next’s reading',
        code: "import fs from 'node:fs';\n\nimport x = require('x');\nconst a = require('a');\nlet b;\nb = 1;\nexport { a, b };\n",
        filename: at('app/src/file.ts'),
      },
      {
        name: 'orderImportKind treats a require() as a value import',
        code: "const a = require('x');\nconst b = require('x');\n",
        filename: at('app/src/file.ts'),
        options: [{ alphabetize: { order: 'asc', orderImportKind: 'asc' } }],
      },
      {
        name: 'newlines-between-types ignore',
        code: "import a from 'a';\n\nimport type { B } from 'b';\n\nimport type { C } from 'c';\n",
        filename: at('app/src/file.ts'),
        options: [
          {
            groups: ['external', 'type'],
            sortTypesGroup: true,
            'newlines-between': 'always',
            'newlines-between-types': 'ignore',
          },
        ],
      },
      {
        name: 'named: a single specifier has nothing to order',
        code: "import { a } from 'x';\nconst b = 1;\nexport { b };\n",
        filename: at('app/src/file.ts'),
        options: [{ named: true, alphabetize: { order: 'asc' } }],
      },
    ],
    invalid: [
      {
        name: 'classification: every type reported against the index import that precedes it',
        code: "import i from './';\nimport s from './s';\nimport p from '../p';\nimport u from '~/u';\nimport v from 'vendored';\nimport h from 'hoisted-pkg';\nimport fs from 'fs';\n",
        filename: at('app/src/file.ts'),
        options: [
          {
            groups: [
              'builtin',
              'external',
              'internal',
              'unknown',
              'parent',
              'sibling',
              'index',
            ],
            distinctGroup: true,
          },
        ],
        settings: {
          'import/internal-regex': '^#',
          'import/core-modules': ['electron'],
        },
        errors: [
          { messageId: 'upstreamOutOfOrder' },
          { messageId: 'upstreamOutOfOrder' },
          { messageId: 'upstreamOutOfOrder' },
          { messageId: 'upstreamOutOfOrder' },
          { messageId: 'upstreamOutOfOrder' },
          { messageId: 'upstreamOutOfOrder' },
        ],
        output: [
          "import s from './s';\nimport i from './';\nimport p from '../p';\nimport u from '~/u';\nimport v from 'vendored';\nimport h from 'hoisted-pkg';\nimport fs from 'fs';\n",
          "import p from '../p';\nimport s from './s';\nimport i from './';\nimport u from '~/u';\nimport v from 'vendored';\nimport h from 'hoisted-pkg';\nimport fs from 'fs';\n",
          "import u from '~/u';\nimport p from '../p';\nimport s from './s';\nimport i from './';\nimport v from 'vendored';\nimport h from 'hoisted-pkg';\nimport fs from 'fs';\n",
          "import v from 'vendored';\nimport u from '~/u';\nimport p from '../p';\nimport s from './s';\nimport i from './';\nimport h from 'hoisted-pkg';\nimport fs from 'fs';\n",
          "import h from 'hoisted-pkg';\nimport v from 'vendored';\nimport u from '~/u';\nimport p from '../p';\nimport s from './s';\nimport i from './';\nimport fs from 'fs';\n",
          "import fs from 'fs';\nimport h from 'hoisted-pkg';\nimport v from 'vendored';\nimport u from '~/u';\nimport p from '../p';\nimport s from './s';\nimport i from './';\n",
        ],
      },
      {
        name: 'import/external-module-folders makes a resolved vendor folder external',
        code: "import x from '~/x';\nimport v from 'vendored';\n",
        filename: at('app/src/file.ts'),
        options: [{ groups: ['external', 'internal'], distinctGroup: true }],
        settings: {
          'import/external-module-folders': ['node_modules', 'vendor'],
        },
        errors: [{ messageId: 'upstreamOutOfOrder' }],
        output: "import v from 'vendored';\nimport x from '~/x';\n",
      },
      {
        name: 'pathGroups: an `after` path group out of place',
        code: "import app from '@app/x';\nimport x from 'ext-x';\nimport React from 'react';\n",
        filename: at('app/src/file.ts'),
        options: [
          {
            groups: ['builtin', 'external', 'internal'],
            pathGroupsExcludedImportTypes: ['builtin'],
            pathGroups: [
              { pattern: 'react', group: 'external', position: 'before' },
              { pattern: '@app/**', group: 'external', position: 'after' },
            ],
          },
        ],
        errors: [
          { messageId: 'upstreamOutOfOrder' },
          { messageId: 'upstreamOutOfOrder' },
        ],
        output: [
          "import x from 'ext-x';\nimport app from '@app/x';\nimport React from 'react';\n",
          "import React from 'react';\nimport x from 'ext-x';\nimport app from '@app/x';\n",
        ],
      },
      {
        name: 'pathGroups: more than ten in one position widen the scale',
        code: "import p1 from 'p1';\nimport p0 from 'p0';\n",
        filename: at('app/src/file.ts'),
        options: [
          {
            pathGroupsExcludedImportTypes: [],
            pathGroups: [
              { pattern: 'p0', group: 'external', position: 'before' },
              { pattern: 'p1', group: 'external', position: 'before' },
              { pattern: 'p2', group: 'external', position: 'before' },
              { pattern: 'p3', group: 'external', position: 'before' },
              { pattern: 'p4', group: 'external', position: 'before' },
              { pattern: 'p5', group: 'external', position: 'before' },
              { pattern: 'p6', group: 'external', position: 'before' },
              { pattern: 'p7', group: 'external', position: 'before' },
              { pattern: 'p8', group: 'external', position: 'before' },
              { pattern: 'p9', group: 'external', position: 'before' },
              { pattern: 'p10', group: 'external', position: 'before' },
            ],
          },
        ],
        errors: [{ messageId: 'upstreamOutOfOrder' }],
        output: "import p0 from 'p0';\nimport p1 from 'p1';\n",
      },
      {
        name: 'patternOptions.matchBase matches a slash-free pattern against the basename only',
        code: "import css from './x/y.css';\nimport i from './';\nimport svg from './x/y.svg';\n",
        filename: at('app/src/file.ts'),
        options: [
          {
            pathGroupsExcludedImportTypes: [],
            pathGroups: [
              {
                pattern: '*.css',
                patternOptions: { matchBase: true },
                group: 'index',
                position: 'after',
              },
              {
                pattern: 'x/*.svg',
                patternOptions: { matchBase: true },
                group: 'builtin',
                position: 'before',
              },
            ],
          },
        ],
        errors: [
          { messageId: 'upstreamOutOfOrder' },
          { messageId: 'upstreamOutOfOrder' },
        ],
        output: [
          "import i from './';\nimport css from './x/y.css';\nimport svg from './x/y.svg';\n",
          "import svg from './x/y.svg';\nimport i from './';\nimport css from './x/y.css';\n",
        ],
      },
      {
        name: 'patternOptions.nocase',
        code: "import fs from 'fs';\nimport React from 'react';\n",
        filename: at('app/src/file.ts'),
        options: [
          {
            pathGroupsExcludedImportTypes: [],
            pathGroups: [
              {
                pattern: 'REACT',
                patternOptions: { nocase: true },
                group: 'builtin',
                position: 'before',
              },
            ],
          },
        ],
        errors: [{ messageId: 'upstreamOutOfOrder' }],
        output: "import React from 'react';\nimport fs from 'fs';\n",
      },
      {
        name: 'patternOptions.nonegate reads a leading `!` literally',
        code: "import fs from 'fs';\nimport bang from '!/x';\n",
        filename: at('app/src/file.ts'),
        options: [
          {
            pathGroups: [
              {
                pattern: '!/**',
                patternOptions: { nonegate: true },
                group: 'builtin',
                position: 'before',
              },
            ],
          },
        ],
        errors: [{ messageId: 'upstreamOutOfOrder' }],
        output: "import bang from '!/x';\nimport fs from 'fs';\n",
      },
      {
        name: 'patternOptions.nocomment lets a `#` pattern match',
        code: "import fs from 'fs';\nimport x from '#x';\n",
        filename: at('app/src/file.ts'),
        options: [
          {
            pathGroupsExcludedImportTypes: [],
            pathGroups: [
              {
                pattern: '#x',
                patternOptions: { nocomment: true },
                group: 'builtin',
                position: 'before',
              },
            ],
          },
        ],
        errors: [{ messageId: 'upstreamOutOfOrder' }],
        output: "import x from '#x';\nimport fs from 'fs';\n",
      },
      {
        name: 'the `type` group: a type-only import ranks by its own group',
        code: "import type { T } from './t';\nimport fs from 'fs';\n",
        filename: at('app/src/file.ts'),
        options: [
          {
            groups: [['builtin', 'external'], 'type'],
            'newlines-between': 'always',
          },
        ],
        errors: [
          { messageId: 'upstreamMissingNewline' },
          { messageId: 'upstreamOutOfOrder' },
        ],
        output: [
          "import fs from 'fs';\nimport type { T } from './t';\n",
          "import fs from 'fs';\n\nimport type { T } from './t';\n",
        ],
      },
      {
        name: 'pathGroupsExcludedImportTypes: type keeps a type import out of path groups',
        code: "import type { T } from '~/t';\nimport x from '~/x';\n",
        filename: at('app/src/file.ts'),
        options: [
          {
            groups: ['external', 'type'],
            pathGroupsExcludedImportTypes: ['type'],
            pathGroups: [
              { pattern: '~/**', group: 'external', position: 'after' },
            ],
          },
        ],
        errors: [{ messageId: 'upstreamOutOfOrder' }],
        output: "import x from '~/x';\nimport type { T } from '~/t';\n",
      },
      {
        name: 'sortTypesGroup orders type imports by their module type, within the type group',
        code: "import x from 'ext';\n\nimport a from './a';\nimport type { B } from './b';\nimport type { E } from 'ext';\n",
        filename: at('app/src/file.ts'),
        options: [
          {
            groups: ['external', 'sibling', 'type'],
            sortTypesGroup: true,
            'newlines-between': 'always',
            'newlines-between-types': 'never',
            alphabetize: { order: 'asc' },
          },
        ],
        errors: [{ messageId: 'upstreamOutOfOrder' }],
        output:
          "import x from 'ext';\n\nimport a from './a';\nimport type { E } from 'ext';\nimport type { B } from './b';\n",
      },
      {
        name: 'orderImportKind asc puts a type import before a value import of the same module',
        code: "import { A } from 'a';\nimport type { B } from 'a';\n",
        filename: at('app/src/file.ts'),
        options: [{ alphabetize: { order: 'asc', orderImportKind: 'asc' } }],
        errors: [{ messageId: 'upstreamOutOfOrder' }],
        output: "import type { B } from 'a';\nimport { A } from 'a';\n",
      },
      {
        name: 'orderImportKind desc puts a value import before a type import of the same module',
        code: "import type { B } from 'a';\nimport { A } from 'a';\n",
        filename: at('app/src/file.ts'),
        options: [{ alphabetize: { order: 'desc', orderImportKind: 'desc' } }],
        errors: [{ messageId: 'upstreamOutOfOrder' }],
        output: "import { A } from 'a';\nimport type { B } from 'a';\n",
      },
      {
        name: 'top-level require() calls are ordered; other calls and nested requires are not',
        code: "const a = require('./a');\nconst fs = require('fs');\nconst b = require('b').x;\nconst c = require('c')();\nfoo('x');\nrequire(x);\nrequire('a', 'b');\nfunction f() { const z = require('z'); }\n",
        filename: at('app/src/file.ts'),
        options: [{ distinctGroup: true }],
        errors: [{ messageId: 'upstreamOutOfOrder' }],
      },
      {
        name: 'a require() ranks after imports',
        code: "const b = require('b');\nimport a from 'a';\n",
        filename: at('app/src/file.ts'),
        options: [{ distinctGroup: true }],
        errors: [{ messageId: 'upstreamOutOfOrder' }],
        output: "import a from 'a';\nconst b = require('b');\n",
      },
      {
        name: 'a require() with a member access spanning lines',
        code: "const fs = require('fs');\nconst b = require('b')\n  .x;\n",
        filename: at('app/src/file.ts'),
        options: [{ distinctGroup: true, 'newlines-between': 'always' }],
        errors: [{ messageId: 'upstreamMissingNewline' }],
        output: "const fs = require('fs');\n\nconst b = require('b')\n  .x;\n",
      },
      {
        name: 'named: import specifiers are ordered',
        code: "import { b, a, c } from 'x';\n",
        filename: at('app/src/file.ts'),
        options: [{ named: true, alphabetize: { order: 'asc' } }],
        errors: [{ messageId: 'upstreamOutOfOrder' }],
        output: "import { a, b, c } from 'x';\n",
      },
      {
        name: 'named: the report names the fewer out-of-place specifiers (`after`)',
        code: "import { c, a, b } from 'x';\n",
        filename: at('app/src/file.ts'),
        options: [{ named: true, alphabetize: { order: 'asc' } }],
        errors: [{ messageId: 'upstreamOutOfOrder' }],
        output: "import { a, b, c } from 'x';\n",
      },
      {
        name: 'named.types types-first',
        code: 'const a = 1;\ntype B = 1;\nexport { a, type B };\n',
        filename: at('app/src/file.ts'),
        options: [{ named: { enabled: true, types: 'types-first' } }],
        errors: [{ messageId: 'upstreamOutOfOrder' }],
        output: 'const a = 1;\ntype B = 1;\nexport { type B, a };\n',
      },
      {
        name: 'named.types types-last',
        code: 'const a = 1;\ntype B = 1;\nexport { type B, a };\n',
        filename: at('app/src/file.ts'),
        options: [{ named: { export: true, types: 'types-last' } }],
        errors: [{ messageId: 'upstreamOutOfOrder' }],
        output: 'const a = 1;\ntype B = 1;\nexport { a, type B };\n',
      },
      {
        name: 'differs from eslint-plugin-import (which crashes on a rest element): named.require orders destructured requires',
        code: "const { b, a: c } = require('x');\nconst { ...rest } = require('y');\nconst { z } = foo('z');\n",
        filename: at('app/src/file.ts'),
        options: [{ named: { require: true }, alphabetize: { order: 'asc' } }],
        errors: [{ messageId: 'upstreamOutOfOrder' }],
        output:
          "const { a: c, b } = require('x');\nconst { ...rest } = require('y');\nconst { z } = foo('z');\n",
      },
      {
        name: 'named.cjsExports orders module.exports / exports object literals',
        code: 'module.exports = { b, a };\nexports = { d, c };\nmodule.exports = { ...s, a };\n',
        filename: at('app/src/file.ts'),
        options: [
          { named: { cjsExports: true }, alphabetize: { order: 'asc' } },
        ],
        errors: [
          { messageId: 'upstreamOutOfOrder' },
          { messageId: 'upstreamOutOfOrder' },
        ],
        output:
          'module.exports = { a, b };\nexports = { c, d };\nmodule.exports = { ...s, a };\n',
      },
      {
        // `exports['c']` is the same export as `exports.c`, so it is ordered
        // too (eslint-plugin-import reads only the dotted form); `exports[c]`
        // names nothing static and is left alone.
        name: "named.cjsExports orders exports.x and exports['x'] assignments alike",
        // `exports[d]` first: were it read as an export named `d`, sorting
        // would move it, and the outputs below would not hold.
        code: "exports[d] = 6;\nexports.b = 1;\nmodule.exports.a = 2;\nexports['c'] = 3;\nfoo.bar = 4;\nexports.a.z = 5;\n",
        filename: at('app/src/file.ts'),
        options: [
          { named: { cjsExports: true }, alphabetize: { order: 'asc' } },
        ],
        errors: [
          { messageId: 'upstreamOutOfOrder' },
          { messageId: 'upstreamOutOfOrder' },
        ],
        output: [
          "exports[d] = 6;\nmodule.exports.a = 2;\nexports.b = 1;\nexports['c'] = 3;\nfoo.bar = 4;\nexports.a.z = 5;\n",
          "exports[d] = 6;\nmodule.exports.a = 2;\nexports.a.z = 5;\nexports.b = 1;\nexports['c'] = 3;\nfoo.bar = 4;\n",
        ],
      },
      {
        name: 'differs from eslint-plugin-import: an export assignment is not moved across other code',
        code: 'exports.b = 1;\nfoo();\nexports.a = 2;\n',
        filename: at('app/src/file.ts'),
        options: [
          { named: { cjsExports: true }, alphabetize: { order: 'asc' } },
        ],
        errors: [{ messageId: 'upstreamOutOfOrder' }],
      },
      {
        name: 'named.cjsExports inside a block',
        code: 'if (x) {\n  exports.b = 1;\n  exports.a = 2;\n}\n',
        filename: at('app/src/file.ts'),
        options: [
          { named: { cjsExports: true }, alphabetize: { order: 'asc' } },
        ],
        errors: [{ messageId: 'upstreamOutOfOrder' }],
        output: 'if (x) {\n  exports.a = 2;\n  exports.b = 1;\n}\n',
      },
      {
        name: 'differs from eslint-plugin-import (which prints `undefined`): string-named specifiers order by their string',
        code: "import { 'b-x' as bx, a } from 'x';\nconst q = 1;\nexport { q as 'z-z', q as y };\n",
        filename: at('app/src/file.ts'),
        options: [{ named: true, alphabetize: { order: 'asc' } }],
        errors: [
          { messageId: 'upstreamOutOfOrder' },
          { messageId: 'upstreamOutOfOrder' },
        ],
        output:
          "import { a, 'b-x' as bx } from 'x';\nconst q = 1;\nexport { q as y, q as 'z-z' };\n",
      },
      {
        name: 'named: two aliases of one name are told apart in the message',
        code: "import { A as C, A as B } from 'x';\n",
        filename: at('app/src/file.ts'),
        options: [{ named: true, alphabetize: { order: 'asc' } }],
        errors: [{ messageId: 'upstreamOutOfOrder' }],
        output: "import { A as B, A as C } from 'x';\n",
      },
      {
        name: 'named: an alias after the unaliased name',
        code: "import { A as B, A } from 'x';\n",
        filename: at('app/src/file.ts'),
        options: [{ named: true, alphabetize: { order: 'asc' } }],
        errors: [{ messageId: 'upstreamOutOfOrder' }],
        output: "import { A, A as B } from 'x';\n",
      },
      {
        name: 'named: an alias before the unaliased name, descending',
        code: "import { A, A as B } from 'x';\n",
        filename: at('app/src/file.ts'),
        options: [{ named: true, alphabetize: { order: 'desc' } }],
        errors: [{ messageId: 'upstreamOutOfOrder' }],
        output: "import { A as B, A } from 'x';\n",
      },
      {
        name: 'newlines-between always: missing between groups, extra within one',
        code: "import fs from 'fs'; // builtin\nimport x from 'x'; // trailing\nimport y from 'y';\n\nimport z from 'z';\n\n// note\nimport a from './a';\n",
        filename: at('app/src/file.ts'),
        options: [{ 'newlines-between': 'always' }],
        errors: [
          { messageId: 'upstreamMissingNewline' },
          { messageId: 'upstreamNewlineInGroup' },
        ],
        output:
          "import fs from 'fs'; // builtin\n\nimport x from 'x'; // trailing\nimport y from 'y';\nimport z from 'z';\n\n// note\nimport a from './a';\n",
      },
      {
        name: 'newlines-between never',
        code: "import fs from 'fs';\n\nimport x from 'x';\n",
        filename: at('app/src/file.ts'),
        options: [{ 'newlines-between': 'never' }],
        errors: [{ messageId: 'upstreamNewlineBetweenGroups' }],
        output: "import fs from 'fs';\nimport x from 'x';\n",
      },
      {
        name: 'newlines-between always-and-inside-groups allows a blank line inside a group',
        code: "import fs from 'fs';\n\nimport path from 'path';\nimport x from 'x';\n",
        filename: at('app/src/file.ts'),
        options: [{ 'newlines-between': 'always-and-inside-groups' }],
        errors: [{ messageId: 'upstreamMissingNewline' }],
        output:
          "import fs from 'fs';\n\nimport path from 'path';\n\nimport x from 'x';\n",
      },
      {
        name: 'distinctGroup false: a path group is not a group of its own',
        code: "import React from 'react';\nimport x from 'x';\n\nimport y from 'y';\n",
        filename: at('app/src/file.ts'),
        options: [
          {
            'newlines-between': 'always',
            distinctGroup: false,
            pathGroupsExcludedImportTypes: [],
            pathGroups: [
              { pattern: 'react', group: 'external', position: 'before' },
            ],
          },
        ],
        errors: [{ messageId: 'upstreamNewlineInGroup' }],
        output:
          "import React from 'react';\nimport x from 'x';\nimport y from 'y';\n",
      },
      {
        name: 'import-next’s newlinesBetween, written beside an upstream key, means newlines-between',
        code: "import fs from 'fs';\nimport x from 'x';\n",
        filename: at('app/src/file.ts'),
        options: [{ newlinesBetween: 'always', distinctGroup: true }],
        errors: [{ messageId: 'upstreamMissingNewline' }],
        output: "import fs from 'fs';\n\nimport x from 'x';\n",
      },
      {
        name: 'import-next’s internalPatterns, written beside an upstream key, classify as internal',
        code: "import t from '~/t';\nimport x from 'x';\n",
        filename: at('app/src/file.ts'),
        options: [
          {
            internalPatterns: ['^~/'],
            groups: ['external', 'internal'],
            distinctGroup: true,
          },
        ],
        errors: [{ messageId: 'upstreamOutOfOrder' }],
        output: "import x from 'x';\nimport t from '~/t';\n",
      },
      {
        name: 'consolidateIslands inside-groups',
        code: "import a from 'a';\nimport {\n  b,\n} from 'b';\nimport c from 'c';\n\nimport d from 'd';\n",
        filename: at('app/src/file.ts'),
        options: [
          {
            'newlines-between': 'always-and-inside-groups',
            consolidateIslands: 'inside-groups',
          },
        ],
        errors: [
          { messageId: 'upstreamIslandBeforeMultiline' },
          { messageId: 'upstreamIslandAfterMultiline' },
          { messageId: 'upstreamIslandSingleLines' },
        ],
        output:
          "import a from 'a';\n\nimport {\n  b,\n} from 'b';\n\nimport c from 'c';\nimport d from 'd';\n",
      },
      {
        name: 'consolidateIslands with sortTypesGroup',
        code: "import a from 'a';\nimport {\n  b,\n} from 'b';\nimport type { C } from 'c';\n\nimport type { D } from 'd';\n",
        filename: at('app/src/file.ts'),
        options: [
          {
            groups: ['external', 'type'],
            sortTypesGroup: true,
            'newlines-between': 'never',
            'newlines-between-types': 'always-and-inside-groups',
            consolidateIslands: 'inside-groups',
          },
        ],
        errors: [
          { messageId: 'upstreamIslandBeforeMultiline' },
          { messageId: 'upstreamMissingNewline' },
          { messageId: 'upstreamIslandSingleLines' },
        ],
        output:
          "import a from 'a';\n\nimport {\n  b,\n} from 'b';\n\nimport type { C } from 'c';\nimport type { D } from 'd';\n",
      },
      {
        name: 'import-next’s side-effect group, in upstream form, ranks unassigned imports (reported, never moved)',
        code: "import fs from 'fs';\nimport './polyfill';\n",
        filename: at('app/src/file.ts'),
        options: [
          {
            groups: ['side-effect', 'builtin', 'external'],
            distinctGroup: true,
          },
        ],
        errors: [{ messageId: 'upstreamOutOfOrder' }],
      },
      {
        name: 'warnOnUnassignedImports ranks unassigned imports (reported, never moved)',
        code: "import './a';\nimport fs from 'fs';\n",
        filename: at('app/src/file.ts'),
        options: [{ warnOnUnassignedImports: true }],
        errors: [{ messageId: 'upstreamOutOfOrder' }],
      },
      {
        name: 'import-equals: `= require()` by module type, `= A.B` in the object group, `export import` alone',
        code: "import x = require('./x');\nimport fs = require('fs');\nimport A = B.C;\nexport import E = require('e');\n",
        filename: at('app/src/file.ts'),
        options: [
          { groups: ['object', 'builtin', 'sibling'], distinctGroup: true },
        ],
        errors: [
          { messageId: 'upstreamOutOfOrder' },
          { messageId: 'upstreamOutOfOrder' },
        ],
        output:
          "import fs = require('fs');\nimport x = require('./x');\nimport A = B.C;\nexport import E = require('e');\n",
      },
      {
        name: 'imports in a module declaration are ordered as their own block',
        code: "declare module 'm' {\n  import b from './b';\n  import a from 'fs';\n}\n",
        filename: at('app/src/file.ts'),
        options: [{ distinctGroup: true }],
        errors: [{ messageId: 'upstreamOutOfOrder' }],
        output:
          "declare module 'm' {\n  import a from 'fs';\n  import b from './b';\n}\n",
      },
      {
        name: 'the fix carries same-line comments with the import',
        code: "/* c1 */ import a from './a'; /* c2 */\n  import fs from 'fs'; // c3",
        filename: at('app/src/file.ts'),
        options: [{ distinctGroup: true }],
        errors: [{ messageId: 'upstreamOutOfOrder' }],
        output:
          "  import fs from 'fs'; // c3\n/* c1 */ import a from './a'; /* c2 */\n",
      },
      {
        name: 'no fix across other code',
        code: "import a from './a';\nfoo();\nimport fs from 'fs';\n",
        filename: at('app/src/file.ts'),
        options: [{ distinctGroup: true }],
        errors: [{ messageId: 'upstreamOutOfOrder' }],
      },
      {
        name: 'no fix across a multi-declarator require',
        code: "const a = require('./a'), q = 1;\nconst fs = require('fs');\n",
        filename: at('app/src/file.ts'),
        options: [{ distinctGroup: true }],
        errors: [{ messageId: 'upstreamOutOfOrder' }],
      },
      {
        name: 'the fix crosses require declarations with member calls and patterns',
        code: "const a = require('./a');\nconst z = require('z').y();\nconst { w } = require('w');\nconst fs = require('fs');\n",
        filename: at('app/src/file.ts'),
        options: [{ distinctGroup: true }],
        errors: [
          { messageId: 'upstreamOutOfOrder' },
          { messageId: 'upstreamOutOfOrder' },
          { messageId: 'upstreamOutOfOrder' },
        ],
        output: [
          "const z = require('z').y();\nconst a = require('./a');\nconst { w } = require('w');\nconst fs = require('fs');\n",
          "const fs = require('fs');\nconst z = require('z').y();\nconst a = require('./a');\nconst { w } = require('w');\n",
          "const fs = require('fs');\nconst z = require('z').y();\nconst { w } = require('w');\nconst a = require('./a');\n",
        ],
      },
      {
        name: 'no fix across a declaration without a require',
        code: "const a = require('./a');\nlet q;\nconst fs = require('fs');\n",
        filename: at('app/src/file.ts'),
        options: [{ distinctGroup: true }],
        errors: [{ messageId: 'upstreamOutOfOrder' }],
      },
      {
        name: 'alphabetize compares path segments, caseInsensitive',
        code: "import a from 'foo/b';\nimport b from 'Foo';\nimport c from 'foo/a/x';\nimport d from '../z';\nimport e from '../a';\nimport f from './b/c';\nimport g from './b';\n",
        filename: at('app/src/file.ts'),
        options: [
          {
            alphabetize: { order: 'asc', caseInsensitive: true },
            distinctGroup: true,
          },
        ],
        errors: [
          { messageId: 'upstreamOutOfOrder' },
          { messageId: 'upstreamOutOfOrder' },
          { messageId: 'upstreamOutOfOrder' },
        ],
        output: [
          "import b from 'Foo';\nimport c from 'foo/a/x';\nimport a from 'foo/b';\nimport d from '../z';\nimport e from '../a';\nimport g from './b';\nimport f from './b/c';\n",
          "import b from 'Foo';\nimport c from 'foo/a/x';\nimport a from 'foo/b';\nimport e from '../a';\nimport d from '../z';\nimport g from './b';\nimport f from './b/c';\n",
        ],
      },
      {
        name: 'no fix across an array-pattern require',
        code: "const a = require('./a');\nconst [w] = require('w');\nconst fs = require('fs');\n",
        filename: at('app/src/file.ts'),
        options: [{ distinctGroup: true }],
        errors: [
          { messageId: 'upstreamOutOfOrder' },
          { messageId: 'upstreamOutOfOrder' },
        ],
      },
      {
        name: 'newlines-between never: no fix across a comment',
        code: "import fs from 'fs';\n\n// c\nimport x from 'x';\n",
        filename: at('app/src/file.ts'),
        options: [{ 'newlines-between': 'never' }],
        errors: [{ messageId: 'upstreamNewlineBetweenGroups' }],
      },
      {
        name: 'consolidateIslands overrides newlines-between-types never next to a multi-line import',
        code: "import a from 'a';\nimport type {\n  B,\n} from 'b';\nimport type { C } from 'c';\n",
        filename: at('app/src/file.ts'),
        options: [
          {
            groups: ['external', 'type'],
            sortTypesGroup: true,
            'newlines-between': 'always-and-inside-groups',
            'newlines-between-types': 'never',
            consolidateIslands: 'inside-groups',
          },
        ],
        errors: [
          { messageId: 'upstreamMissingNewline' },
          { messageId: 'upstreamIslandAfterMultiline' },
        ],
        output:
          "import a from 'a';\n\nimport type {\n  B,\n} from 'b';\n\nimport type { C } from 'c';\n",
      },
      {
        name: 'newlines-between-types never between the value and type groups',
        code: "import a from 'a';\n\nimport type { T } from 't';\n",
        filename: at('app/src/file.ts'),
        options: [
          {
            groups: ['external', 'type'],
            sortTypesGroup: true,
            'newlines-between': 'always',
            'newlines-between-types': 'never',
          },
        ],
        errors: [{ messageId: 'upstreamNewlineBetweenGroups' }],
        output: "import a from 'a';\nimport type { T } from 't';\n",
      },
    ],
  });
});
