/**
 * @fileoverview Tests for detect-mixed-content
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { detectMixedContent } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('detect-mixed-content', detectMixedContent, {
  valid: [
    // HTTPS URLs are safe
    { code: "const url = 'https://example.com/api'" },
    { code: "fetch('https://cdn.example.com/lib.js')" },
    // Non-URL code
    { code: "const x = 1" },
  ],

  invalid: [
    // HTTP URLs in HTTPS context
    { code: "const url = 'http://example.com/image.png'", errors: [{ messageId: 'violationDetected' }] },
  ],
});
