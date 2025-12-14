/**
 * @fileoverview Tests for no-postmessage-origin-wildcard
 * 
 * Coverage: Comprehensive test suite with valid and invalid cases
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noPostmessageOriginWildcard } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-postmessage-origin-wildcard', noPostmessageOriginWildcard, {
  valid: [
    { code: "window.postMessage(data, 'https://example.com')" },
    { code: "parent.postMessage(msg, origin)" }
  ],

  invalid: [
    { code: "window.postMessage(data, '*')", errors: [{ messageId: 'violationDetected' }] },
    { code: "parent.postMessage(msg, '*')", errors: [{ messageId: 'violationDetected' }] }
  ],
});
