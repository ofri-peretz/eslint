/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Tests for the shared CWE-319 detector.
 *
 * Two instances run side by side: a URL-capable driver (mysql-style, with a
 * connection string) and a nested-options driver (Sequelize-style, where the
 * TLS bag hides under `dialectOptions`).
 *
 * The `describe('the driver gate is not a formality')` block is the
 * self-suppression lock the quality contract requires. This rule's whole
 * claim to living in a driver plugin instead of `node-security` is that it
 * only fires on database connection configs — so the cases that must stay
 * silent (a `fetch` agent, an https option bag, a bare TLS key with no
 * connection sibling) are the ones that prove the boundary is real. If the
 * gate were dropped, those become false positives AND double-reports with
 * node-security, which is exactly what the taxonomy contract forbids.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll, expect } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import {
  createRequireTlsRule,
  isLiteralBoolean,
  looksLikeConnectionConfig,
  inConnectionPosition,
  urlDisablesTls,
} from './require-tls-rule';
import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/utils';

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

const docs = (name: string) => ({
  type: 'problem' as const,
  docs: {
    description: `test rule (${name})`,
    url: `https://example.test/${name}`,
    cwe: 'CWE-319',
    cvss: 7.4,
    confidence: 'high' as const,
  },
});

/** A driver that also accepts a connection URL — the mysql2 / pg shape. */
const urlDriver = createRequireTlsRule({
  meta: docs('url'),
  modules: ['mysql2'],
  urlSchemes: ['mysql'],
  fix: 'Set `ssl: { ca }`.',
  documentationLink: 'https://example.test/tls',
});

/** A driver that nests its TLS bag — the Sequelize shape. */
const nestedDriver = createRequireTlsRule({
  meta: docs('nested'),
  modules: ['sequelize'],
  connectionKeys: ['dialectOptions', 'dialect'],
  fix: 'Set `dialectOptions.ssl.ca`.',
  documentationLink: 'https://example.test/tls',
});

const IMPORT = "import mysql from 'mysql2';\n";
const SEQ = "import { Sequelize } from 'sequelize';\n";

describe('createRequireTlsRule', () => {
  ruleTester.run('require-tls (url driver)', urlDriver, {
    valid: [
      // No driver import — the file is none of this rule's business, which is
      // the line between it and node-security.
      { code: "const config = { host: 'db', ssl: false };" },
      // TLS on.
      { code: `${IMPORT}const config = { host: 'db', ssl: true };` },
      { code: `${IMPORT}const config = { host: 'db', ssl: { ca } };` },
      // Verification explicitly on.
      {
        code: `${IMPORT}const config = { host: 'db', ssl: { rejectUnauthorized: true } };`,
      },
      // Unreadable value — a variable this rule cannot resolve. Staying silent
      // here is the deliberate false negative that keeps findings real.
      { code: `${IMPORT}const config = { host: 'db', ssl: useTls };` },
      { code: `${IMPORT}const config = { host: 'db', ssl: { rejectUnauthorized: flag } };` },
      // A TLS key with no connection-shaped sibling is not a database config.
      { code: `${IMPORT}const agent = { ssl: false };` },
      { code: `${IMPORT}const agent = { rejectUnauthorized: false };` },
      // Computed key — not statically known, never guessed.
      { code: `${IMPORT}const config = { host: 'db', [key]: false };` },
      // A URL that keeps TLS.
      { code: `${IMPORT}const dsn = 'mysql://u:p@h/db?sslmode=require';` },
      // Not this driver's URL scheme.
      { code: `${IMPORT}const dsn = 'redis://h:6379?sslmode=disable';` },
      // Prose that merely mentions the parameter is not a connection string.
      { code: `${IMPORT}const hint = 'pass sslmode=disable to skip TLS';` },
      // A value libpq does not accept — not a real disable.
      { code: `${IMPORT}const dsn = 'mysql://h/db?sslmode=disabled-for-now';` },
      // Importing the driver does not make every string a connection string.
      // A bare assignment is indistinguishable from a fixture, a doc example
      // or an error-message template, so it is not reported even though the
      // DSN itself would qualify in a connection position.
      { code: `${IMPORT}const example = 'mysql://u:p@h/db?sslmode=disable';` },
      {
        code: `${IMPORT}const MESSAGE = 'never use mysql://u:p@h/db?sslmode=disable in prod';`,
      },
      {
        code: `${IMPORT}const fixtures = ['mysql://u:p@h/db?sslmode=disable'];`,
      },
      // An argument to something that is not a driver handle.
      { code: `${IMPORT}log('mysql://u:p@h/db?sslmode=disable');` },
      // A property whose key is not connection-shaped.
      { code: `${IMPORT}const doc = { example: 'mysql://u:p@h/db?sslmode=disable' };` },
    ],
    invalid: [
      {
        code: `${IMPORT}const config = { host: 'db', ssl: false };`,
        errors: [{ messageId: 'tlsDisabled' }],
      },
      // Falsy non-boolean literals disable it just as effectively.
      {
        code: `${IMPORT}const config = { host: 'db', ssl: 0 };`,
        errors: [{ messageId: 'tlsDisabled' }],
      },
      {
        code: `${IMPORT}const config = { host: 'db', ssl: { rejectUnauthorized: false } };`,
        errors: [{ messageId: 'certificateValidationDisabled' }],
      },
      // Hoisted to the top level, as mysql2 allows.
      {
        code: `${IMPORT}const config = { database: 'app', rejectUnauthorized: false };`,
        errors: [{ messageId: 'certificateValidationDisabled' }],
      },
      // Inverted spelling: dangerous when true.
      {
        code: `${IMPORT}const config = { database: 'app', trustServerCertificate: true };`,
        errors: [{ messageId: 'certificateValidationDisabled' }],
      },
      {
        code: `${IMPORT}const c = mysql.createConnection('mysql://u:p@h/db?sslmode=disable');`,
        errors: [{ messageId: 'tlsDisabled' }],
      },
      {
        code: `${IMPORT}const config = { host: 'h', uri: 'mysql://u:p@h/db?ssl=false&pool=5' };`,
        errors: [{ messageId: 'tlsDisabled' }],
      },
      // A spread sits in the property list and is skipped — it carries no key
      // this rule can read, and it must not stop the scan of its siblings.
      {
        code: `${IMPORT}const config = { host: 'db', ...base, ssl: false };`,
        errors: [{ messageId: 'tlsDisabled' }],
      },
      // `require()` reaches the same gate as `import`.
      {
        code: "const mysql = require('mysql2');\nconst config = { host: 'db', ssl: false };",
        errors: [{ messageId: 'tlsDisabled' }],
      },
      // Nested under a `connection` key — knex's shape. The inner object
      // carries `host`, so it qualifies on its own visit.
      {
        code: `${IMPORT}const config = { connection: { host: 'db', ssl: false } };`,
        errors: [{ messageId: 'tlsDisabled' }],
      },
    ],
  });

  ruleTester.run('require-tls (nested driver)', nestedDriver, {
    valid: [
      { code: `${SEQ}const config = { dialect: 'postgres', dialectOptions: { ssl: { ca } } };` },
      // No URL schemes configured — a connection string is not scanned at all.
      { code: `${SEQ}const dsn = 'postgres://h/db?sslmode=disable';` },
    ],
    invalid: [
      {
        code: `${SEQ}const config = { dialect: 'postgres', ssl: false };`,
        errors: [{ messageId: 'tlsDisabled' }],
      },
      {
        code: `${SEQ}const config = { dialectOptions: { ssl: { rejectUnauthorized: false } }, database: 'app' };`,
        errors: [{ messageId: 'certificateValidationDisabled' }],
      },
    ],
  });

  /**
   * Self-suppression lock. Each case is a finding that a loosely written gate
   * would swallow. Revert the guard it names and the case flips to silent.
   */
  describe('the driver gate is not a formality', () => {
    ruleTester.run('require-tls (suppression lock)', urlDriver, {
      valid: [
        // If the import gate were dropped to "any object with ssl:false",
        // every https agent in the repo becomes a finding — and a duplicate
        // of node-security's, which the taxonomy contract forbids.
        { code: "const agent = new https.Agent({ host: 'api', rejectUnauthorized: false });" },
      ],
      invalid: [
        // If `looksLikeConnectionConfig` were widened to accept `ssl` itself as
        // a connection key, the object below would still report — but so would
        // every TLS bag in the file. The lock is that this one reports for the
        // right reason: `host`.
        {
          code: `${IMPORT}const config = { host: 'db', ssl: false };`,
          errors: [{ messageId: 'tlsDisabled' }],
        },
        // If the URL check dropped its scheme anchor, the string below would
        // still report and so would every doc comment. The lock is the pair:
        // this reports, the prose case above stays valid.
        {
          code: `${IMPORT}const c = mysql.createConnection('mysql://h/db?sslmode=disable');`,
          errors: [{ messageId: 'tlsDisabled' }],
        },
      ],
    });
  });
});

describe('isLiteralBoolean', () => {
  const literal = (value: unknown): TSESTree.Node =>
    ({ type: AST_NODE_TYPES.Literal, value } as TSESTree.Node);

  it('matches the requested boolean', () => {
    expect(isLiteralBoolean(literal(false), false)).toBe(true);
    expect(isLiteralBoolean(literal(true), true)).toBe(true);
    expect(isLiteralBoolean(literal(true), false)).toBe(false);
    expect(isLiteralBoolean(literal(false), true)).toBe(false);
  });

  it('treats any falsy literal as off, and never as on', () => {
    expect(isLiteralBoolean(literal(0), false)).toBe(true);
    expect(isLiteralBoolean(literal(null), false)).toBe(true);
    expect(isLiteralBoolean(literal(''), false)).toBe(true);
    expect(isLiteralBoolean(literal(1), false)).toBe(false);
    // There is no falsy value that means "verification is on".
    expect(isLiteralBoolean(literal(0), true)).toBe(false);
  });

  it('never reads a non-literal', () => {
    expect(
      isLiteralBoolean({ type: AST_NODE_TYPES.Identifier, name: 'flag' } as TSESTree.Node, false),
    ).toBe(false);
  });
});

describe('looksLikeConnectionConfig', () => {
  const obj = (keys: readonly string[]): TSESTree.ObjectExpression =>
    ({
      type: AST_NODE_TYPES.ObjectExpression,
      properties: keys.map((name) => ({
        type: AST_NODE_TYPES.Property,
        computed: false,
        key: { type: AST_NODE_TYPES.Identifier, name },
        value: { type: AST_NODE_TYPES.Literal, value: 1 },
      })),
    } as unknown as TSESTree.ObjectExpression);

  it('requires at least one connection-identifying key', () => {
    expect(looksLikeConnectionConfig(obj(['host']), ['host'])).toBe(true);
    expect(looksLikeConnectionConfig(obj(['ssl']), ['host'])).toBe(false);
    expect(looksLikeConnectionConfig(obj([]), ['host'])).toBe(false);
  });

  it('ignores properties whose key cannot be read', () => {
    const spread = {
      type: AST_NODE_TYPES.ObjectExpression,
      properties: [{ type: AST_NODE_TYPES.SpreadElement }],
    } as unknown as TSESTree.ObjectExpression;
    expect(looksLikeConnectionConfig(spread, ['host'])).toBe(false);
  });
});

/**
 * L2 unit tests for the URL position gate.
 *
 * Three of its branches cannot be produced from source: ESLint always hands the
 * visitor a parented node, a Literal is never a callee, and the chained-call
 * receiver form needs a shape no driver actually publishes. Per the quality
 * contract they are exercised directly rather than ignored.
 */
describe('inConnectionPosition', () => {
  const KEYS = ['connection', 'uri', 'url'];
  const DRIVERS = new Set(['mysql']);
  const lit = (parent?: unknown): TSESTree.Literal =>
    ({ type: AST_NODE_TYPES.Literal, value: 'mysql://h/db?sslmode=disable', parent } as unknown as TSESTree.Literal);

  it('is false for a node with no parent', () => {
    expect(inConnectionPosition(lit(undefined), KEYS, DRIVERS)).toBe(false);
  });

  it('is false for a literal that is a property KEY rather than its value', () => {
    const node = lit();
    (node as { parent?: unknown }).parent = {
      type: AST_NODE_TYPES.Property,
      computed: false,
      key: node,
      value: { type: AST_NODE_TYPES.Identifier, name: 'x' },
    };
    expect(inConnectionPosition(node, KEYS, DRIVERS)).toBe(false);
  });

  it('is false when the literal sits on a call but is not one of its arguments', () => {
    const node = lit();
    (node as { parent?: unknown }).parent = {
      type: AST_NODE_TYPES.CallExpression,
      callee: { type: AST_NODE_TYPES.Identifier, name: 'mysql' },
      arguments: [],
    };
    expect(inConnectionPosition(node, KEYS, DRIVERS)).toBe(false);
  });

  it('walks a chained-call receiver back to the driver binding', () => {
    const node = lit();
    (node as { parent?: unknown }).parent = {
      type: AST_NODE_TYPES.CallExpression,
      // `mysql.pool().connect('mysql://…')` — the base is two hops away.
      callee: {
        type: AST_NODE_TYPES.MemberExpression,
        object: {
          type: AST_NODE_TYPES.CallExpression,
          callee: {
            type: AST_NODE_TYPES.MemberExpression,
            object: { type: AST_NODE_TYPES.Identifier, name: 'mysql' },
          },
        },
      },
      arguments: [node],
    };
    expect(inConnectionPosition(node, KEYS, DRIVERS)).toBe(true);
  });

  it('is false when that chain bottoms out somewhere other than the driver', () => {
    const node = lit();
    (node as { parent?: unknown }).parent = {
      type: AST_NODE_TYPES.CallExpression,
      callee: {
        type: AST_NODE_TYPES.MemberExpression,
        object: { type: AST_NODE_TYPES.Identifier, name: 'logger' },
      },
      arguments: [node],
    };
    expect(inConnectionPosition(node, KEYS, DRIVERS)).toBe(false);
  });
});

describe('urlDisablesTls', () => {
  it('requires one of the driver schemes', () => {
    expect(urlDisablesTls('mysql://h/db?sslmode=disable', ['mysql'])).toBe(true);
    expect(urlDisablesTls('redis://h/db?sslmode=disable', ['mysql'])).toBe(false);
    expect(urlDisablesTls('sslmode=disable', ['mysql'])).toBe(false);
    expect(urlDisablesTls('mysql://h/db?sslmode=disable', [])).toBe(false);
  });

  it('matches the parameter forms drivers actually accept', () => {
    expect(urlDisablesTls('mysql://h/db?ssl=false', ['mysql'])).toBe(true);
    expect(urlDisablesTls('mysql://h/db?ssl=0&x=1', ['mysql'])).toBe(true);
    expect(urlDisablesTls('mysql://h/db?sslmode=require', ['mysql'])).toBe(false);
    expect(urlDisablesTls('mysql://h/db?sslmode=disabled-for-now', ['mysql'])).toBe(false);
  });

  // Regression: the terminator was `(?:&|$)`, so a fragment made the finding
  // vanish. A `#` ends the query string exactly as `&` separates within it.
  it('a URL fragment does not hide the parameter', () => {
    expect(urlDisablesTls('mysql://h/db?sslmode=disable#frag', ['mysql'])).toBe(true);
    expect(urlDisablesTls('mysql://h/db?ssl=false#x', ['mysql'])).toBe(true);
    expect(urlDisablesTls('mysql://h/db?x=1&sslmode=disable#frag', ['mysql'])).toBe(true);
    // Still not a match when the value is not a real disable.
    expect(urlDisablesTls('mysql://h/db?sslmode=require#frag', ['mysql'])).toBe(false);
  });

  // The other half of the same boundary: text *inside* the fragment is not a
  // connection option — no driver parses it — so it must not be a finding.
  // Accepting `#` as a leading separator made this a false positive.
  it('a parameter inside the fragment is not a finding', () => {
    expect(urlDisablesTls('mysql://h/db#?sslmode=disable', ['mysql'])).toBe(false);
    expect(urlDisablesTls('mysql://h/db#ssl=false', ['mysql'])).toBe(false);
    expect(urlDisablesTls('mysql://h/db#notes?ssl=0', ['mysql'])).toBe(false);
    // A real parameter before the fragment still reports.
    expect(urlDisablesTls('mysql://h/db?ssl=false#?sslmode=require', ['mysql'])).toBe(true);
  });
});
