/**
 * Coverage-gap tests for no-math-random-crypto.
 * Layer 1: every isCryptoContext ancestor branch — crypto-named function
 * declarations, property assignments, computed keys, destructuring, arrow
 * and named-function-expression returns.
 * Layer 2: a ReturnStatement with no containing function (parser-unreachable)
 * via createWithMockContext from @interlace/eslint-devkit.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, expect, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { createWithMockContext } from '@interlace/eslint-devkit';
import { noMathRandomCrypto } from './index';

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

describe('no-math-random-crypto coverage gaps', () => {
  ruleTester.run('no-math-random-crypto', noMathRandomCrypto, {
    valid: [
      // Assignment with a plain identifier LHS → member check false
      { code: 'result = Math.random();' },
      // Assignment to a computed (Literal) property → property-type operand false
      { code: "obj['count'] = Math.random();" },
      // Assignment to a non-crypto property name → pattern test false
      { code: 'obj.count = Math.random();' },
      // Computed object key → Property key is not an Identifier
      { code: "const cfg = { ['x']: Math.random() };" },
      // Non-crypto object key → pattern test false
      { code: 'const cfg = { count: Math.random() };' },
      // Destructuring declarator ancestor → declarator id is not an Identifier
      { code: 'const { a } = { a: Math.random() };' },
      // Return inside an arrow function → not a (named) declaration/expression
      { code: 'const f = () => { return Math.random(); };' },
      // Return inside a NAMED function expression with a non-crypto name
      { code: 'const v = function plain() { return Math.random(); };' },
    ],
    invalid: [
      // Crypto-named FunctionDeclaration ancestor → reported
      {
        code: 'function generateToken() { const x = Math.random(); }',
        errors: [{ messageId: 'mathRandomCrypto' }],
      },
      // Assignment to a crypto-named property → reported
      {
        code: 'session.token = Math.random();',
        errors: [{ messageId: 'mathRandomCrypto' }],
      },
      // Return inside a crypto-named function expression → reported
      {
        code: 'const gen = function generateToken() { return Math.random(); };',
        errors: [{ messageId: 'mathRandomCrypto' }],
      },
    ],
  });

  describe('Layer 2: return statement with no containing function', () => {
    it('treats a floating ReturnStatement ancestor as non-crypto context', () => {
      const { listeners, reports } = createWithMockContext(
        noMathRandomCrypto as never
      );
      const ret: { type: string; parent?: unknown; argument?: unknown } = {
        type: 'ReturnStatement',
        parent: undefined,
      };
      const node = {
        type: 'CallExpression',
        callee: {
          type: 'MemberExpression',
          object: { type: 'Identifier', name: 'Math' },
          property: { type: 'Identifier', name: 'random' },
        },
        arguments: [],
        parent: ret,
      };
      ret.argument = node;

      (listeners.CallExpression as (n: unknown) => void)(node);
      expect(reports).toHaveLength(0);
    });
  });
});
