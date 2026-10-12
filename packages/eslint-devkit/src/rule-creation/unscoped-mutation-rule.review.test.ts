/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * FP/FN review 2026-10-12: receiver origin, distinctive call shapes,
 * migration / seed exports and builders scoped by another statement.
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, expect, it } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import {
  createUnscopedMutationRule,
  driverBindings,
  exportedFunctions,
  type UnscopedMutationRuleConfig,
} from './unscoped-mutation-rule';
import { parseModule } from './value-follow';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  },
});

const make = (extra: Partial<UnscopedMutationRuleConfig>) =>
  createUnscopedMutationRule({
    meta: {
      type: 'problem',
      docs: {
        description: 'review',
        url: 'https://example.test/r',
        cwe: 'CWE-284',
        cvss: 7.5,
        confidence: 'high',
      },
    },
    methods: ['del', 'delete', 'update', 'deleteMany'],
    modules: ['orm'],
    fix: 'scope it',
    documentationLink: 'https://example.test/docs',
    ...extra,
  });

const tableCall = make({
  argumentRole: 'table',
  distinctiveShape: 'table-call',
  scopeMethods: ['where'],
  migrationExports: ['up', 'down', 'seed'],
});
const modelAccessor = make({ distinctiveShape: 'model-accessor' });
const tableArgument = make({
  argumentRole: 'table',
  distinctiveShape: 'table-argument',
});
const noShape = make({ argumentRole: 'table' });

const O = "import orm, { table } from 'orm';\n";
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'devkit-um-review-'));
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));
fs.writeFileSync(
  path.join(dir, 'db.ts'),
  "import orm from 'orm';\nexport const db = orm();\n",
);
const ROUTE = path.join(dir, 'route.ts');
const U = 'unscopedMutation' as const;

describe('exportedFunctions', () => {
  it('is empty with no names or no scope manager', () => {
    const module = parseModule('export function up() {}', '/m.ts', parser)!;
    expect(
      exportedFunctions(module.ast, [], {
        physicalFilename: '/m.ts',
        sourceCode: { scopeManager: module.scopeManager },
      }).size,
    ).toBe(0);
    expect(
      exportedFunctions(module.ast, ['up'], {
        physicalFilename: '/m.ts',
        sourceCode: { scopeManager: null },
      }).size,
    ).toBe(0);
  });
});

describe('driverBindings (kept for API compatibility)', () => {
  it('skips statements that are neither imports nor declarations', () => {
    const module = parseModule(
      "log();\nimport a from 'orm';",
      '/b.ts',
      parser,
    )!;
    expect([...driverBindings(module.ast, ['orm'])]).toEqual(['a']);
  });
});

describe('createUnscopedMutationRule — review 2026-10', () => {
  ruleTester.run('table-call', tableCall, {
    valid: [
      {
        name: 'test file',
        filename: '/r/tests/a.ts',
        code: O + "const k = orm();\nk('t').del();",
      },
      {
        name: 'foreign receiver',
        code: O + 'const m = new Map();\nm.delete(k);',
      },
      { name: 'unknown receiver, no table', code: O + 'k.del();' },
      {
        name: 'unknown receiver, a non-table chain call',
        code: O + 'k.x().del();',
      },
      {
        name: 'unknown receiver, a computed chain call',
        code: O + 'k[m]().del();',
      },
      { name: 'unknown receiver, no import', code: "k('t').del();" },
      {
        name: 'ESM migration',
        code:
          O + "export async function up(k) { await k('t').update({ a: 1 }); }",
      },
      {
        name: 'ESM arrow migration',
        code: O + "export const down = async (k) => { await k('t').del(); };",
      },
      {
        name: 'CommonJS seed',
        code: O + "exports.seed = async function (k) { await k('t').del(); };",
      },
      {
        name: 'module.exports shorthand migration',
        code:
          O +
          "async function up(k) { await k('t').del(); }\nmodule.exports = { up };",
      },
      {
        name: 'a nested callback inside a migration',
        code:
          O +
          "export async function up(k) { await k.transaction(async (t) => { await t('x').del(); }); }",
      },
      {
        name: 'a migration name exported as a non-function',
        code:
          O +
          "export const up = 1;\nconst k = orm();\nfunction g() { return 1; }\nk('t').where({ a: 1 }).del();",
      },
      {
        name: 'a builder scoped by another statement',
        code:
          O +
          "const k = orm();\nconst q = k('t');\nq.where({ a: 1 });\nq.del();",
      },
      {
        name: 'a builder handed to a helper',
        code:
          O + "const k = orm();\nconst q = k('t');\nnew Scoper(q);\nq.del();",
      },
    ],
    invalid: [
      {
        name: 'traced receiver',
        code: O + "const k = orm();\nk('t').del();",
        errors: [{ messageId: U }],
      },
      {
        name: 'unknown receiver, table call',
        code: O + "k('t').del();",
        errors: [{ messageId: U }],
      },
      {
        name: 'unknown receiver, from()',
        code: O + "k.from('t').del();",
        errors: [{ messageId: U }],
      },
      {
        name: 'unknown receiver, chain through a member',
        code: O + "k('t').x.del();",
        errors: [{ messageId: U }],
      },
      {
        name: 'traced receiver from a relative module, no direct import',
        filename: ROUTE,
        code: "import { db } from './db';\ndb('t').del();",
        errors: [{ messageId: U }],
      },
      {
        name: 'a non-migration export',
        code:
          O +
          "export async function other(k) { const j = orm(); await j('t').del(); }",
        errors: [{ messageId: U }],
      },
      {
        name: 'a builder used elsewhere only for reads',
        code:
          O +
          "const k = orm();\nconst q = k('t');\nq.select();\nlog(q.x);\nq.del();",
        errors: [{ messageId: U }],
      },
      {
        name: 'a builder read through a computed member',
        code: O + "const k = orm();\nconst q = k('t');\nq[m];\nq.del();",
        errors: [{ messageId: U }],
      },
      {
        name: 'a builder held in a class field',
        code: O + "class R { q = orm()('t'); m() { return this.q.del(); } }",
        errors: [{ messageId: U }],
      },
      {
        name: 'a builder from a parameter',
        code: O + "function f(q) { q('t').del(); }",
        errors: [{ messageId: U }],
      },
      {
        name: 'a builder whose root is a call',
        code: O + "orm()('t').del();",
        errors: [{ messageId: U }],
      },
    ],
  });
  ruleTester.run('model-accessor', modelAccessor, {
    valid: [
      { name: 'unknown receiver, flat call', code: O + 'k.deleteMany();' },
    ],
    invalid: [
      {
        name: 'unknown receiver, model accessor',
        code: O + 'k.user.deleteMany();',
        errors: [{ messageId: U }],
      },
    ],
  });
  ruleTester.run('table-argument', tableArgument, {
    valid: [
      { name: 'unknown receiver, unknown table', code: O + 'k.delete(t);' },
      { name: 'unknown receiver, no argument', code: O + 'k.delete();' },
      {
        name: 'unknown receiver, spread argument',
        code: O + 'k.delete(...t);',
      },
    ],
    invalid: [
      {
        name: 'unknown receiver, a table the driver built',
        code: O + "const t = table('t');\nk.delete(t);",
        errors: [{ messageId: U }],
      },
    ],
  });
  ruleTester.run('no shape', noShape, {
    valid: [{ name: 'unknown receiver', code: O + "k('t').del();" }],
    invalid: [
      {
        name: 'traced receiver',
        code: O + "const k = orm();\nk('t').del();",
        errors: [{ messageId: U }],
      },
    ],
  });
});
