/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A value that only names a file is a uniquifier, not a secret.
 *
 * Vite's config loader writes a temp file whose name must not collide:
 *
 *   const hash = `timestamp-${Date.now()}-${Math.random().toString(16).slice(2)}`
 *   const tempFileName = path.resolve(dir, `${base}.${hash}.mjs`)
 *
 * The binding is called `hash`, which is on this rule's vocabulary, so it
 * reported. But a name like `hash`, `key` or `code` is an everyday word for an
 * identifier, and here every read of it lands in a file name. Nothing about it
 * has to be unguessable.
 *
 * What stays reported: a STRONG secret word (`token`, `salt`, `nonce`, ...) even
 * when it names a file, any binding that is also used for something other than
 * a file name, and a binding nothing reads at all.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noMathRandomCrypto } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const weak = [{ messageId: 'mathRandomCrypto' as const }];

ruleTester.run(
  'no-math-random-crypto: file-name uniquifier',
  noMathRandomCrypto,
  {
    valid: [
      {
        name: 'vite config.ts: a timestamped suffix inside a template that ends in an extension',
        code: [
          'const hash = `timestamp-${Date.now()}-${Math.random().toString(16).slice(2)}`;',
          'const tempFileName = viteTempDir',
          '  ? path.resolve(viteTempDir, `${path.basename(fileName)}.${hash}.mjs`)',
          '  : `${fileName}.${hash}.mjs`;',
        ].join('\n'),
      },
      {
        name: 'a key that only names a file',
        code: 'const key = Math.random().toString(36).slice(2); fs.writeFileSync(`${key}.tmp`, data);',
      },
      {
        name: 'a code used as a path segment through path.join',
        code: "const code = Math.random().toString(36).slice(2); const out = path.join(dir, 'build', code);",
      },
      {
        name: 'the second path of a two-path fs method',
        code: 'const key = Math.random().toString(36).slice(2); fs.copyFileSync(src, `${key}.bak`);',
      },
      {
        name: 'a template assigned to a binding named for a file',
        code: 'const key = Math.random().toString(36).slice(2); const outFile = `${key}.tmp`; use(outFile);',
      },
      {
        name: 'a template that is a conditional arm assigned to a file-named binding',
        code: 'declare const ok: boolean; const key = Math.random().toString(36).slice(2); const tempFileName = ok ? `${key}.a` : `${key}.b`;',
      },
      {
        name: 'path.posix.join is path too',
        code: "const key = Math.random().toString(36).slice(2); path.posix.join('/tmp', key);",
      },
      {
        name: 'path.win32.join is path too',
        code: "const key = Math.random().toString(36).slice(2); path.win32.join('C:/tmp', key);",
      },
      {
        name: 'an imported path module',
        code: "import path from 'node:path'; const key = Math.random().toString(36).slice(2); path.join('/tmp', key);",
      },
      {
        name: 'a required fs module',
        code: "const fs = require('fs'); const key = Math.random().toString(36).slice(2); fs.writeFileSync(`${key}.tmp`, data);",
      },
      {
        name: 'an fs module imported under another name keeps fs rules for its first argument',
        code: "import files from 'node:fs'; const key = Math.random().toString(36).slice(2); files.writeFileSync(`${key}.tmp`, data);",
      },
      {
        name: 'a path module imported under another name is still path',
        code: "import p from 'node:path'; const key = Math.random().toString(36).slice(2); p.join('/tmp', key);",
      },
      {
        name: 'fs/promises is fs',
        code: "import fsp from 'node:fs/promises'; const key = Math.random().toString(36).slice(2); await fsp.writeFile(`${key}.tmp`, data);",
      },
    ],
    invalid: [
      {
        name: 'a hash nothing reads is still reported (no evidence it names a file)',
        code: 'const hash = Math.random().toString(16);',
        errors: weak,
      },
      {
        name: 'a hash that is ALSO sent somewhere is not just a file name',
        code: 'const hash = Math.random().toString(16); const f = `${hash}.tmp`; send(hash);',
        errors: weak,
      },
      {
        name: 'a hash that is returned',
        code: 'function f() { const hash = Math.random().toString(16); return hash; }',
        errors: weak,
      },
      {
        name: 'a strong secret word still reports when it names a file',
        code: 'const token = Math.random().toString(36).slice(2); fs.writeFileSync(`${token}.tmp`, data);',
        errors: weak,
      },
      {
        name: 'a salt in a path is still a salt',
        code: 'const salt = Math.random().toString(36); const out = path.join(dir, salt);',
        errors: weak,
      },
      {
        name: 'a template without an extension is not a file name',
        code: 'const hash = Math.random().toString(16); const label = `row-${hash}`; render(label);',
        errors: weak,
      },
      {
        name: 'a suffixed template that is an HMAC key is not a file name',
        code: "const key = Math.random().toString(36); crypto.createHmac('sha256', `${key}.v1`);",
        errors: weak,
      },
      {
        name: 'file CONTENT is not a file name',
        code: "const key = Math.random().toString(36); fs.writeFileSync('credential.key', key);",
        errors: weak,
      },
      {
        name: 'the second argument of a method that is not a two-path method',
        code: 'const key = Math.random().toString(36); fs.writeFileSync(`${key}.tmp`, data); fs.appendFileSync(log, key);',
        errors: weak,
      },
      {
        name: 'a suffixed template bound to a name that is not a file',
        code: 'const key = Math.random().toString(36); const label = `${key}.v1`; send(label);',
        errors: weak,
      },
      {
        name: 'a suffixed template that is returned',
        code: 'function f() { const key = Math.random().toString(36); return `${key}.v1`; }',
        errors: weak,
      },
      {
        name: 'a read through a call on something other than path or fs',
        code: 'const key = Math.random().toString(36); archive.add(key);',
        errors: weak,
      },
      {
        name: 'a read passed to a plain function call',
        code: 'const key = Math.random().toString(36); send(key);',
        errors: weak,
      },
      {
        name: 'a read passed through a nested member callee',
        code: 'const key = Math.random().toString(36); client.api.send(key);',
        errors: weak,
      },
      {
        name: 'a local object named path is not Node path',
        code: 'const path = { store(value) { credentials.password = value; } }; const key = Math.random().toString(36); path.store(key);',
        errors: weak,
      },
      {
        name: 'a local object named fs is not Node fs',
        code: 'const fs = { writeFileSync(f, v) { vault.set(f, v); } }; const key = Math.random().toString(36); fs.writeFileSync(key, data);',
        errors: weak,
      },
      {
        name: 'a nested member that is not posix or win32 is not path',
        code: 'const key = Math.random().toString(36); path.custom.join(dir, key);',
        errors: weak,
      },
      {
        name: 'a path module that is not the Node one',
        code: "import path from 'some-path-lib'; const key = Math.random().toString(36); path.join(dir, key);",
        errors: weak,
      },
      {
        name: 'a local name `path` bound to node:fs is fs, so its second argument is file content',
        code: "import path from 'node:fs'; const key = Math.random().toString(36); path.writeFileSync('credential.key', key);",
        errors: weak,
      },
    ],
  },
);
