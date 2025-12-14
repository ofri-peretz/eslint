/**
 * @fileoverview Tests for no-permissive-cors
 * 
 * Coverage: Comprehensive test suite with valid and invalid cases
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noPermissiveCors } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-permissive-cors', noPermissiveCors, {
  valid: [
    { code: "cors({ origin: 'https://example.com' })" },
    { code: "res.setHeader('Access-Control-Allow-Origin', 'https://mysite.com')" },
    { code: "const origin = 'https://safe.com'" }
  ],

  invalid: [
    { code: "cors({ origin: '*' })", errors: [{ messageId: 'violationDetected' }] },
    { code: "res.setHeader('Access-Control-Allow-Origin', '*')", errors: [{ messageId: 'violationDetected' }] }
  ],
});
