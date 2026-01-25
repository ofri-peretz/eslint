/**
 * @fileoverview Tests for no-dynamic-dependency-loading
 * 
 * Coverage: Comprehensive test suite with valid and invalid cases
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noDynamicDependencyLoading } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-dynamic-dependency-loading', noDynamicDependencyLoading, {
  valid: [
    { code: "import module from './module'" },
    { code: "const lib = require('known-lib')" }
  ],

  invalid: [
    { code: "require(moduleName)", errors: [{ messageId: 'violationDetected' }] },
    { code: "import(userInput)", errors: [{ messageId: 'violationDetected' }] }
  ],
});
