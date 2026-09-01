/**
 * @fileoverview Tests for no-system-prompt-leak rule
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noSystemPromptLeak } from './index';

/**
 * Every fixture imports the AI SDK, because the rules now abstain in files with
 * no `ai` / `@ai-sdk` in them. Wrapping the arrays rather than editing each
 * fixture means one cannot be left behind — a fixture missing the import would
 * pass vacuously on the gate instead of exercising the detection it was written
 * for. `output` and errors[].suggestions[].output are prefixed too, since
 * autofix fixtures assert the whole file back.
 */
// A SIDE-EFFECT import: it satisfies the gate without reserving any binding,
// so fixtures that already declare `generateText`/`openai` do not redeclare.
const asAi = (code: string): string => `import 'ai';\n${code}`;
type AiSuggestion = { output?: string | null };
type AiCase = {
  code: string;
  output?: string | null;
  errors?: ReadonlyArray<{ suggestions?: readonly AiSuggestion[] } | string>;
};
const xai = <T,>(cases: T[]): T[] =>
  cases.map((c) => {
    if (typeof c === 'string') return asAi(c) as T;
    const test = c as AiCase;
    return {
      ...c,
      code: asAi(test.code),
      ...(typeof test.output === 'string' ? { output: asAi(test.output) } : {}),
      ...(test.errors
        ? {
            errors: test.errors.map((e) =>
              typeof e === 'string' || !e.suggestions
                ? e
                : {
                    ...e,
                    suggestions: e.suggestions.map((s) =>
                      typeof s.output === 'string'
                        ? { ...s, output: asAi(s.output) }
                        : s,
                    ),
                  },
            ),
          }
        : {}),
    } as T;
  });


const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-system-prompt-leak', noSystemPromptLeak, {
  valid: xai([
    // Safe: Only response returned
    {
      name: 'only the answer is returned',
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
  ]),

  invalid: xai([
    // System prompt in return object
    {
      name: 'the system prompt returned to the caller alongside the answer',
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
  ]),
});
