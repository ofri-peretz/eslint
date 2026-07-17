/**
 * Coverage-gap tests for no-ssrf.
 * Layer 1: every nodeContainsValidation construct (new URL, validation
 * functions, allowlist methods, hostname equality both sides), the if-test
 * validation path, zero-arg HTTP calls, and non-validating lookalikes.
 * Layer 2: `options || {}` fallback with a null options element, which the
 * RuleTester schema rejects. Uses createWithMockContext from
 * @interlace/eslint-devkit.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, expect, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { createWithMockContext } from '@interlace/eslint-devkit';
import { noSsrf } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('no-ssrf coverage gaps', () => {
  ruleTester.run('no-ssrf', noSsrf, {
    valid: [
      // new URL(x) in a preceding statement counts as validation
      {
        code: [
          'function callApi(targetUrl) {',
          '  const parsed = new URL(targetUrl);',
          '  return fetch(targetUrl);',
          '}',
        ].join('\n'),
      },
      // Named validation function in the guarding if-test
      {
        code: [
          'function callApi(targetUrl) {',
          '  if (isValidUrl(targetUrl)) { return fetch(targetUrl); }',
          '}',
        ].join('\n'),
      },
      // Allowlist .includes() in the guarding if-test
      {
        code: [
          'function callApi(targetUrl) {',
          '  if (allowedHosts.includes(targetUrl)) { return fetch(targetUrl); }',
          '}',
        ].join('\n'),
      },
      // hostname === literal (member on the left)
      {
        code: [
          'function callApi(targetUrl, parsed) {',
          "  if (parsed.hostname === 'api.example.com') { return fetch(targetUrl); }",
          '}',
        ].join('\n'),
      },
      // literal == host (member on the right, loose equality)
      {
        code: [
          'function callApi(targetUrl, parsed) {',
          "  if ('api.example.com' == parsed.host) { return fetch(targetUrl); }",
          '}',
        ].join('\n'),
      },
      // Zero-argument HTTP call — urlArg guard
      { code: 'fetch();' },
    ],
    invalid: [
      // Preceding member call whose method is not a validation method
      {
        code: [
          'function callApi(targetUrl) {',
          '  helper.method(targetUrl);',
          '  return fetch(targetUrl);',
          '}',
        ].join('\n'),
        errors: [{ messageId: 'ssrfVulnerability' }],
      },
      // Preceding NewExpression that is not the URL constructor
      {
        code: [
          'function callApi(targetUrl) {',
          '  const c = new Client(targetUrl);',
          '  return fetch(targetUrl);',
          '}',
        ].join('\n'),
        errors: [{ messageId: 'ssrfVulnerability' }],
      },
      // if-test binary expression with non-equality operator
      {
        code: [
          'function callApi(targetUrl, a, b) {',
          '  if (a !== b) { return fetch(targetUrl); }',
          '}',
        ].join('\n'),
        errors: [{ messageId: 'ssrfVulnerability' }],
      },
      // if-test equality on a member that is not hostname/host (left side)
      {
        code: [
          'function callApi(targetUrl, cfg) {',
          '  if (cfg.port === 80) { return fetch(targetUrl); }',
          '}',
        ].join('\n'),
        errors: [{ messageId: 'ssrfVulnerability' }],
      },
      // if-test equality on a member that is not hostname/host (right side)
      {
        code: [
          'function callApi(targetUrl, cfg) {',
          '  if (80 === cfg.port) { return fetch(targetUrl); }',
          '}',
        ].join('\n'),
        errors: [{ messageId: 'ssrfVulnerability' }],
      },
      // Sparse array in a preceding statement — null items are skipped
      {
        code: [
          'function callApi(targetUrl) {',
          '  const arr = [, probe];',
          '  return fetch(targetUrl);',
          '}',
        ].join('\n'),
        errors: [{ messageId: 'ssrfVulnerability' }],
      },
      // Template literal with expressions — dynamic but not an Identifier
      {
        code: [
          'function callApi(p) {',
          '  return fetch(`https://x/${p}`);',
          '}',
        ].join('\n'),
        errors: [{ messageId: 'ssrfVulnerability' }],
      },
    ],
  });

  describe('Layer 2: mock context', () => {
    it('falls back to {} when the options element is null and still reports', () => {
      const { listeners, reports } = createWithMockContext(noSsrf, {
        options: [null],
      });
      const call = listeners.CallExpression as (n: unknown) => void;
      expect(typeof call).toBe('function');

      // Literal URL: safe, no report
      call({
        type: 'CallExpression',
        callee: { type: 'Identifier', name: 'fetch' },
        arguments: [{ type: 'Literal', value: 'https://api.example.com' }],
      });
      expect(reports).toHaveLength(0);

      // User-input-sounding identifier with no parent chain: reported
      call({
        type: 'CallExpression',
        callee: { type: 'Identifier', name: 'fetch' },
        arguments: [{ type: 'Identifier', name: 'targetUrl' }],
      });
      expect(reports).toHaveLength(1);
      expect(reports[0]).toMatchObject({ messageId: 'ssrfVulnerability' });
    });
  });
});
