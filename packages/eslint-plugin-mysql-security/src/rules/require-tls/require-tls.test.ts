/**
 * Tests for mysql-security/require-tls
 * CWE-319 — database connections opened in cleartext, or without
 * authenticating the server.
 *
 * The detector's own branch coverage lives with the factory
 * (`@interlace/eslint-devkit`). What this file locks is the mysql2 *contract*:
 * a flat config object, the verification flag accepted at the top level as
 * well as under `ssl`, and the `mysql://` URL form.
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
const DRIVER = "import mysql from 'mysql2/promise';\n";

describe('require-tls', () => {
  describe('Valid — TLS is on, or the setting cannot be read', () => {
    ruleTester.run('valid', requireTls, {
      valid: [
        {
          name: 'CA supplied',
          code: DRIVER + "const c = mysql.createConnection({ host, user, ssl: { ca } });",
        },
        {
          name: 'named RDS bundle',
          code: DRIVER + "const c = mysql.createConnection({ host, user, ssl: 'Amazon RDS' });",
        },
        {
          name: 'verification explicitly on',
          code:
            DRIVER +
            "const c = mysql.createConnection({ host, ssl: { rejectUnauthorized: true } });",
        },
        {
          name: 'flag comes from the environment',
          code: DRIVER + "const c = mysql.createConnection({ host, ssl: process.env.TLS && {} });",
        },
        {
          name: 'no mysql import — not this plugin’s file',
          code: "const options = { host: 'db', user: 'app', ssl: false };",
        },
        {
          name: 'an https agent is node-security’s business, not ours',
          code: DRIVER + "const agent = new https.Agent({ rejectUnauthorized: false });",
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
          code: DRIVER + "const c = mysql.createConnection({ host, user, ssl: false });",
          errors: [{ messageId: 'tlsDisabled' }],
        },
        {
          name: 'verification switched off under ssl',
          code:
            DRIVER +
            "const c = mysql.createConnection({ host, ssl: { rejectUnauthorized: false } });",
          errors: [{ messageId: 'certificateValidationDisabled' }],
        },
        {
          name: 'verification hoisted to the top level',
          code: DRIVER + "const c = mysql.createConnection({ database: 'app', rejectUnauthorized: false });",
          errors: [{ messageId: 'certificateValidationDisabled' }],
        },
        {
          name: 'ssl=false in the connection URL',
          code: DRIVER + "const c = mysql.createConnection('mysql://u:p@h/db?ssl=false');",
          errors: [{ messageId: 'tlsDisabled' }],
        },
        {
          name: 'pool config with connectionLimit',
          code: DRIVER + "const pool = mysql.createPool({ connectionLimit: 10, ssl: false });",
          errors: [{ messageId: 'tlsDisabled' }],
        },
        // Regression: `modules` no longer lists 'mysql2/promise' explicitly —
        // `driverBindings` already matches any path under a listed module. The
        // subpath import must still open the gate, or dropping the redundant
        // entry would have been a silent loss of coverage.
        {
          name: 'the mysql2/promise subpath still opens the gate',
          code: "import mysql from 'mysql2/promise';\nconst c = mysql.createConnection({ host, ssl: false });",
          errors: [{ messageId: 'tlsDisabled' }],
        },
        {
          name: 'a URL fragment does not hide the parameter',
          code: DRIVER + "const c = mysql.createConnection('mysql://u:p@h/db?sslmode=disable#frag');",
          errors: [{ messageId: 'tlsDisabled' }],
        },
      ],
    });
  });
});
