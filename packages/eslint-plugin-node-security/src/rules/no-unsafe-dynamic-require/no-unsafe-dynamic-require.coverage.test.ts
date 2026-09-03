/**
 * Coverage-gap tests for no-unsafe-dynamic-require (Layer 1).
 * Targets: VariableDeclarator without an initializer / non-identifier id.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnsafeDynamicRequire } from './index';

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

describe('no-unsafe-dynamic-require coverage gaps', () => {
  ruleTester.run('no-unsafe-dynamic-require', noUnsafeDynamicRequire, {
    valid: [
      // Declarator without initializer → `node.init` operand false
      { code: 'let pending;' },
      // Destructuring declarator → `id.type === Identifier` operand false
      { code: 'const { a } = source;' },
    ],
    invalid: [],
  });
});
