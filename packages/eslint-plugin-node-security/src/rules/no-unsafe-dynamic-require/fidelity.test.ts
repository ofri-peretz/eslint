/**
 * no-unsafe-dynamic-require — divergences the Quint fidelity model found
 * (benchmarks/suites/fidelity/models/node-security/no_unsafe_dynamic_require.qnt).
 *
 *   - `createRequire` was matched by NAME, so a local function that shares it
 *     made its result a CJS loader. It now has to resolve to `node:module`.
 *   - `reportUnresolvedSpecifiers` reported the allowlist lookup the rule's
 *     own message recommends, whose provenance is resolved.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnsafeDynamicRequire } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const TABLE =
  "const ALLOWED = { csv: './plugins/csv', json: './plugins/json' } as const;";

describe('no-unsafe-dynamic-require fidelity', () => {
  ruleTester.run(
    'createRequire resolution and allowlist lookups',
    noUnsafeDynamicRequire,
    {
      valid: [
        {
          name: 'a local function named createRequire does not make a loader',
          code: `const createRequire = (u: string) => (s: string) => [u, s];
const load = createRequire(import.meta.url);
export async function handler(req: any) { load(req.params.moduleName); }`,
        },
        {
          name: 'reportUnresolvedSpecifiers does not report a closed allowlist lookup',
          code: `${TABLE}
export async function handler(req: any) { require(ALLOWED[req.query.plugin as keyof typeof ALLOWED]); }`,
          options: [{ reportUnresolvedSpecifiers: true }],
        },
        {
          name: 'reportUnresolvedSpecifiers does not report import() of a closed allowlist lookup',
          code: `${TABLE}
export async function handler(req: any) { await import(ALLOWED[req.query.plugin as keyof typeof ALLOWED]); }`,
          options: [{ reportUnresolvedSpecifiers: true }],
        },
        {
          name: 'a lookup into a const array of string literals is a closed allowlist',
          code: `const ALLOWED = ['./plugins/csv', './plugins/json'];
export async function handler(req: any) { require(ALLOWED[Number(req.query.i)]); }`,
          options: [{ reportUnresolvedSpecifiers: true }],
        },
        {
          name: 'a closed table read through a const index hop is still closed',
          code: `${TABLE}
export async function handler(req: any) { const spec = ALLOWED[req.query.p as keyof typeof ALLOWED]; require(spec); }`,
          options: [{ reportUnresolvedSpecifiers: true }],
        },
        {
          name: 'reading table entries in other expressions keeps the table closed',
          code: `${TABLE}
let first: string;
first = ALLOWED.csv;
export const known = !ALLOWED.json;
export async function handler(req: any) { require(ALLOWED[req.query.p as keyof typeof ALLOWED]); }`,
          options: [{ reportUnresolvedSpecifiers: true }],
        },
      ],
      invalid: [
        {
          name: 'a renamed createRequire from node:module is a loader',
          code: `import { createRequire as mk } from 'node:module';
const load = mk(import.meta.url);
export async function handler(req: any) { load(req.params.moduleName); }`,
          errors: [{ messageId: 'unsafeDynamicRequire' }],
        },
        {
          name: 'module.createRequire from the node:module default import is a loader',
          code: `import module from 'node:module';
const load = module.createRequire(import.meta.url);
export async function handler(req: any) { load(req.params.moduleName); }`,
          errors: [{ messageId: 'unsafeDynamicRequire' }],
        },
        {
          name: 'a table written through is not a closed allowlist',
          code: `const TABLE: Record<string, string> = { csv: './plugins/csv' };
TABLE.extra = String(Date.now());
export async function handler(req: any) { require(TABLE[req.query.plugin]); }`,
          options: [{ reportUnresolvedSpecifiers: true }],
          errors: [{ messageId: 'unsafeDynamicRequire' }],
        },
        {
          name: 'a table with a spread is not closed',
          code: "const BASE = { a: './a' };\nconst T = { ...BASE, csv: './plugins/csv' };\nexport function h(req: any) { require(T[req.query.p]); }",
          options: [{ reportUnresolvedSpecifiers: true }],
          errors: [{ messageId: 'unsafeDynamicRequire' }],
        },
        {
          name: 'a table with a non-string value is not closed',
          code: "const T = { csv: './plugins/csv', n: 3 };\nexport function h(req: any) { require((T as any)[req.query.p]); }",
          options: [{ reportUnresolvedSpecifiers: true }],
          errors: [{ messageId: 'unsafeDynamicRequire' }],
        },
        {
          name: 'a sparse array is not closed',
          code: "const T = [, './plugins/csv'];\nexport function h(req: any) { require(T[req.query.i] as string); }",
          options: [{ reportUnresolvedSpecifiers: true }],
          errors: [{ messageId: 'unsafeDynamicRequire' }],
        },
        {
          name: 'a table handed to a call is not closed',
          code: "const T = { csv: './plugins/csv' };\nObject.assign(T, { x: './evil' });\nexport function h(req: any) { require(T[req.query.p as 'csv']); }",
          options: [{ reportUnresolvedSpecifiers: true }],
          errors: [{ messageId: 'unsafeDynamicRequire' }],
        },
        {
          name: 'a table entry incremented is not closed',
          code: "const T: any = { csv: './plugins/csv' };\nT.n++;\nexport function h(req: any) { require(T[req.query.p]); }",
          options: [{ reportUnresolvedSpecifiers: true }],
          errors: [{ messageId: 'unsafeDynamicRequire' }],
        },
        {
          name: 'a table entry deleted is not closed',
          code: "const T: any = { csv: './plugins/csv' };\ndelete T.csv;\nexport function h(req: any) { require(T[req.query.p]); }",
          options: [{ reportUnresolvedSpecifiers: true }],
          errors: [{ messageId: 'unsafeDynamicRequire' }],
        },
        {
          name: 'a let table is not closed',
          code: "let T = { csv: './plugins/csv' };\nexport function h(req: any) { require((T as any)[req.query.p]); }",
          options: [{ reportUnresolvedSpecifiers: true }],
          errors: [{ messageId: 'unsafeDynamicRequire' }],
        },
        {
          name: 'a lookup on a non-identifier receiver is not a table lookup',
          code: "export function h(req: any) { require(({ csv: './plugins/csv' } as any)[req.query.p]); }",
          options: [{ reportUnresolvedSpecifiers: true }],
          errors: [{ messageId: 'unsafeDynamicRequire' }],
        },
        {
          name: 'two const hops are not followed',
          code: "const T = { csv: './plugins/csv' };\nexport function h(req: any) { const a = (T as any)[req.query.p]; const b = a; require(b); }",
          options: [{ reportUnresolvedSpecifiers: true }],
          errors: [{ messageId: 'unsafeDynamicRequire' }],
        },
        {
          name: 'a table that is not an object or array literal is not closed',
          code: "const T = new Map([['csv', './plugins/csv']]) as any;\nexport function h(req: any) { require(T[req.query.p]); }",
          options: [{ reportUnresolvedSpecifiers: true }],
          errors: [{ messageId: 'unsafeDynamicRequire' }],
        },
      ],
    },
  );
});
