/**
 * @fileoverview Tests for require-output-validation rule
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireOutputValidation } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-output-validation', requireOutputValidation, {
  valid: [
    // Validated output
    {
      code: `
        display(validateOutput(result.text));
      `,
    },
    // Fact-checked output
    {
      code: `
        render(factCheck(response.content));
      `,
    },
    // Not displaying AI output
    {
      code: `
        display(userMessage);
      `,
    },
    // Not a display operation
    {
      code: `
        const text = result.text;
      `,
    },
    // Sanitized in object
    {
      code: `
        respond({ data: sanitize(result.text) });
      `,
    },
  ],

  invalid: [
    // Direct AI output display
    {
      code: `
        display(result.text);
      `,
      errors: [{ messageId: 'unvalidatedOutput' }],
    },
    // Direct response content
    {
      code: `
        render(response.content);
      `,
      errors: [{ messageId: 'unvalidatedOutput' }],
    },
    // AI output in object
    {
      code: `
        respond({ message: result.text });
      `,
      errors: [{ messageId: 'unvalidatedOutput' }],
    },
    // Tracked variable
    {
      code: `
        const aiText = result.text;
        show(aiText);
      `,
      errors: [{ messageId: 'unvalidatedOutput' }],
    },
  ],
});
