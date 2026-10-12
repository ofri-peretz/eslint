/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * FP/FN review 2026-10-12: receiver origin, distinctive call shapes, the
 * allowlist option and `Object.assign` payload copies. Every binding is named
 * `foo` / `bar`: no verdict rests on a name.
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, expect, it } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import type { TSESTree } from '@typescript-eslint/utils';
import {
  classifyPayload,
  createMassAssignmentRule,
  type MassAssignmentRuleConfig,
} from './mass-assignment-rule';
import { moduleEnv, parseModule } from './value-follow';

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

const make = (extra: Partial<MassAssignmentRuleConfig>) =>
  createMassAssignmentRule({
    meta: {
      type: 'problem',
      docs: {
        description: 'review',
        url: 'https://example.test/r',
        cwe: 'CWE-915',
        cvss: 8.1,
        confidence: 'high',
      },
    },
    methods: ['create', 'insert', 'update', 'values', 'set'],
    payloadKeys: ['data'],
    modules: ['orm'],
    fix: 'name the fields',
    documentationLink: 'https://example.test/docs',
    ...extra,
  });

const plain = make({ allowlistOption: 'fields' });
const modelAccessor = make({ distinctiveShape: 'model-accessor' });
const tableCall = make({ distinctiveShape: 'table-call' });
const builderChain = make({ distinctiveShape: 'builder-chain' });

const O = "import orm from 'orm';\nconst foo = orm();\n";
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'devkit-ma-review-'));
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));
fs.writeFileSync(
  path.join(dir, 'db.ts'),
  "import orm from 'orm';\nexport const db = orm();\n",
);
const ROUTE = path.join(dir, 'route.ts');
const P = 'untrustedPayload' as const;

describe('classifyPayload default receiver judge', () => {
  it('reports an Object.assign copy when no judge is given', () => {
    const module = parseModule(
      '(r) => { const e = {}; Object.assign(e, r.body); probe(e); };',
      '/m.ts',
      parser,
    )!;
    const env = moduleEnv(module, parser);
    const fn = (module.ast.body[0] as TSESTree.ExpressionStatement)
      .expression as TSESTree.ArrowFunctionExpression;
    const call = (
      (fn.body as TSESTree.BlockStatement)
        .body[2] as TSESTree.ExpressionStatement
    ).expression as TSESTree.CallExpression;
    expect(classifyPayload(call.arguments[0], env)).toBe('untrustedPayload');
  });
});

describe('createMassAssignmentRule — review 2026-10 (no shape)', () => {
  ruleTester.run('plain', plain, {
    valid: [
      {
        name: 'test file',
        filename: '/r/test/a.ts',
        code: O + '(r) => foo.create(r.body);',
      },
      {
        name: 'foreign receiver',
        code: O + 'const bar = new Map();\n(r) => bar.set(r.body);',
      },
      {
        name: 'unknown receiver and no distinctive shape',
        code: O + '(r) => bar.create(r.body);',
      },
      {
        name: 'allowlist option',
        code: O + "(r) => foo.create(r.body, { fields: ['a'] });",
      },
      {
        name: 'an options object that is not the allowlist',
        code:
          O +
          '(r) => foo.create({ name: r.body.name }, { [k]: 1, other: 2 }, ...rest);',
      },
      {
        name: 'Object.assign of a non-request',
        code: O + 'const bar = foo.create();\nObject.assign(bar, defaults);',
      },
      {
        name: 'Object.assign onto a foreign target',
        code: O + '(r) => { const bar = {}; Object.assign(bar, r.body); };',
      },
      { name: 'Object.assign with no target', code: O + 'Object.assign();' },
      {
        name: 'an Object.assign-filled binding never written to the driver',
        code:
          O +
          '(r) => { const bar = {}; Object.assign(bar, r.body); foo.create({ id: bar.id }); };',
      },
      {
        name: 'a binding handed to Object.assign as a source',
        code:
          O +
          '(r) => { const bar = {}; Object.assign(r.body, bar); foo.create(bar); };',
      },
      {
        name: 'a binding filled from a non-request',
        code:
          O +
          '(r) => { const bar = {}; Object.assign(bar, x); foo.create(bar); };',
      },
      { name: 'a computed write method', code: O + '(r) => foo[m](r.body);' },
      { name: 'an undeclared binding', code: O + 'foo.create(bar);' },
    ],
    invalid: [
      {
        name: 'driver receiver',
        code: O + '(r) => foo.create(r.body);',
        errors: [{ messageId: P }],
      },
      {
        name: 'driver receiver from a relative module, no direct import',
        filename: ROUTE,
        code: "import { db } from './db';\n(r) => db.create(r.body);",
        errors: [{ messageId: P }],
      },
      {
        name: 'Object.assign onto a driver instance',
        code:
          O +
          '(r) => { const bar = foo.create(); Object.assign(bar, x, r.body); };',
        errors: [{ messageId: P }],
      },
      {
        name: 'an Object.assign-filled binding written to the driver',
        code:
          O +
          '(r) => { const bar = {}; Object.assign(bar, r.body); foo.create(bar); };',
        errors: [{ messageId: P }],
      },
      {
        name: 'nested under a payload key',
        code: O + '(r) => foo.update({ data: r.body });',
        errors: [{ messageId: P }],
      },
    ],
  });
});

describe('createMassAssignmentRule — review 2026-10 (shapes)', () => {
  ruleTester.run('model-accessor', modelAccessor, {
    valid: [
      {
        name: 'unknown receiver, flat call',
        code: O + '(r) => bar.create(r.body);',
      },
    ],
    invalid: [
      {
        name: 'unknown receiver, model accessor',
        code: O + '(r) => bar.user.create({ data: r.body });',
        errors: [{ messageId: P }],
      },
    ],
  });
  ruleTester.run('table-call', tableCall, {
    valid: [
      {
        name: 'unknown receiver, no table',
        code: O + '(r) => bar.insert(r.body);',
      },
    ],
    invalid: [
      {
        name: 'unknown receiver, table call',
        code: O + "(r) => bar('t').insert(r.body);",
        errors: [{ messageId: P }],
      },
      {
        name: 'unknown receiver, into()',
        code: O + "(r) => bar.insert(r.body).into('t');",
        errors: [{ messageId: P }],
      },
    ],
  });
  ruleTester.run('builder-chain', builderChain, {
    valid: [
      {
        name: 'unknown receiver, values() alone',
        code: O + '(r) => bar.values(r.body);',
      },
      {
        name: 'unknown receiver, values() after another call',
        code: O + '(r) => bar.select(t).values(r.body);',
      },
      {
        name: 'unknown receiver, values() after a computed call',
        code: O + '(r) => bar[k](t).values(r.body);',
      },
      {
        name: 'unknown receiver, values() after a bare call',
        code: O + '(r) => bar(t).values(r.body);',
      },
      {
        name: 'unknown receiver, values() on a member',
        code: O + '(r) => bar.x.values(r.body);',
      },
    ],
    invalid: [
      {
        name: 'unknown receiver, insert().values()',
        code: O + '(r) => bar.insert(t).values(r.body);',
        errors: [{ messageId: P }],
      },
      {
        name: 'unknown receiver, update().set()',
        code: O + '(r) => bar.update(t).set(r.body);',
        errors: [{ messageId: P }],
      },
    ],
  });
});
