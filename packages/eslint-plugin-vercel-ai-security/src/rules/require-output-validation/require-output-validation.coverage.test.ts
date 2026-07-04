/**
 * @fileoverview Branch-coverage tests for require-output-validation.
 * Layer 1 only — every remaining branch is reachable through the real parser.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireOutputValidation } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-output-validation (branch coverage)', requireOutputValidation, {
  valid: [
    // Destructuring declarator — id is not an Identifier, tracking skipped.
    {
      code: `const { a } = result;`,
    },
    // Declarator with no initializer.
    {
      code: `let pendingOutput;`,
    },
    // Initializer that is not a MemberExpression.
    {
      code: `const n = 42;`,
    },
    // MemberExpression initializer that matches no AI output pattern.
    {
      code: `const x = obj.data;`,
    },
    // Display call with a spread-only object argument — non-Property skipped.
    {
      code: `render({ ...props });`,
    },
  ],
  invalid: [
    // Spread + AI output property in the same displayed object: spread is
    // skipped, the AI-output property is still reported.
    {
      code: `render({ ...props, body: result.text });`,
      errors: [{ messageId: 'unvalidatedOutput' }],
    },
  ],
});
