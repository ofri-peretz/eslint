/**
 * @fileoverview Tests for no-unencrypted-local-storage
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noUnencryptedLocalStorage } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-unencrypted-local-storage', noUnencryptedLocalStorage, {
  valid: [
    // Safe keys - not sensitive data
    { code: "localStorage.setItem('theme', 'dark')" },
    { code: "localStorage.setItem('language', 'en')" },
    { code: "sessionStorage.setItem('lastPage', '/home')" },
    // Non-setItem methods
    { code: "localStorage.getItem('creditcard')" },
    { code: "const x = 1" },
  ],

  invalid: [
    // Credit card data
    { code: "localStorage.setItem('creditcard', cardNumber)", errors: [{ messageId: 'violationDetected' }] },
    { code: "localStorage.setItem('creditCard', '4111111111111111')", errors: [{ messageId: 'violationDetected' }] },
    // SSN
    { code: "localStorage.setItem('ssn', userSSN)", errors: [{ messageId: 'violationDetected' }] },
    { code: "sessionStorage.setItem('userSSN', value)", errors: [{ messageId: 'violationDetected' }] },
    // Passport
    { code: "localStorage.setItem('passport', passportNum)", errors: [{ messageId: 'violationDetected' }] },
    // License
    { code: "localStorage.setItem('license', licNum)", errors: [{ messageId: 'violationDetected' }] },
    // Medical/Health
    { code: "localStorage.setItem('medical', records)", errors: [{ messageId: 'violationDetected' }] },
    { code: "sessionStorage.setItem('health', data)", errors: [{ messageId: 'violationDetected' }] },
  ],
});
