/**
 * Mutation-survivor kill fixtures (Stryker triage, 2026-10-18).
 *
 * Each case is the input that tells the rule apart from a surviving mutant.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noUnsafeInlineCsp } from './index';
import * as vitest from 'vitest';

RuleTester.afterAll = vitest.afterAll;
RuleTester.it = vitest.it;
RuleTester.itOnly = vitest.it.only;
RuleTester.describe = vitest.describe;

const jsxTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

jsxTester.run('no-unsafe-inline-csp (mutation edges)', noUnsafeInlineCsp, {
  valid: [
    {
      name: 'a key that only ends in content-security-policy is not a CSP sink',
      code: "const help = { 'help.content-security-policy': \"'unsafe-inline'\" };",
    },
    {
      name: 'a key that only starts with content-security-policy is not a CSP sink',
      code: "const help = { 'content-security-policy-help': \"'unsafe-inline'\" };",
    },
    {
      name: 'a camelCase key that only ends in ContentSecurityPolicy is not a CSP sink',
      code: 'const help = { helpContentSecurityPolicy: "\'unsafe-inline\'" };',
    },
    {
      name: 'a camelCase key that only starts with contentSecurityPolicy is not a CSP sink',
      code: 'const help = { contentSecurityPolicyHelp: "\'unsafe-inline\'" };',
    },
    {
      name: 'only the second argument of a header setter is the value',
      code: "console.warn('Content-Security-Policy', 'rejected', \"'unsafe-inline'\");",
    },
    {
      name: 'a non-string first argument names no header',
      code: 'done(null, "\'unsafe-inline\'");',
    },
    {
      name: 'meta name= is not honoured as a policy, only http-equiv is',
      code: 'const m = <meta name="Content-Security-Policy" content="\'unsafe-inline\'" />;',
    },
    {
      name: 'an attribute that only ends in http-equiv does not declare a policy',
      code: 'const m = <meta data-http-equiv="Content-Security-Policy" content="\'unsafe-inline\'" />;',
    },
    {
      name: 'an attribute that only starts with http-equiv does not declare a policy',
      code: 'const m = <meta http-equiv-note="Content-Security-Policy" content="\'unsafe-inline\'" />;',
    },
    {
      name: 'a bare httpEquiv with no value declares nothing',
      code: 'const m = <meta httpEquiv content="\'unsafe-inline\'" />;',
    },
  ],
  invalid: [
    {
      name: 'a directive-less value on a meta http-equiv policy reports',
      code: 'const m = <meta httpEquiv="Content-Security-Policy" content="\'unsafe-inline\'" />;',
      errors: [{ messageId: 'unsafeInline' }],
    },
    {
      name: 'a spread attribute before http-equiv is skipped, not read',
      code: 'const m = <meta {...rest} httpEquiv="Content-Security-Policy" content="\'unsafe-inline\'" />;',
      errors: [{ messageId: 'unsafeInline' }],
    },
  ],
});
