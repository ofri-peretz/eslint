/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Edges pinned by mutation testing: each case below is an input on which a
 * surviving Stryker mutant and the rule disagreed. Cases named `BUG:` were
 * wrong verdicts the survivors led to.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnboundedDecompression } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const REQUIRE = `const zlib = require('zlib');\n`;

const error = (fn: string) => ({
  messageId: 'unboundedDecompression' as const,
  data: { fn },
});

ruleTester.run('mutation-guided edges', noUnboundedDecompression, {
  valid: [
    {
      name: 'a package whose name ends in zlib is not node:zlib',
      code: `export async function f(body) { const zlib = await import('browserify-zlib'); return zlib.gunzipSync(body); }`,
    },
    {
      name: 'a package whose name starts with zlib is not node:zlib',
      code: `export async function f(body) { const zlib = await import('zlib-sync'); return zlib.gunzipSync(body); }`,
    },
    {
      name: 'a member call on a built-in global is not zlib',
      code: 'const value = JSON.parse(text);',
    },
    {
      name: 'a call whose callee is itself a call is not zlib',
      code: 'const value = getParser()(input);',
    },
    {
      name: 'an awaited loader that is not import() binds nothing from zlib',
      code: 'export async function f(body) { const zlib = await loadZlib(); return zlib.gunzipSync(body); }',
    },
  ],
  invalid: [
    {
      name: "the bare 'zlib' specifier in await import() is the same module",
      code: `export async function f(body) { const zlib = await import('zlib'); return zlib.gunzipSync(body); }`,
      errors: [error('gunzipSync')],
    },
    {
      name: 'BUG: a template-literal specifier in await import() is the same module',
      code: 'export async function f(body) { const zlib = await import(`node:zlib`); return zlib.gunzipSync(body); }',
      errors: [error('gunzipSync')],
    },
    {
      name: 'a module-scope await import() binding is resolved from inside a function',
      code: `const zlib = await import('node:zlib');
export function f(body) { return zlib.gunzipSync(body); }`,
      errors: [error('gunzipSync')],
    },
    {
      name: 'a destructure resolves the property that binds the called name, not the first one',
      code: `export async function f(body) { const { constants, gunzipSync } = await import('node:zlib'); return gunzipSync(body); }`,
      errors: [error('gunzipSync')],
    },
    {
      name: 'a file read from a literal path is not a literal payload',
      code: `${REQUIRE}const fs = require('fs');\nzlib.gunzipSync(fs.readFileSync('upload.gz'));`,
      errors: [error('gunzipSync')],
    },
    {
      name: 'Buffer.from of a runtime value is not a literal payload',
      code: `${REQUIRE}zlib.gunzipSync(Buffer.from(req.body));`,
      errors: [error('gunzipSync')],
    },
    {
      name: 'BUG: an extra argument after the options does not hide an uncapped options literal',
      code: `${REQUIRE}zlib.gunzipSync(input, {}, onDone);`,
      errors: [error('gunzipSync')],
    },
    {
      name: 'BUG: the async form reads the options from the second argument, whatever follows',
      code: `${REQUIRE}zlib.gunzip(input, { level: 1 }, onDone, extra);`,
      errors: [error('gunzip')],
    },
  ],
});
