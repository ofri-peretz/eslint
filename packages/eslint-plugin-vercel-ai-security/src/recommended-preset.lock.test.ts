/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Regression lock: idiomatic AI SDK code passes `recommended` with zero errors.
 *
 * The 2026-10-10 FP/FN audit found the AI SDK v5 quickstart route — copied
 * verbatim from the SDK docs — produced two errors and a warning under
 * `recommended` (max-tokens, abort-signal, request-timeout), and the canonical
 * weather tool drew a step-limit error for running the SDK's own one-step
 * default. A preset that fails the vendor's first example is uninstalled.
 *
 * Each fixture is a shape people copy from the docs. Any rule that starts
 * reporting an error on one of them turns this red.
 *
 * The severity table below is locked too: a rule's preset level must match
 * the CVSS it reports. See benchmarks/audits/2026-10-10-fp-fn-vercel-ai-security.md.
 */
import { describe, it, expect } from 'vitest';
import { Linter } from 'eslint';
import parser from '@typescript-eslint/parser';
import plugin, { configs } from './index';

function lint(code: string, config = configs.recommended) {
  const linter = new Linter({ configType: 'flat' });
  return linter.verify(
    code,
    [
      {
        files: ['**/*.ts'],
        languageOptions: {
          parser,
          ecmaVersion: 'latest',
          sourceType: 'module',
        },
      },
      config,
    ],
    'app/api/chat/route.ts',
  );
}

const QUICKSTART_ROUTE = `
import { openai } from '@ai-sdk/openai';
import { streamText, convertToModelMessages, type UIMessage } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const result = streamText({
    model: openai('gpt-4o'),
    system: 'You are a helpful assistant.',
    messages: convertToModelMessages(messages),
  });
  return result.toUIMessageStreamResponse();
}
`;

const TOOL_ROUTE = `
import { openai } from '@ai-sdk/openai';
import { streamText, convertToModelMessages, tool, stepCountIs } from 'ai';
import { z } from 'zod';

const BASE_PROMPT = 'You are a weather assistant.';

export async function POST(req: Request) {
  const { messages } = await req.json();
  const result = streamText({
    model: openai('gpt-4o'),
    system: \`\${BASE_PROMPT} Today is \${new Date().toISOString()}.\`,
    messages: convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    tools: {
      weather: tool({
        description: 'Get the weather in a location',
        inputSchema: z.object({ location: z.string() }),
        execute: async ({ location }) => getWeather(location),
      }),
    },
  });
  return result.toUIMessageStreamResponse();
}
`;

const SINGLE_STEP_TOOL_CALL = `
import { openai } from '@ai-sdk/openai';
import { generateText, tool } from 'ai';
import { z } from 'zod';

const { toolCalls } = await generateText({
  model: openai('gpt-4o'),
  tools: {
    weather: tool({ inputSchema: z.object({ city: z.string() }), execute: async ({ city }) => ({ city }) }),
  },
  prompt: 'Weather in Paris?',
});
`;

describe('recommended preset — idiomatic AI SDK code', () => {
  it.each([
    ['the v5 quickstart route', QUICKSTART_ROUTE],
    ['a tool route with stopWhen and a date-stamped system prompt', TOOL_ROUTE],
    ['a tool call on the SDK one-step default', SINGLE_STEP_TOOL_CALL],
  ])('%s produces 0 errors', (_name, code) => {
    const errors = lint(code).filter((m) => m.severity === 2);
    expect(
      errors.map((m) => `${m.ruleId}: ${m.message.split('\n')[0]}`),
    ).toEqual([]);
  });

  it('still reports a user-controlled system prompt as an error', () => {
    const errors = lint(`
      import { streamText } from 'ai';
      export async function POST(req: Request) {
        const { messages, system } = await req.json();
        return streamText({ model, system, messages }).toUIMessageStreamResponse();
      }
    `).filter((m) => m.severity === 2);
    expect(errors.map((m) => m.ruleId)).toContain(
      'vercel-ai-security/no-dynamic-system-prompt',
    );
  });
});

describe('recommended preset — severity follows the rule’s own CVSS', () => {
  const recommended = configs.recommended.rules ?? {};

  it('pins the preset table', () => {
    expect(recommended).toEqual({
      'vercel-ai-security/require-validated-prompt': 'error',
      'vercel-ai-security/no-hardcoded-api-keys': 'error',
      'vercel-ai-security/no-unsafe-output-handling': 'error',
      'vercel-ai-security/no-sensitive-in-prompt': 'error',
      'vercel-ai-security/no-system-prompt-leak': 'error',
      'vercel-ai-security/no-dynamic-system-prompt': 'error',
      'vercel-ai-security/require-tool-confirmation': 'error',
      'vercel-ai-security/require-tool-schema': 'error',
      'vercel-ai-security/require-max-tokens': 'warn',
      'vercel-ai-security/require-rag-content-validation': 'warn',
      'vercel-ai-security/require-max-steps': 'off',
      'vercel-ai-security/require-abort-signal': 'off',
      'vercel-ai-security/require-request-timeout': 'off',
      'vercel-ai-security/no-training-data-exposure': 'off',
      'vercel-ai-security/require-output-filtering': 'off',
      'vercel-ai-security/require-error-handling': 'off',
      'vercel-ai-security/require-audit-logging': 'off',
      'vercel-ai-security/require-embedding-validation': 'off',
      'vercel-ai-security/require-output-validation': 'off',
    });
  });

  it('enables at error only rules whose CVSS is 7.0 or higher, at warn only below it', () => {
    for (const [id, level] of Object.entries(recommended)) {
      const name = id.replace('vercel-ai-security/', '');
      const cvss = (
        plugin.rules?.[name]?.meta?.docs as { cvss?: number } | undefined
      )?.cvss as number;
      if (level === 'error')
        expect({ name, cvss: cvss >= 7 }).toEqual({ name, cvss: true });
      if (level === 'warn')
        expect({ name, cvss: cvss < 7 }).toEqual({ name, cvss: true });
    }
  });
});
