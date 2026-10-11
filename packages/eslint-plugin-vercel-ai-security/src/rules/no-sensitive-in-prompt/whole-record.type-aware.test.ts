/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The type-aware half of `no-sensitive-in-prompt`'s whole-record check (F-11b).
 *
 * Without types, `JSON.stringify(x)` is reported only when `x` resolves in the
 * file to a literal with a sensitive key or to a full database row. With
 * `parserOptions.projectService` the declared properties of `x`'s type decide
 * — so a parameter typed `{ passwordHash }` is caught, and a value typed
 * `{ name; plan }` is not. `any` says nothing and falls back to the structural
 * check. Type information stays optional: every other suite runs without it.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import * as path from 'node:path';
import { noSensitiveInPrompt } from './index';

/** The first case builds the whole TypeScript program. */
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

ruleTester.run(
  'no-sensitive-in-prompt (whole records, type-aware)',
  noSensitiveInPrompt,
  {
    valid: [
      {
        // guard reasoned from F-11b: the type's fields are the evidence, and these are harmless
        name: 'guard: a record whose type declares only harmless fields',
        filename: FILE,
        code: `import { generateText } from 'ai';
type Profile = { name: string; plan: string };
export async function greet(foo: Profile, model: any) {
  return generateText({ model, prompt: \`Greet: \${JSON.stringify(foo)}\` });
}`,
      },
      {
        name: 'a string-typed value embedded in a template is not a record',
        filename: FILE,
        code: `import { generateText } from 'ai';
export async function greet(foo: string, model: any) {
  return generateText({ model, prompt: \`Greet: \${foo}\` });
}`,
      },
    ],
    invalid: [
      {
        // @found F-11b, harness-reproduced FP/FN audit 2026-10-10 (benchmarks/audits/2026-10-10-fp-fn-vercel-ai-security.md)
        name: 'FN: a parameter whose type declares a password hash, serialised into the prompt',
        filename: FILE,
        code: `import { generateText } from 'ai';
type User = { id: string; email: string; passwordHash: string };
export async function greet(foo: User, model: any) {
  return generateText({ model, prompt: \`Personalize: \${JSON.stringify(foo)}\` });
}`,
        errors: [{ messageId: 'sensitiveInPrompt' }],
      },
      {
        name: 'a value typed any falls back to the structural check (a literal with a password key)',
        filename: FILE,
        code: `import { generateText } from 'ai';
export async function greet(input: any, model: any) {
  const foo: any = { email: input.email, password: input.password };
  return generateText({ model, prompt: JSON.stringify(foo) });
}`,
        errors: [{ messageId: 'sensitiveInPrompt' }],
      },
    ],
  },
);
