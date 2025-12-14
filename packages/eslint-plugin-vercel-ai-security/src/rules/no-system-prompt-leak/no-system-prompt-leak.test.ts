/**
 * @fileoverview Tests for no-system-prompt-leak rule
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noSystemPromptLeak } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-system-prompt-leak', noSystemPromptLeak, {
  valid: [
    // Safe: Only response returned
    {
      code: `
        return { response: result.text };
      `,
    },
    // Safe: No system prompt in response
    {
      code: `
        return Response.json({ data: processedData });
      `,
    },
    // Safe: System prompt used but not returned
    {
      code: `
        const systemPrompt = "You are helpful";
        const result = await generateText({ system: systemPrompt });
        return { response: result.text };
      `,
    },
    // Safe: Non-system-prompt variable
    {
      code: `
        return { userPrompt: userInput };
      `,
    },
    // Safe: res.json without system prompt
    {
      code: `
        res.json({ success: true, message: 'OK' });
      `,
    },
  ],

  invalid: [
    // System prompt in return object
    {
      code: `
        return { systemPrompt: SYSTEM_PROMPT, response: result.text };
      `,
      errors: [{ messageId: 'systemPromptLeak' }],
    },
    // System prompt directly returned
    {
      code: `
        return systemPrompt;
      `,
      errors: [{ messageId: 'systemPromptLeak' }],
    },
    // System prompt in Response.json
    {
      code: `
        Response.json({ system_prompt: SYSTEM_PROMPT, data: result });
      `,
      errors: [{ messageId: 'systemPromptLeak' }],
    },
    // System message exposed
    {
      code: `
        return { systemMessage: config.systemMessage };
      `,
      errors: [{ messageId: 'systemPromptLeak' }],
    },
    // Instructions exposed
    {
      code: `
        return { instructions: AI_INSTRUCTIONS, response: text };
      `,
      errors: [{ messageId: 'systemPromptLeak' }],
    },
    // res.json with system prompt
    {
      code: `
        res.json({ agentPrompt: agentPrompt, output: result });
      `,
      errors: [{ messageId: 'systemPromptLeak' }],
    },
    // Member expression leak
    {
      code: `
        return { prompt: config.systemPrompt };
      `,
      errors: [{ messageId: 'systemPromptLeak' }],
    },
  ],
});
