/**
 * Tests for sequelize-security/require-tls
 * CWE-319 — database connections opened in cleartext, or without
 * authenticating the server.
 *
 * The detector's own branch coverage lives with the factory
 * (`@interlace/eslint-devkit`). What this file locks is the Sequelize
 * *contract*: TLS settings are passed through to the underlying driver via
 * `dialectOptions`, so the dangerous property sits two levels down and is only
 * reachable because `dialectOptions` is declared as a connection key.
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
const DRIVER = "import { Sequelize } from 'sequelize';\n";

describe('require-tls', () => {
  describe('Valid — TLS is on, or the setting cannot be read', () => {
    ruleTester.run('valid', requireTls, {
      valid: [
        {
          name: 'CA supplied through dialectOptions',
          code:
            DRIVER +
            "const db = new Sequelize({ dialect: 'postgres', dialectOptions: { ssl: { require: true, ca } } });",
        },
        {
          name: 'verification explicitly on',
          code:
            DRIVER +
            "const db = new Sequelize({ dialect: 'postgres', dialectOptions: { ssl: { rejectUnauthorized: true } } });",
        },
        {
          name: 'flag resolved at runtime',
          code:
            DRIVER +
            "const db = new Sequelize({ dialect: 'postgres', dialectOptions: { ssl: tlsConfig } });",
        },
        {
          name: 'sslmode=require in the URL',
          code: DRIVER + "const db = new Sequelize('postgres://u:p@h/db?sslmode=require');",
        },
        {
          name: 'no sequelize import — not this plugin’s file',
          code: "const options = { dialect: 'postgres', dialectOptions: { ssl: false } };",
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
          name: 'ssl false at the top level',
          code: DRIVER + "const db = new Sequelize({ dialect: 'postgres', ssl: false });",
          errors: [{ messageId: 'tlsDisabled' }],
        },
        {
          name: 'verification switched off two levels down',
          code:
            DRIVER +
            "const db = new Sequelize({ dialect: 'postgres', dialectOptions: { ssl: { rejectUnauthorized: false } } });",
          errors: [{ messageId: 'certificateValidationDisabled' }],
        },
        {
          name: 'ssl disabled inside dialectOptions',
          code:
            DRIVER + "const db = new Sequelize({ dialect: 'mysql', dialectOptions: { ssl: false } });",
          errors: [{ messageId: 'tlsDisabled' }],
        },
        {
          name: 'sslmode=disable in the URL',
          code: DRIVER + "const db = new Sequelize('postgres://u:p@h/db?sslmode=disable');",
          errors: [{ messageId: 'tlsDisabled' }],
        },
      ],
    });
  });
});
