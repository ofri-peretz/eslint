/**
 * @fileoverview Tests for require-https-only
 * 
 * Coverage: Comprehensive test suite with valid and invalid cases
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireHttpsOnly } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-https-only', requireHttpsOnly, {
  valid: [
    { code: "fetch('https://api.example.com')" },
    { code: "axios.get('https://secure.io')" }
  ],

  invalid: [
    { code: "fetch('http://api.example.com')", errors: [{ messageId: 'violationDetected' }] }
  ],
});
