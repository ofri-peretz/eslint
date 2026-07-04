/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Dual-layer coverage tests for branches not exercised by the primary
 * per-rule suites.
 *
 * Layer 1 — RuleTester fixtures through the real parser: computed member
 * access, string-literal keys, spreads, native-driver projections, chained
 * `.select`/`.lean`/`.limit` edge shapes.
 *
 * Layer 2 — `createWithMockContext` (from @interlace/eslint-devkit) with
 * synthetic AST objects for the two parser-unreachable branches:
 *   - a TemplateLiteral with zero quasis (parser always emits >= 1)
 *   - a chain walk whose cursor has no parent (parser always roots at Program)
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { createWithMockContext, type RuleLike } from '@interlace/eslint-devkit';

import { plugin as mainPlugin } from './index';
import { noBypassMiddleware } from './rules/no-bypass-middleware/index';
import { noHardcodedConnectionString } from './rules/no-hardcoded-connection-string/index';
import { noHardcodedCredentials } from './rules/no-hardcoded-credentials/index';
import { noOperatorInjection } from './rules/no-operator-injection/index';
import { noSelectSensitiveFields } from './rules/no-select-sensitive-fields/index';
import { noUnboundedFind } from './rules/no-unbounded-find/index';
import { noUnsafePopulate } from './rules/no-unsafe-populate/index';
import { noUnsafeQuery } from './rules/no-unsafe-query/index';
import { noUnsafeRegexQuery } from './rules/no-unsafe-regex-query/index';
import { noUnsafeWhere } from './rules/no-unsafe-where/index';
import { requireAuthMechanism } from './rules/require-auth-mechanism/index';
import { requireLeanQueries } from './rules/require-lean-queries/index';
import { requireProjection } from './rules/require-projection/index';
import { requireSchemaValidation } from './rules/require-schema-validation/index';
import { requireTlsConnection } from './rules/require-tls-connection/index';

const ruleTester = new RuleTester();

// ---------------------------------------------------------------------------
// Layer 1 — RuleTester fixtures
// ---------------------------------------------------------------------------

ruleTester.run('no-bypass-middleware (coverage gaps)', noBypassMiddleware, {
  valid: [
    // Computed member access — property is a Literal, not an Identifier,
    // so methodName resolves to null and the call is not flagged.
    `User['updateOne']({ _id: id });`,
  ],
  invalid: [],
});

ruleTester.run('no-hardcoded-connection-string (coverage gaps)', noHardcodedConnectionString, {
  valid: [
    // Template literal whose first quasi does not match the MongoDB URI pattern.
    'const greeting = `hello ${name}`;',
  ],
  invalid: [],
});

ruleTester.run('no-hardcoded-credentials (coverage gaps)', noHardcodedCredentials, {
  valid: [
    // Computed key (BinaryExpression) — keyName resolves to null, no report.
    `const opts = { ['pass' + 'word']: 'secret123' };`,
  ],
  invalid: [
    // String-literal key — resolved via the Literal branch and reported.
    {
      code: `const opts = { 'password': 'secret123' };`,
      errors: [{ messageId: 'hardcodedCredentials' }],
    },
  ],
});

ruleTester.run('no-operator-injection (coverage gaps)', noOperatorInjection, {
  valid: [
    // Computed key (BinaryExpression) — keyName is null, early return.
    `const q = { ['$' + op]: req.body.value };`,
  ],
  invalid: [
    // String-literal '$ne' key with user input value — Literal key branch.
    {
      code: `User.find({ age: { '$ne': req.body.value } });`,
      errors: [{ messageId: 'operatorInjection' }],
    },
  ],
});

ruleTester.run('no-select-sensitive-fields (coverage gaps)', noSelectSensitiveFields, {
  valid: [
    // Native driver: inclusion projection without sensitive fields is safe.
    `db.users.find({}, { projection: { name: 1 } });`,
    // Spread inside the projection object is skipped; inclusion still counts.
    `db.users.find({}, { projection: { ...base, name: 1 } });`,
    // String-literal key naming a sensitive field, explicitly excluded with 0.
    `db.users.find({}, { projection: { 'password': 0, name: 1 } });`,
    // Numeric-literal key resolves to null keyName and is skipped.
    `db.users.find({}, { projection: { 1: 1, name: 1 } });`,
    // Boolean exclusion (false) and boolean inclusion (true).
    `db.users.find({}, { projection: { password: false, name: true } });`,
    // Computed member access — methodName is null, not a query method.
    `db.users['find']({});`,
    // `.select` accessed but never called — the grandparent is not a CallExpression.
    `User.find({}).select;`,
    // `.select()` called with no arguments.
    `User.find({}).select();`,
    // `.select(identifier)` — non-literal argument is not inspected.
    `User.find({}).select(fields);`,
    // `.select('-password')` — sensitive field present but exclusion-prefixed.
    `User.find({}).select('-password');`,
  ],
  invalid: [
    // Second argument is not an object — projection cannot be proven safe.
    {
      code: `db.users.find({}, "name");`,
      errors: [{ messageId: 'selectSensitiveFields' }],
    },
    // Options object without a projection property.
    {
      code: `db.users.find({}, { sort: { a: 1 } });`,
      errors: [{ messageId: 'selectSensitiveFields' }],
    },
    // projection value is not an object literal.
    {
      code: `db.users.find({}, { projection: req.query.p });`,
      errors: [{ messageId: 'selectSensitiveFields' }],
    },
    // Sensitive field explicitly included.
    {
      code: `db.users.find({}, { projection: { password: 1 } });`,
      errors: [{ messageId: 'selectSensitiveFields' }],
    },
    // Sensitive field with a non-literal value — cannot prove exclusion.
    {
      code: `db.users.find({}, { projection: { secret: req.query.x } });`,
      errors: [{ messageId: 'selectSensitiveFields' }],
    },
    // Exclusion-only projection (no inclusion) is not treated as safe.
    {
      code: `db.users.find({}, { projection: { name: 0 } });`,
      errors: [{ messageId: 'selectSensitiveFields' }],
    },
    // Non-boolean/non-numeric projection value never sets hasInclusion.
    {
      code: `db.users.find({}, { projection: { name: 'x' } });`,
      errors: [{ messageId: 'selectSensitiveFields' }],
    },
  ],
});

ruleTester.run('no-unbounded-find (coverage gaps)', noUnboundedFind, {
  valid: [
    // find() passed as an argument to a `.limit(...)` call — the chain walk
    // starts at a CallExpression whose callee is a `.limit` member expression.
    `q.limit(User.find({}));`,
    // Computed member access — methodName is null.
    `db.users['find']({});`,
  ],
  invalid: [
    // Native-driver options object present but without a `limit` property.
    {
      code: `db.users.find({}, { skip: 5 });`,
      errors: [{ messageId: 'unboundedFind' }],
    },
  ],
});

ruleTester.run('no-unsafe-populate (coverage gaps)', noUnsafePopulate, {
  valid: [
    // Member expression rooted at a call — getNodeSource returns '' for the object.
    `query.populate(getConfig().path);`,
    // Computed property — stringified as '[computed]', no user-input match.
    `query.populate(config['path']);`,
    // Computed method access — methodName is null, not 'populate'.
    `query['populate'](req.body.field);`,
    // Spread element inside the populate options object is skipped.
    `query.populate({ ...opts });`,
    // String-literal 'path' key — keyName resolves to null, not inspected.
    `query.populate({ 'path': req.body.field });`,
  ],
  invalid: [],
});

ruleTester.run('no-unsafe-query (coverage gaps)', noUnsafeQuery, {
  valid: [
    // Plain function call — callee is not a member expression.
    `find({ name: req.body.name });`,
    // Computed member access — methodName is null.
    `User['find']({ name: req.body.name });`,
    // Query argument is not an object literal.
    `User.find(req.body);`,
    // Spread element inside the query object is skipped.
    `User.find({ ...filters });`,
    // Template literal whose expression is a plain identifier — no user input.
    'User.find({ name: `${localName}` });',
    // Binary expression with a non-"+" operator is not unsafe.
    `User.find({ age: total - 1 });`,
    // Concatenation of a literal and a plain identifier — no user input, not
    // an identifier value, so no report.
    `User.find({ name: 'a' + suffix });`,
  ],
  invalid: [
    // Bare identifier value — reported with an $eq-wrapping suggestion.
    {
      code: `User.findOne({ username: username });`,
      errors: [
        {
          messageId: 'unsafeQuery',
          suggestions: [
            {
              messageId: 'suggestionUseEq',
              output: `User.findOne({ username: { $eq: username } });`,
            },
          ],
        },
      ],
    },
    // Template literal wrapping user input.
    {
      code: 'User.find({ name: `${req.body.name}` });',
      errors: [
        {
          messageId: 'unsafeQuery',
          suggestions: [
            {
              messageId: 'suggestionUseEq',
              output: 'User.find({ name: { $eq: `${req.body.name}` } });',
            },
          ],
        },
      ],
    },
    // String concatenation with user input on the right.
    {
      code: `User.find({ name: 'prefix' + req.body.name });`,
      errors: [
        {
          messageId: 'unsafeQuery',
          suggestions: [
            {
              messageId: 'suggestionUseEq',
              output: `User.find({ name: { $eq: 'prefix' + req.body.name } });`,
            },
          ],
        },
      ],
    },
    // Call expression argument containing user input inside a template.
    {
      code: 'User.find({ name: `${sanitize(req.body.name)}` });',
      errors: [
        {
          messageId: 'unsafeQuery',
          suggestions: [
            {
              messageId: 'suggestionUseEq',
              output: 'User.find({ name: { $eq: `${sanitize(req.body.name)}` } });',
            },
          ],
        },
      ],
    },
    // Call expression whose callee itself is user input.
    {
      code: 'User.find({ name: `${req.body.get()}` });',
      errors: [
        {
          messageId: 'unsafeQuery',
          suggestions: [
            {
              messageId: 'suggestionUseEq',
              output: 'User.find({ name: { $eq: `${req.body.get()}` } });',
            },
          ],
        },
      ],
    },
    // Spread arguments are filtered out; the tainted argument is still found.
    {
      code: 'User.find({ name: `${fn(...args, req.body.x)}` });',
      errors: [
        {
          messageId: 'unsafeQuery',
          suggestions: [
            {
              messageId: 'suggestionUseEq',
              output: 'User.find({ name: { $eq: `${fn(...args, req.body.x)}` } });',
            },
          ],
        },
      ],
    },
    // Computed property on user input — stringified as 'req.body.[computed]'.
    {
      code: `User.find({ name: req.body['x'] });`,
      errors: [
        {
          messageId: 'unsafeQuery',
          suggestions: [
            {
              messageId: 'suggestionUseEq',
              output: `User.find({ name: { $eq: req.body['x'] } });`,
            },
          ],
        },
      ],
    },
    // Member expression rooted at a string literal — Literal branch of
    // getNodeSource stringifies it to the tainted pattern.
    {
      code: `User.find({ name: 'req.body'.x });`,
      errors: [
        {
          messageId: 'unsafeQuery',
          suggestions: [
            {
              messageId: 'suggestionUseEq',
              output: `User.find({ name: { $eq: 'req.body'.x } });`,
            },
          ],
        },
      ],
    },
  ],
});

ruleTester.run('no-unsafe-regex-query (coverage gaps)', noUnsafeRegexQuery, {
  valid: [
    // Computed member access — methodName is null.
    `User['find']({ name: { $regex: req.body.x } });`,
    // No arguments — query argument missing.
    `User.find();`,
    // Query argument is not an object literal.
    `User.find(filters);`,
    // Spread element at the query top level is skipped.
    `User.find({ ...q });`,
    // Spread inside the nested value object is skipped; literal $regex is safe.
    `User.find({ name: { ...ops, $regex: 'safe' } });`,
    // Computed key (BinaryExpression) — keyName is null.
    `User.find({ name: { ['$' + 'regex']: req.body.x } });`,
    // Non-$regex operator key.
    `User.find({ name: { $eq: 'a' } });`,
    // new RegExp from a config member expression — no user-input pattern.
    `User.find({ name: { $regex: new RegExp(config.pattern) } });`,
    // $regex member expression rooted at a call — getNodeSource returns ''.
    `User.find({ name: { $regex: getConfig().user.input } });`,
  ],
  invalid: [
    // String-literal '$regex' key with user input — Literal key branch.
    {
      code: `User.find({ name: { '$regex': req.body.x } });`,
      errors: [{ messageId: 'unsafeRegex' }],
    },
    // Computed property on user input — '[computed]' still matches req.body.
    {
      code: `User.find({ name: { $regex: req.body['x'] } });`,
      errors: [{ messageId: 'unsafeRegex' }],
    },
  ],
});

ruleTester.run('no-unsafe-where (coverage gaps)', noUnsafeWhere, {
  valid: [
    // Computed key (BinaryExpression) — keyName resolves to null.
    `const q = { ['$' + 'where']: 'this.a == 1' };`,
  ],
  invalid: [],
});

ruleTester.run('require-auth-mechanism (coverage gaps)', requireAuthMechanism, {
  valid: [
    // Computed member access — methodName is null.
    `mongoose['connect'](uri);`,
    // Options argument is not an object literal — not inspected.
    `mongoose.connect(uri, getOptions());`,
    // String-literal 'authMechanism' key is recognized.
    `mongoose.connect(uri, { 'authMechanism': 'SCRAM-SHA-256' });`,
  ],
  invalid: [
    // Spread-only options — authMechanism cannot be proven present.
    {
      code: `mongoose.connect(uri, { ...opts });`,
      errors: [{ messageId: 'requireAuthMechanism' }],
    },
    // Computed template key — keyName is null, no authMechanism detected.
    {
      code: 'mongoose.connect(uri, { [`authMechanism`]: "SCRAM-SHA-256" });',
      errors: [{ messageId: 'requireAuthMechanism' }],
    },
  ],
});

ruleTester.run('require-lean-queries (coverage gaps)', requireLeanQueries, {
  valid: [
    // find() as an argument of a `.lean(...)` call — the chain walk starts at
    // a CallExpression whose callee is a `.lean` member expression.
    `helper.lean(User.find({}));`,
    // Computed member access — methodName is null.
    `User['find']({});`,
  ],
  invalid: [],
});

ruleTester.run('require-projection (coverage gaps)', requireProjection, {
  valid: [
    // find() as an argument of a `.select(...)` call — CallExpression branch
    // of hasChainedSelect.
    `helper.select(User.find({}));`,
    // Computed member access — methodName is null.
    `User['find']({});`,
  ],
  invalid: [],
});

ruleTester.run('require-schema-validation (coverage gaps)', requireSchemaValidation, {
  valid: [
    // No schema argument.
    `new Schema();`,
    // Schema argument is not an object literal.
    `new Schema(config);`,
    // Spread-only schema definition — no Property fields to check.
    `new Schema({ ...base });`,
    // Object-style field without a `type` property is skipped.
    `new Schema({ name: { required: true } });`,
  ],
  invalid: [
    // Spread inside the field definition is skipped by both scans; the field
    // has a type but no validation.
    {
      code: `new Schema({ name: { ...base, type: String } });`,
      errors: [{ messageId: 'requireSchemaValidation' }],
    },
    // String-literal 'required' key is not recognized as validation
    // (Identifier keys only), so the field is reported.
    {
      code: `new Schema({ name: { type: String, 'required': true } });`,
      errors: [{ messageId: 'requireSchemaValidation' }],
    },
  ],
});

ruleTester.run('require-tls-connection (coverage gaps)', requireTlsConnection, {
  valid: [
    // Computed member access — methodName is null.
    `mongoose['connect'](uri);`,
    // Zero arguments — nothing to report on.
    `mongoose.connect();`,
  ],
  invalid: [
    // Spread-only options — tls cannot be proven present.
    {
      code: `mongoose.connect(uri, { ...opts });`,
      errors: [{ messageId: 'requireTls' }],
    },
    // String-literal 'tls' key is not recognized (Identifier keys only).
    {
      code: `mongoose.connect(uri, { 'tls': true });`,
      errors: [{ messageId: 'requireTls' }],
    },
  ],
});

// ---------------------------------------------------------------------------
// Layer 2 — synthetic AST via createWithMockContext (parser-unreachable)
// ---------------------------------------------------------------------------

describe('no-hardcoded-connection-string — synthetic AST (Layer 2)', () => {
  it('ignores a TemplateLiteral with zero quasis (parser always emits >= 1)', () => {
    const { listeners, reports } = createWithMockContext(
      noHardcodedConnectionString as unknown as RuleLike,
    );
    const templateLiteralListener = listeners.TemplateLiteral as (node: unknown) => void;
    templateLiteralListener({ type: 'TemplateLiteral', quasis: [], expressions: [] });
    expect(reports).toHaveLength(0);
  });
});

describe('no-unbounded-find — synthetic AST (Layer 2)', () => {
  it('reports when the chain walk hits a parent-less cursor (parser always roots at Program)', () => {
    const { listeners, reports } = createWithMockContext(
      noUnboundedFind as unknown as RuleLike,
    );
    const callExpressionListener = listeners.CallExpression as (node: unknown) => void;
    const node = {
      type: 'CallExpression',
      callee: {
        type: 'MemberExpression',
        object: { type: 'Identifier', name: 'User' },
        property: { type: 'Identifier', name: 'find' },
      },
      arguments: [],
      // Orphan parent: not part of a member/call chain and with no parent of
      // its own — forces the `if (!next) break;` branch in the chain walk.
      parent: { type: 'ReturnStatement', parent: undefined },
    };
    callExpressionListener(node);
    expect(reports).toHaveLength(1);
    expect((reports[0] as { messageId: string }).messageId).toBe('unboundedFind');
  });
});

describe('no-select-sensitive-fields — null sensitiveFields option (Layer 2)', () => {
  // The schema (`items: { type: 'string' }` array) rejects `null` and the
  // destructuring default at create() only fires for `undefined`, so the
  // `sensitiveFields ?? DEFAULT_SENSITIVE_FIELDS` fallbacks are unreachable
  // through the real pipeline. A mock context bypasses schema validation and
  // proves the rule still enforces the DEFAULT list when handed `null`.
  const makeQueryNode = (
    method: string,
    args: unknown[],
    parent: unknown = { type: 'ExpressionStatement' },
  ) => ({
    type: 'CallExpression',
    callee: {
      type: 'MemberExpression',
      object: { type: 'Identifier', name: 'User' },
      property: { type: 'Identifier', name: method },
    },
    arguments: args,
    parent,
  });

  const projection = (props: Array<{ key: string; value: unknown }>) => ({
    type: 'ObjectExpression',
    properties: [
      {
        type: 'Property',
        key: { type: 'Identifier', name: 'projection' },
        value: {
          type: 'ObjectExpression',
          properties: props.map((p) => ({
            type: 'Property',
            key: { type: 'Identifier', name: p.key },
            value: { type: 'Literal', value: p.value },
          })),
        },
      },
    ],
  });

  it('falls back to the DEFAULT list for projections: safe inclusion projection stays silent', () => {
    const { listeners, reports } = createWithMockContext(
      noSelectSensitiveFields as unknown as RuleLike,
      { options: [{ sensitiveFields: null }] },
    );
    const listener = listeners.CallExpression as (node: unknown) => void;
    listener(
      makeQueryNode('find', [{ type: 'ObjectExpression', properties: [] }, projection([{ key: 'name', value: 1 }])]),
    );
    expect(reports).toHaveLength(0);
  });

  it('falls back to the DEFAULT list for projections: including `password` still reports', () => {
    const { listeners, reports } = createWithMockContext(
      noSelectSensitiveFields as unknown as RuleLike,
      { options: [{ sensitiveFields: null }] },
    );
    const listener = listeners.CallExpression as (node: unknown) => void;
    listener(
      makeQueryNode('find', [
        { type: 'ObjectExpression', properties: [] },
        projection([{ key: 'password', value: 1 }]),
      ]),
    );
    expect(reports).toHaveLength(1);
    expect((reports[0] as { messageId: string }).messageId).toBe('selectSensitiveFields');
  });

  it('falls back to the DEFAULT list in .select() scans: selecting `password` reports on the select call', () => {
    const { listeners, reports } = createWithMockContext(
      noSelectSensitiveFields as unknown as RuleLike,
      { options: [{ sensitiveFields: null }] },
    );
    const listener = listeners.CallExpression as (node: unknown) => void;
    const selectCall = {
      type: 'CallExpression',
      arguments: [{ type: 'Literal', value: 'password email' }],
    };
    const selectMember = {
      type: 'MemberExpression',
      property: { type: 'Identifier', name: 'select' },
      parent: selectCall,
    };
    listener(makeQueryNode('findOne', [], selectMember));
    expect(reports).toHaveLength(1);
    const report = reports[0] as { messageId: string; node: unknown };
    expect(report.messageId).toBe('selectSensitiveFields');
    expect(report.node).toBe(selectCall);
  });

  it('falls back to the DEFAULT list in .select() scans: excluding `-password` stays silent', () => {
    const { listeners, reports } = createWithMockContext(
      noSelectSensitiveFields as unknown as RuleLike,
      { options: [{ sensitiveFields: null }] },
    );
    const listener = listeners.CallExpression as (node: unknown) => void;
    const selectCall = {
      type: 'CallExpression',
      arguments: [{ type: 'Literal', value: '-password email' }],
    };
    const selectMember = {
      type: 'MemberExpression',
      property: { type: 'Identifier', name: 'select' },
      parent: selectCall,
    };
    listener(makeQueryNode('findOne', [], selectMember));
    expect(reports).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// oxlint sub-export (src/oxlint.ts)
// ---------------------------------------------------------------------------

type Plugin = typeof mainPlugin;

describe('eslint-plugin-mongodb-security/oxlint sub-export', () => {
  it('declares the ./oxlint sub-export in package.json', () => {
    const pkgJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf8'),
    );
    expect(pkgJson.exports['./oxlint']).toEqual({
      types: './src/oxlint.d.ts',
      default: './src/oxlint.js',
    });
  });

  it('re-exports the plugin object (meta + rules at top level)', async () => {
    const oxlintModule = await import('./oxlint.js');
    const oxlintPlugin = (oxlintModule as unknown as { default: Plugin }).default;
    expect(oxlintPlugin).toBeDefined();
    expect(oxlintPlugin.meta?.name).toBe('eslint-plugin-mongodb-security');
    expect(oxlintPlugin.rules).toBeDefined();
  });

  it('exposes the same rule names as the main entry (no rules dropped)', async () => {
    const oxlintModule = await import('./oxlint.js');
    const oxlintPlugin = (oxlintModule as unknown as { default: Plugin }).default;
    expect(Object.keys(oxlintPlugin.rules || {}).toSorted()).toEqual(
      Object.keys(mainPlugin.rules || {}).toSorted(),
    );
  });

  it('exposes the same rule references (pass-through, not a copy)', async () => {
    const oxlintModule = await import('./oxlint.js');
    const oxlintPlugin = (oxlintModule as unknown as { default: Plugin }).default;
    for (const ruleName of Object.keys(mainPlugin.rules || {})) {
      expect(oxlintPlugin.rules?.[ruleName]).toBe(
        (mainPlugin.rules as Record<string, unknown>)[ruleName],
      );
    }
  });
});
