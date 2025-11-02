/**
 * Comprehensive tests for detect-eval-with-expression rule  
 * Security: CWE-95 (Code Injection)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { detectEvalWithExpression } from '../rules/security/detect-eval-with-expression';

// Configure RuleTester for Vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

// Use Flat Config format (ESLint 9+)
const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('detect-eval-with-expression', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - no eval calls', detectEvalWithExpression, {
      valid: [
        'const x = Math.eval();',
        'const obj = { eval: () => {} }; obj.eval("code");',
        'function myFunction(data) { return data; }',
        'const result = calculateValue();',
      ],
      invalid: [],
    });
  });

  describe('Dangerous eval() Calls', () => {
    ruleTester.run('invalid - eval with expressions', detectEvalWithExpression, {
      valid: [],
      invalid: [
        {
          code: 'eval(userInput);',
          errors: [{ messageId: 'evalWithExpression' }],
        },
        {
          code: 'eval(`code: ${value}`);',
          errors: [{ messageId: 'evalWithExpression' }],
        },
        {
          code: 'const result = eval(expression);',
          errors: [{ messageId: 'evalWithExpression' }],
        },
        {
          code: `
            function process(code) {
              return eval(code);
            }
          `,
          errors: [{ messageId: 'evalWithExpression' }],
        },
      ],
    });
  });

  describe('eval() in Different Contexts', () => {
    ruleTester.run('invalid - eval in various contexts', detectEvalWithExpression, {
      valid: [],
      invalid: [
        {
          code: 'const runner = (code) => eval(code);',
          errors: [{ messageId: 'evalWithExpression' }],
        },
        {
          code: `
            if (condition) {
              eval(code);
            }
          `,
          errors: [{ messageId: 'evalWithExpression' }],
        },
        {
          code: `
            try {
              eval(code);
            } catch (e) {
              console.error(e);
            }
          `,
          errors: [{ messageId: 'evalWithExpression' }],
        },
      ],
    });
  });

  describe('Multiple eval() Calls', () => {
    ruleTester.run('invalid - multiple evals', detectEvalWithExpression, {
      valid: [],
      invalid: [
        {
          code: `
            eval(code1);
            eval(code2);
          `,
          errors: [
            { messageId: 'evalWithExpression' },
            { messageId: 'evalWithExpression' },
          ],
        },
      ],
    });
  });

  describe('eval() with Complex Expressions', () => {
    ruleTester.run('invalid - complex expressions', detectEvalWithExpression, {
      valid: [],
      invalid: [
        {
          code: 'eval(a || b);',
          errors: [{ messageId: 'evalWithExpression' }],
        },
        {
          code: `
            const code = getCode();
            eval(code);
          `,
          errors: [{ messageId: 'evalWithExpression' }],
        },
      ],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases', detectEvalWithExpression, {
      valid: [
        'const evalString = "eval(code)"; console.log(evalString);',
      ],
      invalid: [
        {
          code: '(eval)(code);',
          errors: [{ messageId: 'evalWithExpression' }],
        },
      ],
    });
  });
});
