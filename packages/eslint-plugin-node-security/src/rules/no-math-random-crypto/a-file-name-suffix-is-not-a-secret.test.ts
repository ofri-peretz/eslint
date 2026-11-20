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
    ],
  },
);
