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
          code:
            DRIVER +
            "const db = new Sequelize('postgres://u:p@h/db?sslmode=require');",
        },
        {
          // The fixture that used to sit here, `{ dialect: 'postgres',
          // dialectOptions: { ssl: false } }`, is Sequelize's own config
          // contract — a sequelize-cli config, which never imports sequelize —
          // and moved to `invalid` as an FN of the 2026-10 review.
          name: 'no sequelize import and no Sequelize config shape — not this plugin’s file',
          code: "const options = { host: 'db', ssl: false };",
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
          code:
            DRIVER +
            "const db = new Sequelize({ dialect: 'postgres', ssl: false });",
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
            DRIVER +
            "const db = new Sequelize({ dialect: 'mysql', dialectOptions: { ssl: false } });",
          errors: [{ messageId: 'tlsDisabled' }],
        },
        {
          name: 'sslmode=disable in the URL',
          code:
            DRIVER +
            "const db = new Sequelize('postgres://u:p@h/db?sslmode=disable');",
          errors: [{ messageId: 'tlsDisabled' }],
        },
      ],
    });
  });
});

/**
 * FP/FN review 2026-10-12 (benchmarks/audits/2026-10-12-fp-fn-sequelize-security.md).
 * Bindings are named `foo` / `bar` so no verdict can rest on a name.
 */
describe('require-tls — fp/fn review 2026-10', () => {
  ruleTester.run('fp-fn review 2026-10', requireTls, {
    valid: [
      {
        name: 'verification on in dialectOptions',
        code:
          DRIVER +
          'new Sequelize(process.env.DATABASE_URL, { dialectOptions: { ssl: { require: true, rejectUnauthorized: true } } });',
      },
    ],
    invalid: [
      {
        // Moved here from `valid` ("no sequelize import — not this plugin's
        // file"): `{ dialect, dialectOptions }` is Sequelize's own config.
        // @found sequelize-security FP/FN review 2026-10-12, synthetic probe (config without import)
        name: 'FN: a Sequelize config with no sequelize import',
        code: "const options = { dialect: 'postgres', dialectOptions: { ssl: false } };\nmodule.exports = options;",
        errors: [{ messageId: 'tlsDisabled' }],
      },
      {
        // @found sequelize-security FP/FN review 2026-10-12, synthetic probe (sequelize-cli config.js)
        name: 'FN: a sequelize-cli production config with verification off',
        code: "module.exports = { production: { use_env_variable: 'DATABASE_URL', dialect: 'postgres', dialectOptions: { ssl: { require: true, rejectUnauthorized: false } } } };",
        errors: [{ messageId: 'certificateValidationDisabled' }],
      },
    ],
  });
});
