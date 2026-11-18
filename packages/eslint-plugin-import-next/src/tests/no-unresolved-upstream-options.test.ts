/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `no-unresolved` under eslint-plugin-import's options, with its meaning.
 *
 * `commonjs`, `amd`, `esmodule`, `caseSensitive` and `caseSensitiveStrict`
 * were rejected, so a config carried over from `import/no-unresolved` failed
 * to load (32 of eslint-plugin-import's own cases, graded by
 * benchmarks/suites/ilb-competitor-parity/import-drop-in.mts). An `ignore`
 * entry written as a regular expression (`'\\.png$'`) never matched, and the
 * `import/core-modules` setting was not honoured.
 *
 * The casing check reads directory listings. A case-sensitive file system
 * (CI) cannot hold a mis-cased path that resolves, so `readdirSync` is
 * wrapped: for two directories it answers with one name re-cased, which is
 * what a case-insensitive file system shows when the specifier's casing
 * differs from the disk's. Every other call is the real one.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll, vi } from 'vitest';
import parser from '@typescript-eslint/parser';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { noUnresolved } from '../rules/no-unresolved';

const dir = fs.realpathSync(
  fs.mkdtempSync(path.join(os.tmpdir(), 'no-unresolved-upstream-')),
);
const write = (name: string) => {
  fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
  fs.writeFileSync(path.join(dir, name), 'export const x = 1;\n');
};
write('bar.js');
write('case/Widget.js');
write('case/Other.js');
const filename = path.join(dir, 'importer.js');
const tsFilename = path.join(dir, 'importer.ts');
/** A real file below the working directory (the package root). */
const inCwd = path.join(process.cwd(), 'src/tests/importer.ts');
afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

/** Directory → the entry a case-insensitive disk spells differently. */
const RECASED = new Map([
  [path.join(dir, 'case'), 'Widget.js'],
  [path.dirname(process.cwd()), path.basename(process.cwd())],
]);
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    readdirSync: (...args: Parameters<typeof actual.readdirSync>) => {
      const names = actual.readdirSync(...args);
      const recased = RECASED.get(String(args[0]));
      return recased
        ? (names as string[]).map((name) =>
            name === recased ? name.toUpperCase() : name,
          )
        : names;
    },
  };
});

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const notFound = (line: string) => ({
  messageId: 'moduleNotFound' as const,
  suggestions: [
    {
      messageId: 'addIgnoreComment' as const,
      output: `// eslint-disable-next-line import-next/no-unresolved\n${line}`,
    },
  ],
});

describe('no-unresolved — eslint-plugin-import options', () => {
  ruleTester.run('no-unresolved', noUnresolved, {
    valid: [
      {
        name: 'commonjs: false skips require()',
        filename,
        code: "require('./does-not-exist');",
        options: [{ commonjs: false }],
      },
      {
        name: 'commonjs: false skips TS import-equals',
        filename: tsFilename,
        code: "import x = require('./does-not-exist');",
        options: [{ commonjs: false }],
      },
      {
        name: 'commonjs: true checks require() that resolves',
        filename,
        code: "require('./bar');",
        options: [{ commonjs: true }],
      },
      {
        name: 'esmodule: false skips every ES module spelling',
        filename,
        code: "import './nope';\nexport * from './nope';\nexport { a } from './nope';\nimport('./nope');",
        options: [{ esmodule: false }],
      },
      {
        name: 'amd: true resolves define() dependencies, magic modules skipped',
        filename,
        code: "define(['./bar', 'require', 'exports', 'module'], function () {});",
        options: [{ amd: true }],
      },
      {
        name: 'amd: true resolves require([...], fn)',
        filename,
        code: "require(['./bar'], function (bar) {});",
        options: [{ amd: true }],
      },
      {
        name: 'amd: true skips holes, spreads and non-string entries',
        filename,
        code: "define([0, foo, , ...rest, './bar'], function () {});",
        options: [{ amd: true }],
      },
      {
        name: 'amd: true reads only the two-argument, array-first form',
        filename,
        code: "require(['./nope']);\nload(['./nope'], f);\nobj.define(['./nope'], f);\ndefine('./nope', f);",
        options: [{ amd: true }],
      },
      {
        name: 'AMD dependency arrays are not read without amd',
        filename,
        code: "require(['./nope'], function () {});",
      },
      {
        name: 'ignore: a regular expression entry',
        filename,
        code: "import './test.png';\nimport './test.gif';",
        options: [{ ignore: ['\\.png$', '.gif$'] }],
      },
      {
        name: 'ignore: a name with regex characters still matches itself literally',
        filename,
        code: "import 'virtual:icons?raw';",
        options: [{ ignore: ['virtual:icons?raw'] }],
      },
      {
        name: 'ignore: an entry that is not a valid expression is a literal name',
        filename,
        code: "import 'pkg(v1';\nimport 'pkg(v1/sub';",
        options: [{ ignore: ['pkg(v1'] }],
      },
      {
        name: 'import/core-modules: a declared runtime module',
        filename,
        code: "import 'electron';",
        settings: { 'import/core-modules': ['electron'] },
      },
      {
        name: 'caseSensitive: the casing matches the disk',
        filename,
        code: "import './case/Other.js';\nimport './bar.js';",
        options: [{ caseSensitive: true }],
      },
      {
        name: 'caseSensitive: false does not check casing',
        filename,
        code: "import './case/Widget.js';",
        options: [{ caseSensitive: false }],
      },
      {
        name: 'caseSensitive stops at the working directory',
        filename: inCwd,
        code: "import '../rules/no-unresolved';",
        options: [{ caseSensitive: true }],
      },
    ],
    invalid: [
      {
        name: 'commonjs: true reports an unresolved require()',
        filename,
        code: "require('./does-not-exist');",
        options: [{ commonjs: true }],
        errors: [notFound("require('./does-not-exist');")],
      },
      {
        name: 'esmodule: false still checks require()',
        filename,
        code: "require('./does-not-exist');",
        options: [{ esmodule: false }],
        errors: [notFound("require('./does-not-exist');")],
      },
      {
        name: 'amd: true reports each unresolved dependency',
        filename,
        code: "define(['./nope', './bar', './gone'], function () {});",
        options: [{ amd: true }],
        errors: [
          notFound("define(['./nope', './bar', './gone'], function () {});"),
          notFound("define(['./nope', './bar', './gone'], function () {});"),
        ],
      },
      {
        name: 'ignore: a regular expression that does not match',
        filename,
        code: "import './test.svg';",
        options: [{ ignore: ['\\.png$'] }],
        errors: [notFound("import './test.svg';")],
      },
      {
        name: 'caseSensitive: the casing differs from the disk',
        filename,
        code: "import './case/Widget.js';",
        options: [{ caseSensitive: true }],
        errors: [{ messageId: 'casingMismatch' }],
      },
      {
        name: 'caseSensitiveStrict: the casing differs above the working directory',
        filename: inCwd,
        code: "import '../rules/no-unresolved';",
        options: [{ caseSensitiveStrict: true, caseSensitive: false }],
        errors: [{ messageId: 'casingMismatch' }],
      },
    ],
  });
});
