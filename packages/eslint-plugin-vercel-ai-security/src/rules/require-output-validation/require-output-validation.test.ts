/**
 * @fileoverview Tests for require-output-validation rule
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireOutputValidation } from './index';

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

ruleTester.run('require-output-validation', requireOutputValidation, {
  valid: xai([
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
  ]),

  invalid: xai([
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
  ]),
});
