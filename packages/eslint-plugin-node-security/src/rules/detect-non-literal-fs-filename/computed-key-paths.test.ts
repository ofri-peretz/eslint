/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A computed key makes the value unknowable, however well-known the object is.
 *
 * `containsFreeVariable` recursed through templates, call arguments and `+`,
 * but had no MemberExpression case — so the KEY of `obj[k]` was never visited.
 * The result was backwards: `readFile(dir)` reported while
 * `readFile(cfg[prop])` stayed silent, even though the second is strictly more
 * opaque than the first. It was the last uncovered case on
 * eslint-plugin-security's own must-detect corpus.
 *
 * The object is deliberately NOT recursed into, and the `process.env` cases
 * below are why: ESLint resolves no Node globals by default, so `process`
 * reads as a free variable and walking the object would report every
 * `process.env.HOME` in existence. Measured over 654 files of our own source,
 * the key-only branch added ZERO findings while fixing the corpus case — the
 * recall came without the noise, which is the only reason it ships.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { detectNonLiteralFsFilename } from './index';

const ruleTester = new RuleTester({
  languageOptions: { parserOptions: { ecmaVersion: 2022, sourceType: 'module' } },
});

ruleTester.run('detect-non-literal-fs-filename — computed keys', detectNonLiteralFsFilename, {
  valid: [
    {
      // A STATIC key names one fixed slot. `import.meta.url` is the module's
      // own location, not input, and it must stay quiet — this is the control
      // that proves the branch keys on `computed`, not on MemberExpression.
      name: 'a static key on import.meta is the module location',
      code: `import fs from 'fs'; export const k = fs.readFileSync(import.meta.url);`,
    },
    {
      // The object is a free variable but the key is static. Recursing into the
      // object would report this — and every `process.env.HOME` with it.
      name: 'a static key on an unresolvable object is left alone',
      code: `import fs from 'fs'; export const k = fs.readFileSync(process.env.HOME);`,
    },
    {
      // Computed, but the key is a literal — still one fixed slot.
      name: 'a computed key that is a literal is still constant',
      code: `import fs from 'fs'; const cfg = { a: './a.txt' }; export const k = fs.readFileSync(cfg['a']);`,
    },
  ],
  invalid: [
    {
      // The corpus case, verbatim from eslint-plugin-security's own suite.
      name: 'a computed key on import.meta, through path.resolve',
      code: `
        import fs from 'fs';
        import path from 'path';
        export const key = fs.readFileSync(path.resolve(import.meta[prop], './index.html'));
      `,
      errors: 1,
    },
    {
      // The same shape with nothing wrapped around it.
      name: 'a computed key read directly',
      code: `import fs from 'fs'; export const k = fs.readFileSync(import.meta[prop]);`,
      errors: 1,
    },
    {
      // Not special to import.meta — any object with an unresolvable key.
      name: 'a computed key on an ordinary object',
      code: `import fs from 'fs'; export const k = fs.readFileSync(cfg[prop]);`,
      errors: 1,
    },
  ],
});
