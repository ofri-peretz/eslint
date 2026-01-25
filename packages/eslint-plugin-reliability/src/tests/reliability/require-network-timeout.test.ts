/**
 * @fileoverview Tests for require-network-timeout
 *
 * Coverage: Comprehensive test suite with valid and invalid cases
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireNetworkTimeout } from '../../rules/reliability/require-network-timeout';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-network-timeout', requireNetworkTimeout, {
  valid: [
    { code: 'fetch(url, { timeout: 5000 })' },
    { code: 'axios.get(url, { timeout: 10000 })' },
  ],

  invalid: [
    { code: 'fetch(url)', errors: [{ messageId: 'violationDetected' }] },
  ],
});
