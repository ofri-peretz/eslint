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
});
