/**
 * @fileoverview Tests for require-storage-encryption
 * 
 * Coverage: Comprehensive test suite with valid and invalid cases
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireStorageEncryption } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-storage-encryption', requireStorageEncryption, {
  valid: [
    { code: "await SecureStore.setItemAsync('token', token)" },
    { code: "const encrypted = encrypt(data)" }
  ],

  invalid: [
    { code: "AsyncStorage.setItem('password', pwd)", errors: [{ messageId: 'violationDetected' }] }
  ],
});
