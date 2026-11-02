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
const xai = <T>(cases: T[]): T[] =>
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

// ─────────────────────────────────────────────────────────────────────────────
// FP/FN audit 2026-10-10: a returned object with a `model` is SDK options, not
// a response; a response payload leaks through its KEYS (`system`,
// `instructions`) whatever the value is named, nested or JSON-stringified.
// ─────────────────────────────────────────────────────────────────────────────
ruleTester.run('no-system-prompt-leak (fp-fn audit)', noSystemPromptLeak, {
  valid: xai([
    {
      name: 'a server-side helper that assembles streamText options',
      code: `
        const SYSTEM_PROMPT = 'You are Acme support.';
        function buildChatOptions(messages) {
          return { model: openai('gpt-4o'), system: SYSTEM_PROMPT, tools, messages };
        }
      `,
    },
    {
      name: 'a response whose nested objects carry no prompt',
      code: `Response.json({ meta: { model: 'gpt-4o', usage: result.usage } });`,
    },
    {
      name: 'a plain Response with a non-JSON body',
      code: `new Response(stream); new Response(JSON.stringify(payload)); new Headers(JSON.stringify({ a: 1 })); new Response(render()); new Response((getRenderer())());`,
    },
  ]),
  invalid: xai([
    {
      name: 'a nested system key under a neutral variable name',
      code: `
        const persona = 'You are Acme support. Internal discount code is ACME50.';
        export async function GET() {
          return Response.json({ config: { model: 'gpt-4o', system: persona } });
        }
      `,
      errors: [{ messageId: 'systemPromptLeak' }],
    },
    {
      name: 'a JSON-stringified Response body',
      code: `
        export async function GET2() {
          return new Response(JSON.stringify({ systemPrompt: SYSTEM_PROMPT }));
        }
      `,
      errors: [{ messageId: 'systemPromptLeak' }],
    },
  ]),
});

// ─────────────────────────────────────────────────────────────────────────────
// Quint fidelity model (benchmarks/suites/fidelity/models/vercel-ai-security)
// ─────────────────────────────────────────────────────────────────────────────
ruleTester.run('no-system-prompt-leak (fidelity)', noSystemPromptLeak, {
  valid: xai([
    {
      name: 'a bare response value that is not a system prompt is not reported',
      code: `export function GET() { return Response.json(answer); }`,
    },
    {
      name: 'a response with no body is not reported',
      code: `export function GET(res) { res.send(); }`,
    },
  ]),
  invalid: xai([
    {
      name: 'a system prompt passed straight to Response.json leaks it',
      code: `export function GET() { return Response.json(systemPrompt); }`,
      errors: [{ messageId: 'systemPromptLeak' }],
    },
    {
      name: 'a system prompt passed straight to res.json leaks it',
      code: `export function GET(req, res) { res.json(systemPrompt); }`,
      errors: [{ messageId: 'systemPromptLeak' }],
    },
    {
      name: 'a system prompt serialised straight into new Response leaks it',
      code: `export function GET() { return new Response(JSON.stringify(systemPrompt)); }`,
      errors: [{ messageId: 'systemPromptLeak' }],
    },
  ]),
});

// ─────────────────────────────────────────────────────────────────────────────
// Mutation audit 2026-11-02: each case pins one claim a surviving mutant broke.
// ─────────────────────────────────────────────────────────────────────────────
ruleTester.run('no-system-prompt-leak (mutation audit)', noSystemPromptLeak, {
  valid: xai([
    {
      name: 'a computed member read names no system prompt',
      code: `function pick(prompts, name) { return prompts[name]; }`,
    },
    {
      name: "a returned object's key is not evidence outside a response payload",
      code: `function buildOptions(persona) { return { system: persona }; }`,
    },
    {
      name: 'a computed key in a response payload names nothing',
      code: `Response.json({ [field]: value });`,
    },
    {
      name: 'a method that only starts with send is not a response',
      code: `logger.sendMetrics({ systemPrompt });`,
    },
    {
      name: 'a non-Response constructor is not a response',
      code: `queue.push(new QueueMessage(JSON.stringify({ systemPrompt })));`,
    },
    {
      name: 'an empty Response has no payload',
      code: `export function GET() { return new Response(); }`,
    },
    {
      name: 'a digest of the system prompt is not the prompt',
      code: `export function GET() { return new Response(sha256(SYSTEM_PROMPT)); }`,
    },
  ]),
  invalid: xai([
    {
      // @found mutation testing
      name: 'FN: an Express JSONP response sends the payload like res.json',
      code: `res.jsonp({ systemPrompt });`,
      errors: [{ messageId: 'systemPromptLeak' }],
    },
    {
      // @found mutation testing
      name: "FN: res['json'] is the same response call",
      code: `res['json']({ systemPrompt });`,
      errors: [{ messageId: 'systemPromptLeak' }],
    },
  ]),
});
