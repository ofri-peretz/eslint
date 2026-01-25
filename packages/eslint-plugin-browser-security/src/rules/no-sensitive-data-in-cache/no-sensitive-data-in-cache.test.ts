/**
 * @fileoverview Tests for no-sensitive-data-in-cache
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noSensitiveDataInCache } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-sensitive-data-in-cache', noSensitiveDataInCache, {
  valid: [
    // Non-sensitive cache operations
    { code: "cache.set('theme', 'dark')" },
    { code: "cache.put('language', 'en')" },
    { code: "storage.store('settings', config)" },
    // Non-cache calls
    { code: "const x = 1" },
  ],

  invalid: [
    // Caching sensitive data
    { code: "cache.set('password', pwd)", errors: [{ messageId: 'violationDetected' }] },
    { code: "cache.put('token', authToken)", errors: [{ messageId: 'violationDetected' }] },
    { code: "cache.store('creditCard', card)", errors: [{ messageId: 'violationDetected' }] },
    { code: "cache.set('ssn', socialSecurity)", errors: [{ messageId: 'violationDetected' }] },
  ],
});
