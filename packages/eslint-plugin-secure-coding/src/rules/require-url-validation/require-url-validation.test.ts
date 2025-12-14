/**
 * @fileoverview Tests for require-url-validation
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireUrlValidation } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-url-validation', requireUrlValidation, {
  valid: [
    // Safe static URLs
    { code: "window.location = 'https://example.com'" },
    { code: "location.href = 'https://safe.com'" },
    { code: "window.open('https://example.com')" },
    // Non-navigation code
    { code: "const url = 'https://example.com'" },
    { code: "const x = 1" },
  ],

  invalid: [
    // Variable URLs without validation
    { code: "window.location = userUrl", errors: [{ messageId: 'violationDetected' }] },
    { code: "location.href = redirectUrl", errors: [{ messageId: 'violationDetected' }] },
    { code: "window.open(targetUrl)", errors: [{ messageId: 'violationDetected' }] },
  ],
});
