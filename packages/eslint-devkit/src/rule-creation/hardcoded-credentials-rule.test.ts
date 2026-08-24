/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Factory-level coverage for `createHardcodedCredentialsRule`.
 *
 * The precision cases carry the weight here. The detection this generalizes
 * (`postgresql-security/no-hardcoded-credentials`) reports any `postgres://`
 * literal and any `connectionString` literal — both fire on strings that are
 * safe to commit. The `valid` block below is what makes this version different,
 * so it is the half that must not be weakened.
 */

import { describe, expect, it, afterAll } from 'vitest';
import { RuleTester } from '@typescript-eslint/rule-tester';
import * as parser from '@typescript-eslint/parser';

import {
  createHardcodedCredentialsRule,
  urlEmbedsCredentials,
  isLiteralSecret,
} from './hardcoded-credentials-rule';
import type { TSESTree } from '@typescript-eslint/utils';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const SCHEMES = ['postgres', 'postgresql', 'mysql'];

describe('urlEmbedsCredentials', () => {
  it('matches the userinfo form that actually carries a secret', () => {
    expect(
      urlEmbedsCredentials('postgres://app:s3cret@db.internal/app', SCHEMES),
    ).toBe(true);
    expect(
      urlEmbedsCredentials('postgres://app:s3cret@db:5432/app', SCHEMES),
    ).toBe(true);
    expect(urlEmbedsCredentials('MYSQL://u:p@h/d', SCHEMES)).toBe(true);
  });

  it('does NOT match a connection string with no password in it', () => {
    // The whole reason this helper exists. These are safe to commit, and the
    // detection this generalizes reports all of them.
    expect(urlEmbedsCredentials('postgres://localhost:5432/app', SCHEMES)).toBe(
      false,
    );
    expect(
      urlEmbedsCredentials('postgres://app@db.internal/app', SCHEMES),
    ).toBe(false);
    expect(urlEmbedsCredentials('postgres://db.internal/app', SCHEMES)).toBe(
      false,
    );
  });

  it('requires a scheme this driver actually speaks', () => {
    expect(urlEmbedsCredentials('redis://u:p@h/0', SCHEMES)).toBe(false);
    expect(urlEmbedsCredentials('postgres://u:p@h/d', ['mysql'])).toBe(false);
    expect(urlEmbedsCredentials('postgres://u:p@h/d', [])).toBe(false);
  });

  it('reports an empty username, which still carries a real password', () => {
    expect(urlEmbedsCredentials('postgres://:s3cret@db/app', SCHEMES)).toBe(
      true,
    );
  });

  // Regression for CodeQL js/polynomial-redos. With `:` inside the username
  // class the two quantifiers around the delimiter were ambiguous, so a run of
  // colons backtracked. This rule reads whatever source it is pointed at, so a
  // pathological string literal is genuinely attacker-supplied.
  it('does not blow up on a long run of colons', () => {
    const pathological = 'a://:' + ':'.repeat(20_000);
    const started = process.hrtime.bigint();
    expect(urlEmbedsCredentials(pathological, SCHEMES)).toBe(false);
    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    expect(ms).toBeLessThan(25);
  });

  it('is not fooled by an @ that is not userinfo', () => {
    expect(urlEmbedsCredentials('not a url at all', SCHEMES)).toBe(false);
    expect(urlEmbedsCredentials('postgres://host/path:with@at', SCHEMES)).toBe(
      false,
    );
  });
});

describe('isLiteralSecret', () => {
  const valueOf = (code: string): TSESTree.Node =>
    (
      (
        (
          parser.parse(code, { range: true })
            .body[0] as TSESTree.ExpressionStatement
        ).expression as TSESTree.ObjectExpression
      ).properties[0] as TSESTree.Property
    ).value;

  it('is true for a non-empty string literal', () => {
    expect(isLiteralSecret(valueOf("({ password: 'hunter2' })"))).toBe(true);
  });

  it('is false for the env lookup that is the fix', () => {
    expect(
      isLiteralSecret(valueOf('({ password: process.env.DB_PASSWORD })')),
    ).toBe(false);
  });

  it('is false for an empty string — the driver "no password" sentinel', () => {
    expect(isLiteralSecret(valueOf("({ password: '' })"))).toBe(false);
  });

  it('is false for an *interpolated* template — that value is decided at runtime', () => {
    expect(isLiteralSecret(valueOf('({ password: `${a}` })'))).toBe(false);
    expect(isLiteralSecret(valueOf('({ password: `pre-${a}` })'))).toBe(false);
  });

  it('is false for non-strings', () => {
    expect(isLiteralSecret(valueOf('({ password: null })'))).toBe(false);
    expect(isLiteralSecret(valueOf('({ password: 123 })'))).toBe(false);
  });

  // Regression: reading only `Literal` meant one character — a backtick —
  // bypassed both credential paths. A static template is exactly as committed.
  it('is TRUE for a static template literal', () => {
    expect(isLiteralSecret(valueOf('({ password: `hunter2` })'))).toBe(true);
  });

  it('is false for an empty static template', () => {
    expect(isLiteralSecret(valueOf('({ password: `` })'))).toBe(false);
  });
});

const rule = createHardcodedCredentialsRule({
  meta: {
    type: 'problem',
    docs: {
      description: 'test',
      url: 'https://example.test/rule',
      cwe: 'CWE-798',
      cvss: 9.8,
      confidence: 'high',
    },
  },
  modules: ['test-orm'],
  connectionKeys: ['connection', 'replication'],
  urlSchemes: ['postgres', 'mysql'],
  fix: 'read it from the environment',
  urlFix: 'inject the whole URL',
  documentationLink: 'https://example.test/docs',
});

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  },
});

const DRIVER = "import knex from 'test-orm';\n";

describe('createHardcodedCredentialsRule', () => {
  ruleTester.run('valid', rule, {
    valid: [
      {
        name: 'the env lookup that is the fix',
        code:
          DRIVER + 'knex({ host, user, password: process.env.DB_PASSWORD });',
      },
      {
        // Regression against the generalized detection: a credential-free URL
        // is safe to commit and must stay silent.
        name: 'a connection URL with no credentials in it',
        code: DRIVER + "knex({ connection: 'postgres://localhost:5432/app' });",
      },
      {
        name: 'a URL with a username but no password',
        code:
          DRIVER + "knex({ connection: 'postgres://app@db.internal/app' });",
      },
      {
        name: 'an empty password — the local trust-auth sentinel',
        code: DRIVER + "knex({ host, user, password: '' });",
      },
      {
        name: 'a template literal is a runtime value',
        code: DRIVER + 'knex({ host, user, password: `${secret}` });',
      },
      {
        name: 'no driver import, no finding',
        code: "knex({ host, user, password: 'hunter2' });",
      },
      {
        // The credential cannot be its own evidence of being a connection.
        // Every app with a signup form and a database would report here.
        name: 'a signup form is not a connection config',
        code: DRIVER + "const form = { password: 'hunter2', confirm: true };",
      },
      {
        name: 'a login form is not a connection config either',
        code: DRIVER + "const creds = { user: 'admin', password: 'hunter2' };",
      },
      {
        name: 'a test fixture user record',
        code:
          DRIVER +
          "const fixture = { username: 'alice', password: 'test123' };",
      },
      {
        name: 'a URL for a scheme this driver does not speak',
        code: DRIVER + "knex({ connection: 'redis://u:p@h/0' });",
      },
      {
        name: 'a bare DSN not in a connection position',
        code: DRIVER + "const example = 'postgres://u:p@h/d';",
      },
      {
        // A third-party secret nested under a driver config key is not a
        // database credential. Recursing into every nested object made it one.
        name: 'a third-party secret nested under a driver config key',
        code:
          DRIVER +
          "knex({ host, database, connection: { webhook: { secret: 'wh-abc' } } });",
      },
      {
        name: 'an interpolated template is a runtime value',
        code: DRIVER + 'knex({ host, user, database, password: `${secret}` });',
      },
    ],
    invalid: [
      {
        name: 'a literal password in a connection config',
        code: DRIVER + "knex({ host, user, database, password: 'hunter2' });",
        errors: [{ messageId: 'hardcodedPassword' }],
      },
      {
        name: 'credentials embedded in a connection URL',
        code:
          DRIVER +
          "knex({ connection: 'postgres://app:s3cret@db.internal/app' });",
        errors: [{ messageId: 'credentialsInUrl' }],
      },
      {
        name: 'a URL passed straight to the driver',
        code: DRIVER + "knex('postgres://app:s3cret@db.internal/app');",
        errors: [{ messageId: 'credentialsInUrl' }],
      },
      {
        name: 'nested connection config',
        code:
          DRIVER +
          "knex({ client: 'pg', connection: { host, password: 'hunter2' } });",
        errors: [{ messageId: 'hardcodedPassword' }],
      },
      {
        name: 'the other credential spellings',
        code: DRIVER + "knex({ host, user, pwd: 'a', secret: 'b' });",
        errors: [
          { messageId: 'hardcodedPassword' },
          { messageId: 'hardcodedPassword' },
        ],
      },
      {
        // Regression: one character — a backtick — used to bypass the rule.
        name: 'a static template literal password',
        code: DRIVER + 'knex({ host, user, database, password: `hunter2` });',
        errors: [{ messageId: 'hardcodedPassword' }],
      },
      {
        name: 'a static template literal connection URL',
        code: DRIVER + 'knex({ connection: `postgres://app:s3cret@db/app` });',
        errors: [{ messageId: 'credentialsInUrl' }],
      },
      {
        name: 'a static template URL passed straight to the driver',
        code: DRIVER + 'knex(`postgres://app:s3cret@db/app`);',
        errors: [{ messageId: 'credentialsInUrl' }],
      },
      {
        name: 'a credential directly under a driver config key still reports',
        code:
          DRIVER +
          "knex({ host, database, connection: { password: 'hunter2' } });",
        errors: [{ messageId: 'hardcodedPassword' }],
      },
      {
        name: 'a quoted key is still a credential',
        code: DRIVER + "knex({ host, user, 'password': 'hunter2' });",
        errors: [{ messageId: 'hardcodedPassword' }],
      },
      {
        // The dedupe guard: the nested object is reached both by the visitor
        // and by the parent's recursion.
        name: 'a nested config reports once, not twice',
        code:
          DRIVER +
          "knex({ client: 'pg', connection: { host, user, database, password: 'hunter2' } });",
        errors: [{ messageId: 'hardcodedPassword' }],
      },
    ],
  });
});

/** No `connectionKeys` — the shared defaults have to carry the whole gate. */
const bareRule = createHardcodedCredentialsRule({
  meta: {
    type: 'problem',
    docs: {
      description: 'test',
      url: 'https://example.test/rule',
      cwe: 'CWE-798',
      cvss: 9.8,
      confidence: 'high',
    },
  },
  modules: ['test-orm'],
  urlSchemes: ['postgres'],
  fix: 'read it from the environment',
  urlFix: 'inject the whole URL',
  documentationLink: 'https://example.test/docs',
});

describe('createHardcodedCredentialsRule — no driver-specific connection keys', () => {
  ruleTester.run('bare config', bareRule, {
    valid: [
      {
        name: 'still not a login form',
        code: DRIVER + "const c = { user, password: 'x' };",
      },
    ],
    invalid: [
      {
        name: 'the shared defaults still identify a connection',
        code: DRIVER + "knex({ host, port, database, password: 'hunter2' });",
        errors: [{ messageId: 'hardcodedPassword' }],
      },
    ],
  });
});

describe('object shapes the scanner has to walk past', () => {
  ruleTester.run('exotic properties', rule, {
    valid: [
      {
        name: 'a computed key cannot be read statically',
        code: DRIVER + 'knex({ host, database, [key]: secret });',
      },
    ],
    invalid: [
      {
        // A spread has no key at all; the scanner must skip it and keep going
        // rather than stop at the first non-Property member.
        name: 'a spread does not hide a later credential',
        code:
          DRIVER +
          "knex({ host, database, ...defaults, password: 'hunter2' });",
        errors: [{ messageId: 'hardcodedPassword' }],
      },
      {
        name: 'a computed key does not hide a later credential',
        code:
          DRIVER + "knex({ host, database, [key]: v, password: 'hunter2' });",
        errors: [{ messageId: 'hardcodedPassword' }],
      },
    ],
  });
});

describe('rule metadata', () => {
  it('carries both message ids with their own remediations', () => {
    expect(rule.meta.messages.hardcodedPassword).toContain(
      'read it from the environment',
    );
    expect(rule.meta.messages.credentialsInUrl).toContain(
      'inject the whole URL',
    );
  });

  it('emits the CWE it documents, so the two cannot drift', () => {
    expect(rule.meta.messages.hardcodedPassword).toContain('CWE-798');
    expect(rule.meta.docs?.cwe).toBe('CWE-798');
  });

  it('takes no options', () => {
    expect(rule.meta.schema).toEqual([]);
    expect(rule.defaultOptions).toEqual([]);
  });
});
