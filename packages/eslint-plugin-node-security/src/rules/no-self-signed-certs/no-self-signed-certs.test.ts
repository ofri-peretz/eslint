/**
 * Tests for no-self-signed-certs rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noSelfSignedCerts } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-self-signed-certs', () => {
  ruleTester.run('no-self-signed-certs', noSelfSignedCerts, {
    valid: [
      { code: 'https.request({ hostname: "example.com" }, callback);' },
      { code: 'tls.connect({ rejectUnauthorized: true });' },
      { code: 'const options = { ca: customCA };' },
      { code: 'process.env.NODE_TLS_REJECT_UNAUTHORIZED = "1";' },
      { code: 'const x = { rejectUnauthorized: validated };' },
      { code: 'https.request({ hostname: "example.com", rejectUnauthorized: true });' },
    ],
    invalid: [
      {
        code: 'https.request({ rejectUnauthorized: false }, callback);',
        errors: [{ messageId: 'insecureTls', suggestions: [
          { messageId: 'enableValidation', output: 'https.request({ rejectUnauthorized: true }, callback);' },
        ] }],
      },
      {
        code: 'tls.connect({ rejectUnauthorized: false });',
        errors: [{ messageId: 'insecureTls', suggestions: [
          { messageId: 'enableValidation', output: 'tls.connect({ rejectUnauthorized: true });' },
        ] }],
      },
      {
        code: 'const options = { rejectUnauthorized: false };',
        errors: [{ messageId: 'insecureTls', suggestions: [
          { messageId: 'enableValidation', output: 'const options = { rejectUnauthorized: true };' },
        ] }],
      },
      {
        code: 'const tls = { cert: ca, rejectUnauthorized: false };',
        errors: [{ messageId: 'insecureTls', suggestions: [
          { messageId: 'enableValidation', output: 'const tls = { cert: ca, rejectUnauthorized: true };' },
        ] }],
      },
      {
        code: 'fetch(url, { rejectUnauthorized: false });',
        errors: [{ messageId: 'insecureTls', suggestions: [
          { messageId: 'enableValidation', output: 'fetch(url, { rejectUnauthorized: true });' },
        ] }],
      },
    ],
  });

// A certificate check relaxed in a TEST file.
//
// An integration test that points at a local server with a self-signed
// certificate has no other way to talk to it. Verified on
// mariadb-corporation/mariadb-connector-nodejs: 41 findings between this rule
// and its sibling, every single one under `test/`.
ruleTester.run('no-self-signed-certs - test files', noSelfSignedCerts, {
  valid: [
    {
      code: `const agent = new https.Agent({ rejectUnauthorized: false });`,
      filename: 'test/conf.js',
      options: [{ allowInTests: true }],
    },
  ],
  invalid: [
    // Production code is untouched.
    {
      code: `const agent = new https.Agent({ rejectUnauthorized: false });`,
      filename: 'lib/client.js',
      options: [{ allowInTests: true }],
      errors: 1,
    },
    // Without the opt-in, a test file is unchanged — this rule owns the
    // decision through `allowInTests`, so it must NOT also take the devkit's
    // `skipTestFiles`, which runs before `create()` and would make the option
    // dead. That trap is documented and I walked into it once here.
    {
      code: `const agent = new https.Agent({ rejectUnauthorized: false });`,
      filename: 'test/conf.js',
      errors: 1,
    },
  ],
});
});
