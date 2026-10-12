/**
 * Tests for openai-security/no-untrusted-content-in-prompt (CWE-1427).
 *
 * The load-bearing valid case is the bare-function one: `generateText(...)`
 * belongs to eslint-plugin-vercel-ai-security. If this rule ever fires there,
 * one line carries a finding from two plugins and the taxonomy contract breaks.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { noUntrustedContentInPrompt } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  },
});

const SDK = "import OpenAI from 'openai';\n";

describe('no-untrusted-content-in-prompt', () => {
  ruleTester.run('no-untrusted-content-in-prompt', noUntrustedContentInPrompt, {
    valid: [
      {
        name: 'a dynamic prompt in a file that never imports the SDK',
        code: 'client.responses.create({ instructions: `Act as ${role}.` });',
      },
      {
        name: 'a static system prompt',
        code:
          SDK +
          "client.responses.create({ instructions: 'You are a helpful assistant.' });",
      },
      {
        name: 'a constant reference is the correct pattern',
        code: SDK + 'client.responses.create({ instructions: SYSTEM_PROMPT });',
      },
      {
        // THE boundary case. vercel-ai-security owns the bare-function form.
        name: 'the Vercel AI SDK shape belongs to another plugin',
        code: SDK + 'generateText({ system: `Act as ${role}.` });',
      },
      {
        // The remediation this rule recommends.
        name: 'runtime values in a user turn are data, not instructions',
        code:
          SDK +
          "client.responses.create({ instructions: 'You are helpful.', messages: [{ role: 'user', content: `${input}` }] });",
      },
      {
        name: 'a method outside this SDK request path',
        code:
          SDK + 'client.threads.create({ instructions: `Act as ${role}.` });',
      },
      {
        name: 'a static system turn on Chat Completions',
        code:
          SDK +
          "client.chat.completions.create({ messages: [{ role: 'system', content: 'You are helpful.' }] });",
      },
      // FP (2026-10-12): instruction text the file fixes.
      {
        name: 'FP: an interpolation-free tagged template (codeBlock)',
        // @found supabase/supabase:packages/ai-commands/test/extensions.ts:17
        code:
          SDK +
          "client.chat.completions.create({ messages: [{ role: 'system', content: codeBlock`\n  You are a cron syntax expert.\n` }] });",
      },
      {
        name: 'guard: the Agents SDK recommended prefix and a same-file const',
        // @found openai/openai-agents-js:examples/customer-service/index.ts:76
        code:
          "import { Agent } from '@openai/agents';\nimport { RECOMMENDED_PROMPT_PREFIX } from '@openai/agents-core/extensions';\n" +
          "const ROLE = 'an FAQ agent';\n" +
          'new Agent({ name: "FAQ", instructions: `${RECOMMENDED_PROMPT_PREFIX}\\nYou are ${ROLE}.` });',
      },
      {
        name: 'guard: a temporary workspace path is generated, not supplied',
        // @found openai/openai-agents-js:examples/tools/apply-patch.ts:129
        code:
          "import { Agent } from '@openai/agents';\nimport os from 'node:os';\nimport path from 'node:path';\nimport { mkdtemp } from 'node:fs/promises';\n" +
          "export async function main() {\n  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'apply-patch-example-'));\n" +
          '  return new Agent({ name: "e", instructions: `You can edit files inside ${workspaceRoot}.` });\n}',
      },
      {
        name: 'guard: a date in a developer turn',
        code:
          SDK +
          "client.chat.completions.create({ model: 'o3', messages: [{ role: 'developer', content: `Current date: ${new Date().toISOString()}` }] });",
      },
      {
        name: 'FP: an operator-configured bot name from the environment',
        // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-openai-security.md)
        code:
          SDK +
          'client.responses.create({ instructions: `You are ${process.env.BOT_NAME}.` });',
      },
      {
        name: 'a static Agents SDK instructions function',
        code: "import { Agent } from '@openai/agents';\nnew Agent({ name: 'a', instructions: () => 'You are terse.' });",
      },
      {
        name: 'a local Agent class is not the SDK',
        code:
          SDK +
          'class Agent { constructor(o) {} }\nnew Agent({ instructions: `Act as ${role}` });',
      },
      {
        name: 'an SDK export that is not an agent',
        code: "import { Runner } from '@openai/agents';\nnew Runner({ instructions: `Act as ${role}` });",
      },
    ],
    invalid: [
      {
        name: 'an interpolated system prompt',
        code:
          SDK + 'client.responses.create({ instructions: `Act as ${role}.` });',
        errors: [{ messageId: 'untrustedSystemPrompt' }],
      },
      {
        name: 'a concatenated system prompt',
        code:
          SDK + "client.responses.create({ instructions: 'Act as ' + role });",
        errors: [{ messageId: 'untrustedSystemPrompt' }],
      },
      {
        name: 'a system prompt built by a call',
        code:
          SDK + 'client.responses.create({ instructions: buildPrompt(user) });',
        errors: [{ messageId: 'untrustedSystemPrompt' }],
      },
      {
        // Chat Completions is the most-used OpenAI shape, and it carries the
        // system prompt as a message rather than as a named option. Locked
        // here so a `requestPaths` edit cannot drop it silently.
        name: 'an interpolated system turn on Chat Completions',
        code:
          SDK +
          "client.chat.completions.create({ messages: [{ role: 'system', content: `Act as ${role}.` }] });",
        errors: [{ messageId: 'untrustedSystemPrompt' }],
      },
      // FN (2026-10-12): the shapes the inline-only reader missed.
      {
        name: 'FN: the user prompt in a system turn held in a const array',
        // @found supabase/supabase:packages/ai-commands/src/sql/cron.ts:12
        code:
          SDK +
          'export async function generateCron(openai, prompt) {\n' +
          "  const initMessages = [{ role: 'system', content: codeBlock`\n    Here is the user's prompt:\n    ${prompt}\n  ` }];\n" +
          "  return openai.chat.completions.create({ model: 'gpt-4o', messages: initMessages });\n}",
        errors: [{ messageId: 'untrustedSystemPrompt' }],
      },
      {
        name: 'FN: a runtime database schema spliced into Responses instructions',
        // @found supabase/supabase:apps/ui-library/registry/default/platform/platform-kit-nextjs/app/api/ai/sql/route.ts:90
        code:
          SDK +
          'export async function POST(req) {\n' +
          '  const formattedSchema = formatSchemaForPrompt(await getSchema());\n' +
          '  const systemPrompt = `You are an expert SQL assistant.\\n\\nSchema:\\n${formattedSchema}`;\n' +
          "  return openai.responses.create({ model: 'gpt-4.1', instructions: systemPrompt, input: 'q' });\n}",
        errors: [{ messageId: 'untrustedSystemPrompt' }],
      },
      {
        name: 'FN: the developer role is the system role for reasoning models',
        // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-openai-security.md)
        code:
          SDK +
          "client.chat.completions.create({ model: 'o3', messages: [{ role: 'developer', content: `Act as ${role}` }] });",
        errors: [{ messageId: 'untrustedSystemPrompt' }],
      },
      {
        name: 'FN: a developer turn in the Responses API input list',
        // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-openai-security.md)
        code:
          SDK +
          "client.responses.create({ input: [{ role: 'developer', content: `Act as ${role}` }, { role: 'user', content: q }] });",
        errors: [{ messageId: 'untrustedSystemPrompt' }],
      },
      {
        name: 'guard: a dynamic content part in a system turn',
        code:
          SDK +
          "client.chat.completions.create({ messages: [{ role: 'system', content: [{ type: 'text', text: `Be ${role}` }] }] });",
        errors: [{ messageId: 'untrustedSystemPrompt' }],
      },
      {
        name: 'FN: chat.completions.stream, responses.parse and runTools',
        // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-openai-security.md)
        code:
          SDK +
          "client.chat.completions.stream({ messages: [{ role: 'system', content: `Be ${role}` }] });\n" +
          'client.responses.parse({ instructions: `Be ${role}` });\n' +
          "client.chat.completions.runTools({ messages: [{ role: 'system', content: `Be ${role}` }] });",
        errors: [
          { messageId: 'untrustedSystemPrompt' },
          { messageId: 'untrustedSystemPrompt' },
          { messageId: 'untrustedSystemPrompt' },
        ],
      },
      {
        name: 'FN: an Assistants run overriding its instructions (thread id first)',
        // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-openai-security.md)
        code:
          SDK +
          'client.beta.threads.runs.create(threadId, { assistant_id: a, additional_instructions: `User is ${name}` });',
        errors: [{ messageId: 'untrustedSystemPrompt' }],
      },
      {
        name: 'FN: an Agents SDK agent built with interpolated instructions',
        // @found openai/openai-agents-js:examples/memory/hitl-session-scenario.ts:71
        code:
          "import { Agent } from '@openai/agents';\n" +
          'export function make(step) { return new Agent({ name: "s", instructions: `You must call ${step.toolName} exactly once.` }); }',
        errors: [{ messageId: 'untrustedSystemPrompt' }],
      },
      {
        name: 'FN: a dynamic Agents SDK instructions function',
        // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-openai-security.md)
        code: "import { Agent as Foo } from '@openai/agents';\nnew Foo({ name: 'a', instructions: (ctx) => `Help ${ctx.context.user}` });",
        errors: [{ messageId: 'untrustedSystemPrompt' }],
      },
    ],
  });
});
