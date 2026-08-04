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
          code: DRIVER + "const db = Knex({ client: 'pg', connection: { host, ssl: { ca } } });",
        },
        {
          name: 'ssl true',
          code: DRIVER + "const db = Knex({ client: 'pg', connection: { host, ssl: true } });",
        },
        {
          name: 'verification explicitly on',
          code:
            DRIVER +
            "const db = Knex({ client: 'pg', connection: { host, ssl: { rejectUnauthorized: true } } });",
        },
        {
          name: 'value comes from config and cannot be resolved',
          code: DRIVER + "const db = Knex({ client: 'pg', connection: { host, ssl: useTls } });",
        },
        {
          name: 'sslmode=require in the connection URL',
          code: DRIVER + "const db = Knex({ client: 'pg', connection: 'postgres://h/db?sslmode=require' });",
        },
        {
          name: 'no knex import — not this plugin’s file',
          code: "const options = { client: 'pg', connection: { host, ssl: false } };",
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
          code: DRIVER + "const db = Knex({ client: 'pg', connection: { host, ssl: false } });",
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
            DRIVER + "const db = Knex({ client: 'pg', connection: 'postgres://h/db?sslmode=disable' });",
          errors: [{ messageId: 'tlsDisabled' }],
        },
        {
          name: 'config object built separately from the Knex call',
          code: DRIVER + "export const config = { client: 'pg', connection: { host, ssl: false } };",
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
