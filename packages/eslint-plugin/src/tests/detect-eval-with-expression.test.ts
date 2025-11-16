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

  describe('Pattern Detection - JSON (lines 187-195)', () => {
    ruleTester.run('pattern detection - JSON', detectEvalWithExpression, {
      valid: [],
      invalid: [
        {
          code: 'eval("JSON.parse(" + jsonString + ")");',
          errors: [
            {
              messageId: 'evalWithExpression',
              // Note: Rule provides suggestions but fix returns null (no auto-fix)
              // Test framework requires output for suggestions, so we don't test them here
            },
          ],
        },
      ],
    });
  });

  describe('Pattern Detection - Object (lines 211-219)', () => {
    ruleTester.run('pattern detection - object', detectEvalWithExpression, {
      valid: [],
      invalid: [
        {
          code: 'eval("obj[" + key + "]");',
          errors: [
            {
              messageId: 'evalWithExpression',
              // Note: Rule provides suggestions but fix returns null (no auto-fix)
            },
          ],
        },
        {
          code: 'eval("object[" + key + "]");',
          errors: [{ messageId: 'evalWithExpression' }],
        },
        {
          code: 'eval("obj." + property);',
          errors: [{ messageId: 'evalWithExpression' }],
        },
      ],
    });
  });

  describe('Uncovered Lines', () => {
    // Line 219: Default case in generateRefactoringSteps
    // This is triggered when the pattern doesn't match 'json', 'math', 'object', or 'template'
    ruleTester.run('line 219 - default case in generateRefactoringSteps', detectEvalWithExpression, {
      valid: [],
      invalid: [
        {
          code: 'eval("someOtherPattern" + value);',
          errors: [{ messageId: 'evalWithExpression' }],
        },
        {
          code: 'eval("customPattern" + data);',
          errors: [{ messageId: 'evalWithExpression' }],
        },
      ],
    });
  });

  describe('Pattern Detection - Math (lines 194-200)', () => {
    ruleTester.run('pattern detection - math', detectEvalWithExpression, {
      valid: [],
      invalid: [
        {
          code: 'eval(\'Math.sin(\' + angle + \')\');',
          errors: [{ messageId: 'evalWithExpression' }],
        },
        {
          code: 'eval("parseInt(" + value + ")");',
          errors: [{ messageId: 'evalWithExpression' }],
        },
        {
          code: 'eval("parseFloat(" + num + ")");',
          errors: [{ messageId: 'evalWithExpression' }],
        },
      ],
    });
  });

  describe('Pattern Detection - Template (lines 202-208)', () => {
    ruleTester.run('pattern detection - template', detectEvalWithExpression, {
      valid: [],
      invalid: [
        {
          code: 'eval("${" + name + "}");',
          errors: [
            {
              messageId: 'evalWithExpression',
              // Note: Rule provides suggestions but fix returns null (no auto-fix)
            },
          ],
        },
        {
          code: 'eval("template " + variable);',
          errors: [{ messageId: 'evalWithExpression' }],
        },
        {
          code: 'eval("interpolat" + value);',
          errors: [{ messageId: 'evalWithExpression' }],
        },
      ],
    });
  });

  describe('Options - allowLiteralStrings (line 254)', () => {
    ruleTester.run('allowLiteralStrings option', detectEvalWithExpression, {
      valid: [
        {
          code: 'eval("literal string");',
          options: [{ allowLiteralStrings: true }],
        },
        {
          code: 'eval(\'another literal\');',
          options: [{ allowLiteralStrings: true }],
        },
      ],
      invalid: [
        {
          code: 'eval(userInput);',
          options: [{ allowLiteralStrings: true }],
          errors: [{ messageId: 'evalWithExpression' }],
        },
      ],
    });
  });

  describe('Edge Cases - Literal String (line 261)', () => {
    ruleTester.run('edge cases - literal string eval', detectEvalWithExpression, {
      valid: [
        // eval with literal string is allowed by default (line 261)
        'eval("literal string");',
        "eval('literal string');",
      ],
      invalid: [
        {
          code: 'eval(variable);',
          errors: [{ messageId: 'evalWithExpression' }],
        },
      ],
    });
  });

  describe('Edge Cases - No Arguments (line 239)', () => {
    ruleTester.run('edge cases - no arguments', detectEvalWithExpression, {
      valid: [],
      invalid: [
        {
          code: 'eval();',
          errors: [{ messageId: 'evalWithExpression' }],
        },
      ],
    });
  });

  describe('Function Constructor - CallExpression (lines 298-300)', () => {
    ruleTester.run('function constructor in call expression', detectEvalWithExpression, {
      valid: [],
      invalid: [
        // Lines 298-300: Function constructor detection in CallExpression context
        // This covers the case where Function is called as a function, not as a constructor
        {
          code: 'Function(code);',
          errors: [{ messageId: 'evalWithExpression' }],
        },
        {
          code: 'Function("arg1", "arg2", "return arg1 + arg2");',
          errors: [{ messageId: 'evalWithExpression' }],
        },
        {
          code: 'new Function(code);',
          errors: [{ messageId: 'evalWithExpression' }],
        },
        {
          code: 'new Function("arg1", "arg2", "return arg1 + arg2");',
          errors: [{ messageId: 'evalWithExpression' }],
        },
      ],
    });
  });

  describe('Function Constructor - NewExpression (lines 324-328)', () => {
    ruleTester.run('function constructor in new expression', detectEvalWithExpression, {
      valid: [],
      invalid: [
        {
          code: 'const fn = new Function(userCode);',
          errors: [{ messageId: 'evalWithExpression' }],
        },
        {
          code: 'const fn = new Function("x", "y", "return x + y");',
          errors: [{ messageId: 'evalWithExpression' }],
        },
      ],
    });
  });

  describe('Additional Eval Functions', () => {
    ruleTester.run('additional eval functions option', detectEvalWithExpression, {
      valid: [],
      invalid: [
        {
          code: 'customEval(userCode);',
          options: [{ additionalEvalFunctions: ['customEval'] }],
          errors: [{ messageId: 'evalWithExpression' }],
        },
        {
          code: 'myEval(code);',
          options: [{ additionalEvalFunctions: ['myEval', 'anotherEval'] }],
          errors: [{ messageId: 'evalWithExpression' }],
        },
      ],
    });
  });
});
