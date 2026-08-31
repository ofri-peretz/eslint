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

// ── Adversarial-corpus regression locks ───────────────────────────────────
//
// The rule visited `Literal` and nothing else. A second corpus wave took it
// from 100% to 75% recall by writing the SAME credentialled URL three other
// ways — none of which a `Literal` visitor can see. What makes a URL CWE-521
// is the userinfo POSITION, and that survives all three spellings.
ruleTester.run('no-password-in-url — adversarial', noPasswordInUrl, {
  valid: [
    // A template whose interpolation is a PATH, not userinfo.
    'const id = getUserId(); fetch(`https://api.acme-corp.io/v1/users/${id}`);',
    // …and one whose `@` is in the query string, after the authority ended.
    'const e = getEmail(); fetch(`https://directory.acme-corp.io/people?q=${e}`);',
    // A concatenation with no userinfo anywhere.
    "fetch('https://api.acme-corp.io' + '/v1/users');",
    // A trailing colon carries no password — the `https://token:@host` idiom.
    "fetch('https://ghp_token:@git.acme-corp.io/repo');",
  ],
  invalid: [
    // A TAGGED template whose escape has no cooked value: null as of
    // @typescript-eslint 8.68.0, the raw text under 8.54.0. `check` is wired to
    // a `TemplateLiteral` visitor, so this quasi reaches `foldUrlText` — read
    // only `cooked` and the credential ships unreported.
    {
      code: 'fetch(String.raw`https://reporting:s3cr3t@api.acme-corp.io/v1 \\x`);',
      errors: [{ messageId: 'violationDetected' }],
    },
    // A template with no expressions is exactly as static as a string.
    {
      code: 'const API = `https://reporting:s3cr3t@api.acme-corp.io/v1`; fetch(API);',
      errors: [{ messageId: 'violationDetected' }],
    },
    // The secret interpolated into the userinfo position.
    {
      code: 'fetch(`https://svc:${password}@internal.acme-corp.io/api`);',
      errors: [{ messageId: 'violationDetected' }],
    },
    // Split so that no single literal contains `user:pass@`. ONE report, not
    // one per fragment — the outermost expression owns it.
    {
      code: "fetch('https://svc:s3cr3t' + '@' + HOST + '/api');",
      errors: [{ messageId: 'violationDetected' }],
    },
    // FALSE-NEGATIVE DIRECTION: innocuous identifiers, same userinfo.
    {
      code: "export const settings = { a: 'https://u1:x9k2m@internal.acme-corp.io/api' };",
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});

// ── foldUrlText refusals ──────────────────────────────────────────────────
//
// The shapes where the folder must answer "nothing string-like here". An
// uncovered refusal is a branch nobody has seen return `null`.
ruleTester.run('no-password-in-url — fold refusals', noPasswordInUrl, {
  valid: [
    'const n = 1 + 2;',
    'const x = a - b;',
    'const y = count + 1;',
    'const t = `a${1 + 2}b`;',
    // A concatenation deeper than the fold budget is refused rather than
    // walked: `a + b + c` groups to the LEFT, so the leading literal — the one
    // carrying the authority — sits at the depth of the whole chain.
    `const deep = 'https://svc:s3cr3t@host'${" + 'x'".repeat(10)};`,
    // A template whose only interpolation is opaque and whose text has no URL.
    'const u = `${a}/${b}`;',
  ],
  invalid: [
    // A nested concatenation still reports ONCE, at the outermost expression.
    {
      code: "fetch(('https://svc:s3cr3t' + '@') + HOST);",
      errors: [{ messageId: 'violationDetected' }],
    },
    // …and a template inside a concatenation.
    {
      code: "fetch(`https://svc:${pw}` + '@' + HOST);",
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});
