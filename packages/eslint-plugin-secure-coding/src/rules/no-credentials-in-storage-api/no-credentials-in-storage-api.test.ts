/**
 * @fileoverview Tests for no-credentials-in-storage-api
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noCredentialsInStorageApi } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-credentials-in-storage-api', noCredentialsInStorageApi, {
  valid: [
    // Safe storage usage
    { code: "localStorage.setItem('theme', 'dark')" },
    { code: "sessionStorage.setItem('language', 'en')" },
    { code: "AsyncStorage.setItem('settings', json)" },
    { code: "const x = 1" },
  ],

  invalid: [
    // Storing credentials
    { code: "localStorage.setItem('password', pwd)", errors: [{ messageId: 'violationDetected' }] },
    { code: "localStorage.setItem('authToken', token)", errors: [{ messageId: 'violationDetected' }] },
    { code: "sessionStorage.setItem('apiKey', key)", errors: [{ messageId: 'violationDetected' }] },
    { code: "AsyncStorage.setItem('secret', data)", errors: [{ messageId: 'violationDetected' }] },
  ],
});
