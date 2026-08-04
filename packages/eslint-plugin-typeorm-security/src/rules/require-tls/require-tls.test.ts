/**
 * Tests for typeorm-security/require-tls
 * CWE-319 — database connections opened in cleartext, or without
 * authenticating the server.
 *
 * The detector's own branch coverage lives with the factory
 * (`@interlace/eslint-devkit`). What this file locks is the TypeORM
 * *contract*: `DataSourceOptions` is flat, `extra` is the driver passthrough
 * bag, and the mssql driver inverts the flag — `trustServerCertificate` is
 * dangerous when TRUE, which is the opposite polarity of every other spelling.
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
const DRIVER = "import { DataSource } from 'typeorm';\n";

describe('require-tls', () => {
  describe('Valid — TLS is on, or the setting cannot be read', () => {
    ruleTester.run('valid', requireTls, {
      valid: [
        {
          name: 'CA supplied',
          code: DRIVER + "export const ds = new DataSource({ type: 'postgres', ssl: { ca } });",
        },
        {
          name: 'CA supplied through extra',
          code:
            DRIVER + "export const ds = new DataSource({ type: 'postgres', extra: { ssl: { ca } } });",
        },
        {
          name: 'trustServerCertificate explicitly false is the safe setting',
          code:
            DRIVER +
            "export const ds = new DataSource({ type: 'mssql', trustServerCertificate: false });",
        },
        {
          name: 'flag resolved at runtime',
          code: DRIVER + "export const ds = new DataSource({ type: 'postgres', ssl: sslConfig });",
        },
        {
          name: 'no typeorm import — not this plugin’s file',
          code: "const options = { type: 'postgres', ssl: false };",
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
          name: 'ssl false',
          code: DRIVER + "export const ds = new DataSource({ type: 'postgres', ssl: false });",
          errors: [{ messageId: 'tlsDisabled' }],
        },
        {
          name: 'verification switched off',
          code:
            DRIVER +
            "export const ds = new DataSource({ type: 'postgres', ssl: { rejectUnauthorized: false } });",
          errors: [{ messageId: 'certificateValidationDisabled' }],
        },
        {
          name: 'verification switched off through extra',
          code:
            DRIVER +
            "export const ds = new DataSource({ type: 'postgres', extra: { ssl: { rejectUnauthorized: false } } });",
          errors: [{ messageId: 'certificateValidationDisabled' }],
        },
        {
          name: 'mssql inverts the flag — dangerous when true',
          code:
            DRIVER +
            "export const ds = new DataSource({ type: 'mssql', trustServerCertificate: true });",
          errors: [{ messageId: 'certificateValidationDisabled' }],
        },
        {
          name: 'sslmode=disable in the url option',
          code: DRIVER + "export const ds = new DataSource({ type: 'postgres', url: 'postgres://h/db?sslmode=disable' });",
          errors: [{ messageId: 'tlsDisabled' }],
        },
      ],
    });
  });
});
