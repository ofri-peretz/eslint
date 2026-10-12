/**
 * Tests for knex-security/require-tls
 * CWE-319 — database connections opened in cleartext, or without
 * authenticating the server.
 *
 * The detector's own branch coverage lives with the factory
 * (`@interlace/eslint-devkit`). What this file locks is the Knex *contract*:
 * the connection settings sit one level down under `connection`, and Knex
 * accepts that key as either an object or a URL string.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { requireTls } from './index';

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

/** Opens the rule's import gate; see `modules` on the factory config. */
const DRIVER = "import Knex from 'knex';\n";

describe('require-tls', () => {
  describe('Valid — TLS is on, or the setting cannot be read', () => {
    ruleTester.run('valid', requireTls, {
      valid: [
        {
          name: 'CA supplied',
          code:
            DRIVER +
            "const db = Knex({ client: 'pg', connection: { host, ssl: { ca } } });",
        },
        {
          name: 'ssl true',
          code:
            DRIVER +
            "const db = Knex({ client: 'pg', connection: { host, ssl: true } });",
        },
        {
          name: 'verification explicitly on',
          code:
            DRIVER +
            "const db = Knex({ client: 'pg', connection: { host, ssl: { rejectUnauthorized: true } } });",
        },
        {
          name: 'value comes from config and cannot be resolved',
          code:
            DRIVER +
            "const db = Knex({ client: 'pg', connection: { host, ssl: useTls } });",
        },
        {
          name: 'sslmode=require in the connection URL',
          code:
            DRIVER +
            "const db = Knex({ client: 'pg', connection: 'postgres://h/db?sslmode=require' });",
        },
        {
          // The fixture that used to sit here, `{ client: 'pg', connection:
          // { host, ssl: false } }`, is knex's own config contract — a
          // knexfile, which never imports knex — and moved to `invalid` as the
          // knexfile FN of the 2026-10 review.
          name: 'no knex import and no knex config shape — not this plugin’s file',
          code: 'const options = { host, ssl: false };',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid — TLS explicitly disabled', () => {
    ruleTester.run('invalid', requireTls, {
      valid: [],
      invalid: [
        {
          name: 'ssl false inside connection',
          code:
            DRIVER +
            "const db = Knex({ client: 'pg', connection: { host, ssl: false } });",
          errors: [{ messageId: 'tlsDisabled' }],
        },
        {
          name: 'verification switched off inside connection',
          code:
            DRIVER +
            "const db = Knex({ client: 'pg', connection: { host, ssl: { rejectUnauthorized: false } } });",
          errors: [{ messageId: 'certificateValidationDisabled' }],
        },
        {
          name: 'sslmode=disable in the connection URL',
          code:
            DRIVER +
            "const db = Knex({ client: 'pg', connection: 'postgres://h/db?sslmode=disable' });",
          errors: [{ messageId: 'tlsDisabled' }],
        },
        {
          name: 'config object built separately from the Knex call',
          code:
            DRIVER +
            "export const config = { client: 'pg', connection: { host, ssl: false } };",
          errors: [{ messageId: 'tlsDisabled' }],
        },
      ],
    });
  });

  /**
   * One mistake is one finding. The nested `connection` object is reachable
   * both by the visitor and by recursion from its parent, so without the
   * dedupe this reports twice for a single `ssl: false`.
   */
  describe('a single mistake reports once', () => {
    ruleTester.run('dedupe', requireTls, {
      valid: [],
      invalid: [
        {
          name: 'nested connection is not double-counted',
          code:
            DRIVER +
            "const db = Knex({ client: 'pg', connection: { host: 'h', database: 'app', ssl: false } });",
          errors: [{ messageId: 'tlsDisabled' }],
        },
      ],
    });
  });
});

/**
 * FP/FN review 2026-10-12 (benchmarks/audits/2026-10-12-fp-fn-knex-security.md).
 * Bindings are named `foo` / `bar` so no verdict can rest on a name.
 */
describe('require-tls — fp/fn review 2026-10', () => {
  ruleTester.run('fp-fn review 2026-10', requireTls, {
    valid: [
      {
        // @found Budibase/budibase:packages/server/src/integrations/tests/utils/postgres.ts:42
        name: 'FP: a test utility pointing at a local container',
        filename:
          '/repo/packages/server/src/integrations/tests/utils/postgres.ts',
        code:
          DRIVER +
          "Knex({ client: 'pg', connection: { host: 'localhost', ssl: false, rejectUnauthorized: false } });",
      },
    ],
    invalid: [
      {
        // Moved here from `valid` ("no knex import — not this plugin's file"):
        // the object is knex's own config contract — a knexfile.
        // @found knex-security FP/FN review 2026-10-12, synthetic probe (knexfile)
        name: 'FN: a knexfile — knex config with no knex import',
        code: "const options = { client: 'pg', connection: { host, ssl: false } };\nmodule.exports = options;",
        errors: [{ messageId: 'tlsDisabled' }],
      },
      {
        // @found knex-security FP/FN review 2026-10-12, synthetic probe (ssl bound first)
        name: 'FN: the TLS options are bound to a constant first',
        code:
          DRIVER +
          "const foo = { rejectUnauthorized: false };\nKnex({ client: 'pg', connection: { host, ssl: foo } });",
        errors: [{ messageId: 'certificateValidationDisabled' }],
      },
    ],
  });
});
