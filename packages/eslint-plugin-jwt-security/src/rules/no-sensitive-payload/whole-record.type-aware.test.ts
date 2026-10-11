/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The type-aware half of `no-sensitive-payload`'s whole-record check.
 *
 * Without types, a spread whose source cannot be resolved to an object
 * literal is reported: nothing shows which fields it carries. With
 * `parserOptions.projectService` the type of the spread source is known, so
 * the rule reports only when that type actually declares a sensitive field —
 * `{ ...user }` of `{ id; email; passwordHash }` is a leak, `{ ...claims }` of
 * `{ sub; scope }` is not. Type information stays optional: every other suite
 * runs without it.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import * as path from 'node:path';
import { noSensitivePayload } from './index';

/** The first case builds the whole TypeScript program; see nestjs-security #817. */
const TYPE_AWARE_CASE_TIMEOUT_MS = 120_000;

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = (text, callback) =>
  it(text, callback, TYPE_AWARE_CASE_TIMEOUT_MS);

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      tsconfigRootDir: path.resolve(__dirname, '../../..'),
      // Every case shares one filename: allowDefaultProject caps at 8 files.
      projectService: {
        allowDefaultProject: ['src/*.ts'],
        defaultProject: 'tsconfig.json',
      },
    },
  },
});

const FILE = 'src/case.ts';

ruleTester.run('no-sensitive-payload (type-aware)', noSensitivePayload, {
  valid: [
    {
      // @found FN-6b, reasoned during the 2026-10-10 zero-deferral pass
      name: 'FP: a spread whose type declares only harmless claims',
      filename: FILE,
      code: `import jwt from 'jsonwebtoken';
type Claims = { sub: string; scope: string };
export function issue(claims: Claims, key: string) {
  return jwt.sign({ ...claims }, key);
}`,
    },
  ],
  invalid: [
    {
      // @found FN-6b, harness-reproduced FP/FN audit 2026-10-10 (benchmarks/audits/2026-10-10-fp-fn-jwt-security.md)
      name: 'FN: a spread whose type declares a password hash',
      filename: FILE,
      code: `import jwt from 'jsonwebtoken';
type User = { id: string; email: string; passwordHash: string };
export function issue(user: User, key: string) {
  return jwt.sign({ ...user }, key);
}`,
      errors: [{ messageId: 'wholeRecordSpread' }],
    },
    {
      name: 'a spread typed any says nothing, so it is reported',
      filename: FILE,
      code: `import jwt from 'jsonwebtoken';
export function issue(user: any, key: string) {
  return jwt.sign({ ...user }, key);
}`,
      errors: [{ messageId: 'wholeRecordSpread' }],
    },
  ],
});
