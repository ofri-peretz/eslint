/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * no-missing-null-checks under a real TypeScript program.
 *
 * When the parser supplies type information, TypeScript's own control-flow
 * narrowing is a better oracle than anything this file can reconstruct from
 * syntax: it knows `notFound(): never` ends the request, that an `asserts`
 * function narrows its argument, and that a declared return type of `Page`
 * has no `undefined` in it. The rule asks the checker for the type of the
 * object being dereferenced and, if that type is neither nullable nor
 * `any`/`unknown`, stays quiet.
 *
 * The oracle may only SUBTRACT. A nullable type falls through to the same
 * evidence gate the syntax-only mode uses, so nothing here reports that would
 * not have reported without types. `any` and `unknown` carry no information
 * and fall through too.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import * as path from 'node:path';
import { noMissingNullChecks } from '../../rules/reliability/no-missing-null-checks';

/**
 * Building the program is paid by the first case. Under the coverage fan-out
 * that cost exceeded a 30s case budget in other packages' type-aware suites
 * (#817, #879); this suite carries the same dedicated budget.
 */
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
      tsconfigRootDir: path.resolve(__dirname, '../../../'),
      projectService: {
        allowDefaultProject: ['src/*.ts'],
        defaultProject: 'tsconfig.json',
      },
    },
  },
});

const ROW = 'type Row = { ok: boolean; name: string };';

ruleTester.run('no-missing-null-checks (type-aware)', noMissingNullChecks, {
  valid: [
    {
      name: 'narrowed by a never-returning call — `if (!page) notFound()`',
      code: `${ROW}
declare function notFound(): never;
export function f(rows: Row[]): string {
  const hit = rows.find((r) => r.ok);
  if (!hit) notFound();
  return hit.name;
}`,
      filename: 'src/never-narrowing.ts',
    },
    {
      name: 'the reported shape verbatim: non-nullable declared return type, then .data on the call',
      code: `type DocsPage = { data: { body: string } };
declare const source: { getPage(slug: string[] | undefined): DocsPage | undefined };
declare function notFound(): never;
export function getPageOrNotFound(slug: string[] | undefined): DocsPage {
  const page = source.getPage(slug);
  if (!page) notFound();
  return page;
}
export const body = getPageOrNotFound(undefined).data.body;`,
      filename: 'src/get-page-or-not-found.ts',
    },
    {
      name: 'narrowed by an assertion function',
      code: `${ROW}
declare function assertDefined<T>(v: T): asserts v is NonNullable<T>;
export function f(rows: Row[]): string {
  const hit = rows.find((r) => r.ok);
  assertDefined(hit);
  return hit.name;
}`,
      filename: 'src/asserts-narrowing.ts',
    },
    {
      name: 'a non-nullable declared type on the binding itself',
      code: `${ROW}
export function f(rows: Row[]): string {
  const hit: Row = rows.find((r) => r.ok) ?? rows[0];
  return hit.name;
}`,
      filename: 'src/declared-binding-type.ts',
    },
  ],
  invalid: [
    {
      name: 'the checker agrees it is nullable — evidence gate still reports',
      code: `${ROW}
export function f(rows: Row[]) {
  const hit = rows.find((r) => r.ok);
  return hit.name;
}`,
      filename: 'src/nullable-by-type.ts',
      errors: [{ messageId: 'missingNullCheck' }],
    },
    {
      name: '`any` carries no information — falls through to the evidence gate',
      code: `export function f() {
  let hit: any;
  return hit.name;
}`,
      filename: 'src/any-falls-through.ts',
      errors: [{ messageId: 'missingNullCheck' }],
    },
    {
      name: '`unknown` carries no information — falls through to the evidence gate',
      code: `export function f() {
  let hit: unknown;
  return hit.name;
}`,
      filename: 'src/unknown-falls-through.ts',
      errors: [{ messageId: 'missingNullCheck' }],
    },
  ],
});
