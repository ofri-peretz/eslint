/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Factory-level coverage for `createMassAssignmentRule`.
 *
 * The `valid` block is the load-bearing half. This rule keys on a *shape*
 * (`req.body` reaching a write) rather than on a driver API, so the ways it can
 * over-match are all in ordinary application code: a config object with a
 * `data` key, a variable called `request` that is not a request, a payload that
 * correctly names its fields.
 */

import { describe, expect, it, afterAll } from 'vitest';
import { RuleTester } from '@typescript-eslint/rule-tester';
import * as parser from '@typescript-eslint/parser';

import {
  createMassAssignmentRule,
  classifyPayload,
} from './mass-assignment-rule';
import { isRequestPayload } from './request-source';
import { moduleEnv, parseModule, type Env } from './value-follow';
import type { TSESTree } from '@typescript-eslint/utils';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

/**
 * The value of the LAST expression statement in `code`, with the scope
 * analysis it must be read in. The request is now recognised by where a value
 * comes from, so the unit tests need bindings, not bare expressions.
 */
const valueOf = (code: string): { node: TSESTree.Node; env: Env } => {
  const module = parseModule(code, '/virtual/test.ts', parser);
  if (module === null) throw new Error(`unparseable: ${code}`);
  const env = moduleEnv(module, parser);
  let last: TSESTree.Node | undefined;
  const visit = (node: TSESTree.Node): void => {
    if (node.type === 'ExpressionStatement') last = node.expression;
    for (const [key, child] of Object.entries(node)) {
      if (key === 'parent') continue;
      for (const c of Array.isArray(child) ? child : [child]) {
        if (c && typeof c === 'object' && typeof c.type === 'string') visit(c);
      }
    }
  };
  visit(module.ast);
  return { node: last as TSESTree.Node, env };
};

const isPayload = (code: string): boolean => {
  const { node, env } = valueOf(code);
  return isRequestPayload(node, env);
};

/**
 * Replaces the former `isUntrustedSource` suite. That predicate decided a
 * request by the NAME of the object (`req`, `request`, `ctx`, `context`,
 * `event`); the cases below keep every intent it pinned, restated
 * structurally — a handler PARAMETER (or a name the file never declares) is a
 * request holder, a local object literal is not, whatever either is called.
 */
describe('isRequestPayload', () => {
  it('matches the request surfaces that are wholly caller-controlled', () => {
    for (const code of [
      'req.body',
      'request.query',
      'req.params',
      'request.payload',
      'ctx.request.body',
      'event.body',
      'context.request.query',
      '(req) => { req.body; }',
      // The rename litmus: the parameter is the evidence, not its name.
      '(foo) => { foo.body; }',
      '(foo) => { foo.request.body; }',
    ]) {
      expect(isPayload(code), code).toBe(true);
    }
  });

  it('requires the base to be a request holder, not a local object', () => {
    // Same property name, ordinary object — where the base comes from decides.
    expect(isPayload('const form = { body: {} }; form.body;')).toBe(false);
    expect(isPayload('const config = { params: [] }; config.params;')).toBe(
      false,
    );
    expect(isPayload('const options = makeOptions(); options.query;')).toBe(
      false,
    );
  });

  it('does not treat `data` as a request surface', () => {
    // `ctx.data` and `context.data` are ordinary application state in several
    // frameworks; keying on them would report code with no request in it.
    expect(isPayload('ctx.data')).toBe(false);
    expect(isPayload('context.data')).toBe(false);
  });

  it('ignores a computed access, which is not statically a name', () => {
    expect(isPayload('req[key]')).toBe(false);
  });

  it('ignores a private field, which cannot be a request surface', () => {
    expect(isPayload('class A { #body; m(req) { req.#body; } }')).toBe(false);
  });

  it('is false for a value that is not read from a request', () => {
    expect(isPayload('(req) => { req; }')).toBe(false);
    expect(isPayload('getBody()')).toBe(false);
    expect(isPayload('"body"')).toBe(false);
  });
});

describe('classifyPayload', () => {
  const classify = (code: string) => {
    const { node, env } = valueOf(code);
    return classifyPayload(node, env);
  };

  it('reports the object itself and a spread of it, with distinct ids', () => {
    expect(classify('req.body')).toBe('untrustedPayload');
    expect(classify('({ ...req.body })')).toBe('untrustedSpread');
    expect(classify('({ id, ...req.body })')).toBe('untrustedSpread');
  });

  it('stays silent when the payload names its fields — that is the fix', () => {
    expect(classify('({ name: req.body.name })')).toBe(false);
    expect(classify('({ name: req.body.name, email: req.body.email })')).toBe(
      false,
    );
  });

  it('stays silent for a spread of something trusted', () => {
    expect(classify('({ ...defaults })')).toBe(false);
    expect(classify('const form = { body: {} }; ({ ...form.body });')).toBe(
      false,
    );
  });

  it('is false for values it cannot classify', () => {
    expect(classify('payload')).toBe(false);
    expect(classify('buildPayload(req)')).toBe(false);
  });
});

const rule = createMassAssignmentRule({
  meta: {
    type: 'problem',
    docs: {
      description: 'test',
      url: 'https://example.test/rule',
      cwe: 'CWE-915',
      cvss: 8.1,
      confidence: 'high',
    },
  },
  methods: ['create', 'update', 'save'],
  receiverPattern: /^(repo|db|database)$/,
  payloadKeys: ['data', 'values'],
  modules: ['test-orm'],
  fix: 'name the fields',
  documentationLink: 'https://example.test/docs',
});

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  },
});

/**
 * Opens the gate and binds `repo` to the driver. Fixtures used to leave `repo`
 * undeclared and match it by NAME (`receiverPattern`); it is now a handle
 * because it is written from the driver import.
 */
const DRIVER =
  "import { orm } from 'test-orm';\nconst repo = orm.repository();\n";

describe('createMassAssignmentRule', () => {
  ruleTester.run('rule', rule, {
    valid: [
      {
        name: 'the fix — fields named explicitly',
        code:
          DRIVER +
          'await repo.create({ name: req.body.name, email: req.body.email });',
      },
      {
        name: 'named fields under a payload key',
        code:
          DRIVER +
          'await repo.update({ where: { id }, data: { name: req.body.name } });',
      },
      {
        name: 'a trusted object',
        code: DRIVER + 'await repo.create(validated);',
      },
      {
        name: 'a spread of something that is not a request',
        code: DRIVER + 'await repo.create({ ...defaults, name });',
      },
      {
        // Regression: `bindings.size === 0` only proves *some* driver import
        // exists in the file. Without a receiver check, one `req.body` reaching
        // any `Map.set` / `Headers.set` / `cache.create` in a file that also
        // imports the ORM reported. These method names are among the most
        // generic in JavaScript.
        name: 'an unrelated object using a matching method name',
        code: DRIVER + 'await cache.create(req.body);',
      },
      {
        name: 'a Map in a file that imports the driver',
        code: DRIVER + 'seen.set(req.body);',
      },
      {
        // `receiverBaseName` gives up when the chain does not bottom out in an
        // identifier, and an unnameable receiver cannot be proven to be a
        // driver handle.
        name: 'a receiver with no static name',
        code: DRIVER + 'await (a || b).create(req.body);',
      },
      {
        name: 'a method this driver does not write with',
        code: DRIVER + 'await repo.findMany(req.body);',
      },
      {
        name: 'no driver import, no finding',
        code: 'await repo.create(req.body);',
      },
      {
        // The base decides, not the property name. This fixture used to leave
        // `form` undeclared and rely on its NAME not being `req`; undeclared,
        // the two are the same program. Declared as a local object it is
        // provably not a request.
        name: 'an object that merely has a body key',
        code:
          DRIVER + 'const form = { body: {} };\nawait repo.create(form.body);',
      },
      {
        name: 'a payload key that is not this driver’s',
        code:
          DRIVER + 'await repo.update({ where: { id }, select: req.body });',
      },
    ],
    invalid: [
      {
        name: 'the request handed straight to a write',
        code: DRIVER + 'await repo.create(req.body);',
        errors: [{ messageId: 'untrustedPayload' }],
      },
      {
        name: 'spread into the payload',
        code: DRIVER + 'await repo.create({ ...req.body });',
        errors: [{ messageId: 'untrustedSpread' }],
      },
      {
        // The dangerous half of the "safe-looking" shape: naming `id` next to
        // the spread does not limit what the spread carries.
        name: 'a named field beside a spread does not narrow it',
        code: DRIVER + 'await repo.update({ ...req.body, updatedAt });',
        errors: [{ messageId: 'untrustedSpread' }],
      },
      {
        name: 'nested under a payload key',
        code: DRIVER + 'await repo.update({ where: { id }, data: req.body });',
        errors: [{ messageId: 'untrustedPayload' }],
      },
      {
        name: 'spread nested under a payload key',
        code:
          DRIVER +
          'await repo.update({ where: { id }, data: { ...req.body } });',
        errors: [{ messageId: 'untrustedSpread' }],
      },
      {
        name: 'a receiver bound to the driver import qualifies',
        code: "import { orm } from 'test-orm';\nawait orm.create(req.body);",
        errors: [{ messageId: 'untrustedPayload' }],
      },
      {
        // Was "reads through to the property name": `this.db` qualified by
        // being spelled `db`. It now qualifies because the class field is
        // written from the driver.
        name: 'this.db reads through to the class field that holds the driver',
        code:
          DRIVER +
          'class S { db = orm.repository(); m(req) { return this.db.create(req.body); } }',
        errors: [{ messageId: 'untrustedPayload' }],
      },
      {
        name: 'the koa-style chain',
        code: DRIVER + 'await repo.save(ctx.request.body);',
        errors: [{ messageId: 'untrustedPayload' }],
      },
      {
        name: 'query string, not just body',
        code: DRIVER + 'await repo.create(req.query);',
        errors: [{ messageId: 'untrustedPayload' }],
      },
      {
        name: 'a second argument is checked too',
        code: DRIVER + 'await repo.update({ id }, req.body);',
        errors: [{ messageId: 'untrustedPayload' }],
      },
      {
        name: 'require() form opens the same gate',
        code: "const { orm } = require('test-orm');\nconst repo = orm.repository();\nawait repo.create(req.body);",
        errors: [{ messageId: 'untrustedPayload' }],
      },
      {
        name: 'two payload keys report separately',
        code:
          DRIVER + 'await repo.update({ data: req.body, values: req.query });',
        errors: [
          { messageId: 'untrustedPayload' },
          { messageId: 'untrustedPayload' },
        ],
      },
    ],
  });
});

describe('argument shapes the scanner has to walk past', () => {
  ruleTester.run('exotic arguments', rule, {
    valid: [
      {
        name: 'a spread argument is not a payload object',
        code: DRIVER + 'await repo.create(...args);',
      },
      {
        name: 'a computed payload key cannot be read statically',
        code: DRIVER + 'await repo.update({ [key]: req.body });',
      },
      { name: 'no arguments at all', code: DRIVER + 'await repo.create();' },
      {
        name: 'a bare callee is not a member call',
        code: DRIVER + 'create(req.body);',
      },
    ],
    invalid: [
      {
        name: 'a spread argument does not hide a later payload',
        code: DRIVER + 'await repo.create(...args, req.body);',
        errors: [{ messageId: 'untrustedPayload' }],
      },
    ],
  });
});

/** No `payloadKeys` — only the direct-argument position is checked. */
const bareRule = createMassAssignmentRule({
  meta: {
    type: 'problem',
    docs: {
      description: 'test',
      url: 'https://example.test/rule',
      cwe: 'CWE-915',
      cvss: 8.1,
      confidence: 'high',
    },
  },
  methods: ['create'],
  receiverPattern: /^(repo|db|database)$/,
  modules: ['test-orm'],
  fix: 'name the fields',
  documentationLink: 'https://example.test/docs',
});

describe('createMassAssignmentRule — no nested payload keys', () => {
  ruleTester.run('bare config', bareRule, {
    valid: [
      {
        name: 'a nested key is not a payload position for this driver',
        code: DRIVER + 'await repo.create({ data: req.body });',
      },
    ],
    invalid: [
      {
        name: 'the direct argument still reports',
        code: DRIVER + 'await repo.create(req.body);',
        errors: [{ messageId: 'untrustedPayload' }],
      },
    ],
  });
});

describe('rule metadata', () => {
  it('carries both ids with the same remediation', () => {
    expect(rule.meta.messages.untrustedPayload).toContain('name the fields');
    expect(rule.meta.messages.untrustedSpread).toContain('name the fields');
  });

  it('emits the CWE it documents, so the two cannot drift', () => {
    expect(rule.meta.messages.untrustedPayload).toContain('CWE-915');
    expect(rule.meta.docs?.cwe).toBe('CWE-915');
  });

  it('takes no options — an allowlist would re-approve the dangerous shape', () => {
    expect(rule.meta.schema).toEqual([]);
    expect(rule.defaultOptions).toEqual([]);
  });
});
