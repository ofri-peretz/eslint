/**
 * @fileoverview Tests for require-secure-defaults
 * 
 * Coverage: Comprehensive test suite with valid and invalid cases
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import * as vitest from 'vitest';
import { requireSecureDefaults } from './index';

RuleTester.afterAll = vitest.afterAll;
RuleTester.it = vitest.it;
RuleTester.itOnly = vitest.it.only;
RuleTester.describe = vitest.describe;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-secure-defaults', requireSecureDefaults, {
  valid: [
        'const x = 42;',
        'const flag = true;',
        'function noop() {}',
        'const items = [];',
        'const obj = {};',
        'class Foo {}',
    { code: "const config = { secure: true, httpOnly: true }" },
    { code: "cookie({ secure: true })" }
  ],

  invalid: [
    { code: "cookie({ secure: false })", errors: [{ messageId: 'violationDetected' }] }
  ],
});
