/**
 * Coverage-gap tests for no-deprecated-buffer (Layer 1).
 * Targets: NewExpression whose callee is not the Buffer identifier.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noDeprecatedBuffer } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('no-deprecated-buffer coverage gaps', () => {
  ruleTester.run('no-deprecated-buffer', noDeprecatedBuffer, {
    valid: [
      // new expression on a non-Buffer identifier → guard returns
      { code: 'const view = new DataStore(8);' },
    ],
    invalid: [],
  });
});
