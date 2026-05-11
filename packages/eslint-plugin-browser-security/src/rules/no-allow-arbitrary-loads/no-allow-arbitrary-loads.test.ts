/**
 * @fileoverview Tests for no-allow-arbitrary-loads
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noAllowArbitraryLoads } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-allow-arbitrary-loads', noAllowArbitraryLoads, {
  valid: [
        'const x = 42;',
        'const flag = true;',
        'function noop() {}',
        'const items = [];',
    // Secure configuration
    { code: "const config = { allowArbitraryLoads: false }" },
    { code: "const settings = { secureMode: true }" },
    { code: "const x = 1" },
  ],

  invalid: [
    // Insecure configuration
    { code: "const config = { allowArbitraryLoads: true }", errors: [{ messageId: 'violationDetected' }] },
    { code: "module.exports = { NSAppTransportSecurity: { allowArbitraryLoads: true } }", errors: [{ messageId: 'violationDetected' }] },
  ],
});
