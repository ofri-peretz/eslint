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

ruleTester.run('require-network-timeout — bound and unbound variants', requireNetworkTimeout, {
  valid: [
    // AbortSignal bounds the request just like a timeout
    { code: 'fetch(url, { signal: controller.signal })' },
    // Non-network member call on a non-axios object is out of scope
    { code: 'client.get(url)' },
    // Non-network direct call is out of scope
    { code: 'compute(url)' },
  ],

  invalid: [
    // axios without any bound
    { code: 'axios.get(url)', errors: [{ messageId: 'violationDetected' }] },
    // Options object without timeout/signal
    {
      code: 'fetch(url, { method: "GET" })',
      errors: [{ messageId: 'violationDetected' }],
    },
    // Spread element is not a timeout property
    {
      code: 'fetch(url, { ...defaults })',
      errors: [{ messageId: 'violationDetected' }],
    },
    // Computed key is not recognized as a bound
    {
      code: 'fetch(url, { ["timeout"]: 1000 })',
      errors: [{ messageId: 'violationDetected' }],
    },
    // Second argument that is not an object literal
    {
      code: 'fetch(url, options)',
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});
