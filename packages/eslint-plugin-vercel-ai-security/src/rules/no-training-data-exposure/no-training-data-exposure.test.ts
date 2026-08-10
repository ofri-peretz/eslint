/**
 * @fileoverview Tests for no-training-data-exposure rule
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noTrainingDataExposure } from './index';

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

ruleTester.run('no-training-data-exposure', noTrainingDataExposure, {
  valid: xai([
    // Training disabled
    {
      code: `
        const config = {
          training: false,
        };
      `,
    },
    // No training flag
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: userInput,
        });
      `,
    },
    // Non-training endpoint
    {
      code: `
        fetch('https://api.openai.com/v1/completions');
      `,
    },
    // Training in variable name only
    {
      code: `
        const trainingComplete = true;
      `,
    },
  ]),

  invalid: xai([
    // Training enabled
    {
      code: `
        const config = {
          training: true,
        };
      `,
      errors: [{ messageId: 'trainingDataExposure' }],
    },
    // Allow training flag
    {
      code: `
        const options = {
          allowTraining: true,
        };
      `,
      errors: [{ messageId: 'trainingDataExposure' }],
    },
    // Finetune endpoint
    {
      code: `
        fetch('https://api.openai.com/v1/fine-tune');
      `,
      errors: [{ messageId: 'trainingDataExposure' }],
    },
    // Training endpoint
    {
      code: `
        const url = '/api/train/model';
      `,
      errors: [{ messageId: 'trainingDataExposure' }],
    },
    // Feedback endpoint
    {
      code: `
        fetch('https://api.example.com/feedback');
      `,
      errors: [{ messageId: 'trainingDataExposure' }],
    },
  ]),
});

// ─────────────────────────────────────────────────────────────────────────────
// Coverage-gap fixtures: key shapes for the Property listener
// ─────────────────────────────────────────────────────────────────────────────
ruleTester.run('no-training-data-exposure (coverage gaps)', noTrainingDataExposure, {
  valid: xai([
    // computed key with a call expression resolves keyName to null
    { code: `const cfg = { [getKey()]: true };` },
    // training flag disabled — value is not `true`
    { code: `const cfg = { allowTraining: false };` },
    // training key with a non-boolean literal value
    { code: `const cfg = { trainingMode: 'off' };` },
  ]),
  invalid: xai([
    // string-literal key resolves via String(key.value) and reports
    {
      code: `const cfg = { 'training': true };`,
      errors: [{ messageId: 'trainingDataExposure' }],
    },
  ]),
});
