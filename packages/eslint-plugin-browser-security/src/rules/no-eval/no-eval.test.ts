/**
 * Tests for no-eval rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noEval } from './index';
import * as vitest from 'vitest';

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

ruleTester.run('no-eval', noEval, {
  valid: [
    // Safe JSON.parse
    {
      code: `const data = JSON.parse(jsonString);`,
    },
    // setTimeout with function
    {
      code: `setTimeout(() => doSomething(), 1000);`,
    },
    // setInterval with function
    {
      code: `setInterval(callback, 500);`,
    },
    // Function constructor allowed
    {
      code: `const fn = new Function('a', 'return a * 2');`,
      options: [{ allowFunctionConstructor: true }],
    },
    // Test file
    {
      code: `eval('test code');`,
      options: [{ allowInTests: true }],
      filename: 'code.test.ts',
    },
    // Not eval
    {
      code: `const result = evaluate(expression);`,
    },
  ],
  invalid: [
    // Direct eval
    {
      code: `eval(userInput);`,
      errors: [{ messageId: 'dangerousEval' }],
    },
    // window.eval
    {
      code: `window.eval(code);`,
      errors: [{ messageId: 'dangerousEval' }],
    },
    // global.eval
    {
      code: `global.eval(code);`,
      errors: [{ messageId: 'dangerousEval' }],
    },
    // new Function
    {
      code: `const fn = new Function('return ' + userInput);`,
      errors: [{ messageId: 'dangerousEval' }],
    },
    // setTimeout with string
    {
      code: `setTimeout('doSomething()', 1000);`,
      errors: [{ messageId: 'dangerousEval' }],
    },
    // setInterval with string
    {
      code: `setInterval('tick()', 500);`,
      errors: [{ messageId: 'dangerousEval' }],
    },
  ],
});
