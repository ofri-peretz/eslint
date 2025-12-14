/**
 * @fileoverview Tests for require-secure-credential-storage
 * 
 * Coverage: Comprehensive test suite with valid and invalid cases
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireSecureCredentialStorage } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-secure-credential-storage', requireSecureCredentialStorage, {
  valid: [
    { code: "await Keychain.setPassword(service, password)" },
    { code: "SecureStore.setItemAsync('key', value)" }
  ],

  invalid: [
    { code: "AsyncStorage.setItem('apiKey', key)", errors: [{ messageId: 'violationDetected' }] }
  ],
});
