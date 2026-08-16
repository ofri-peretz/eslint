/**
 * @fileoverview Tests for no-password-in-url
 *
 * Coverage: Comprehensive test suite with valid and invalid cases
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noPasswordInUrl } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-password-in-url', noPasswordInUrl, {
  valid: [
    'const x = 42;',
    'const flag = true;',
    'function noop() {}',
    'const items = [];',
    'const obj = {};',
    { code: "const url = 'https://example.com/api'" },
    { code: "fetch('https://api.example.com')" },

    // ---- FP lock: the authority ends at the first `/` ---------------------
    // A port plus an `@` anywhere later in the URL used to read as
    // `user:password`, because the old pattern had no idea where the
    // authority stopped.
    { code: "const url = 'https://example.com:8080/threads/a@b'" },
    { code: "const url = 'https://api.example.com:3000/mail?to=jo@example.com'" },
    { code: "fetch('https://cdn.example.com:443/pkg/@scope/name.js')" },
    { code: "const doc = 'See https://docs.example.com:8443/guide#step:2 for more'" },

    // A username with no password is not CWE-521.
    { code: "const url = 'https://token@api.example.com/repo.git'" },
    // A colon with nothing after it is not a password.
    { code: "const url = 'https://user:@api.example.com'" },
    // Not a URL at all.
    { code: "const s = 'user:password@example.com'" },
    { code: "const t = 'postgres-user:secret'" },
    { code: 'const n = 42' },
  ],

  invalid: [
    {
      code: "const url = 'https://user:password@example.com'",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "fetch('https://admin:secret123@api.com')",
      errors: [{ messageId: 'violationDetected' }],
    },
    // Plain http, and with a port after the credentials.
    {
      code: "const url = 'http://svc:hunter2@internal.acme.io:8080/health'",
      errors: [{ messageId: 'violationDetected' }],
    },
    // Credentials embedded mid-sentence in a documentation string.
    {
      code: "const doc = 'Connect with https://ops:p4ssw0rd@dash.acme.io then log out'",
      errors: [{ messageId: 'violationDetected' }],
    },
    // A URL-encoded password is still a password.
    {
      code: "const url = 'https://user:p%40ss@api.acme.io/v1'",
      errors: [{ messageId: 'violationDetected' }],
    },
    // Passed straight to a client.
    {
      code: "axios.get('http://reader:readonly@reports.acme.io/daily.csv')",
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});
