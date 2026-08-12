/**
 * @fileoverview Branch-coverage tests for require-tool-schema.
 * Layer 1 only — every remaining branch is reachable through the real parser.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireToolSchema } from './index';

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

ruleTester.run('require-tool-schema (branch coverage)', requireToolSchema, {
  valid: xai([
    // tool() with no argument — nothing to inspect.
    {
      code: `const t = tool();`,
    },
    // tool() with a non-object argument.
    {
      code: `const t = tool(makeConfig());`,
    },
    // Spread before tools in the AI options — non-Property entries skipped
    // while searching for the tools prop.
    {
      code: `generateText({ ...defaults, tools: { a: { inputSchema: s, execute: run } } });`,
    },
    // String-literal 'tools' key — not found by the Identifier-only lookup.
    {
      code: `generateText({ 'tools': { a: { execute: run } } });`,
    },
    // tools value that is not an object literal.
    {
      code: `generateText({ tools: myTools });`,
    },
  ]),
  invalid: xai([
    // tool() helper with spread-only config — no inputSchema found.
    {
      code: `const t = tool({ ...base });`,
      errors: [{ messageId: 'missingInputSchema', data: { toolName: 'unnamed tool' } }],
    },
    // String-literal 'inputSchema' key in tool() config — keyName resolves to
    // null so the schema is not recognized (documented FN).
    {
      code: `const t = tool({ 'inputSchema': schema });`,
      errors: [{ messageId: 'missingInputSchema', data: { toolName: 'unnamed tool' } }],
    },
    // String-literal tool name — resolved via String(key.value).
    {
      code: `generateText({ tools: { 'my-tool': { execute: run } } });`,
      errors: [{ messageId: 'missingInputSchema', data: { toolName: 'my-tool' } }],
    },
    // Computed (non-Identifier, non-Literal) tool key — falls back to 'unknown'.
    {
      code: `generateText({ tools: { [cfg.name]: { execute: run } } });`,
      errors: [{ messageId: 'missingInputSchema', data: { toolName: 'unknown' } }],
    },
    // String-literal 'inputSchema' key inside a tool definition — not
    // recognized, tool reported (documented FN).
    {
      code: `generateText({ tools: { myTool: { 'inputSchema': schema } } });`,
      errors: [{ messageId: 'missingInputSchema', data: { toolName: 'myTool' } }],
    },
  ]),
});
