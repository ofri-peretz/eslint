/**
 * @fileoverview Branch-coverage tests for no-system-prompt-leak.
 * Layer 1 only — every remaining branch is reachable through the real parser.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noSystemPromptLeak } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-system-prompt-leak (branch coverage)', noSystemPromptLeak, {
  valid: [
    // Spread element inside a returned object — skipped by checkObjectForLeaks.
    {
      code: `function f() { return { ...meta }; }`,
    },
    // Bare return with no argument.
    {
      code: `function f() { return; }`,
    },
    // res.json() with no argument at all.
    {
      code: `res.json();`,
    },
    // res.json() with a non-object argument.
    {
      code: `res.json(payload);`,
    },
  ],
  invalid: [
    // Spread + leaking property in the same returned object: the spread is
    // skipped but the leaking property is still reported.
    {
      code: `function f() { return { ...meta, prompt: systemPrompt }; }`,
      errors: [{ messageId: 'systemPromptLeak', data: { variable: 'systemPrompt' } }],
    },
  ],
});
