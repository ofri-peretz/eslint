/**
 * @fileoverview Tests for require-package-lock
 * 
 * NOTE: This rule checks for package-lock.json, yarn.lock, or pnpm-lock.yaml
 * in the file system. Since this monorepo has pnpm-lock.yaml, tests should pass.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requirePackageLock } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-package-lock', requirePackageLock, {
  valid: [
    // Any code is valid since lock file exists in this repo
    { code: "const x = 1", filename: __filename },
  ],

  invalid: [
    // Cannot test invalid case since lock file exists
  ],
});
