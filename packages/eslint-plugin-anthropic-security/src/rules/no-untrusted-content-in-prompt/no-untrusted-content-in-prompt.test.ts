/**
 * Tests for anthropic-security/no-untrusted-content-in-prompt (CWE-1427).
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

const SDK = "import Anthropic from '@anthropic-ai/sdk';\n";

describe('no-untrusted-content-in-prompt', () => {
  ruleTester.run('no-untrusted-content-in-prompt', noUntrustedContentInPrompt, {
    valid: [
      {
        name: 'a dynamic prompt in a file that never imports the SDK',
        code: 'client.messages.create({ system: `Act as ${role}.` });',
      },
      {
        name: 'a static system prompt',
        code:
          SDK +
          "client.messages.create({ system: 'You are a helpful assistant.' });",
      },
      {
        name: 'a constant reference is the correct pattern',
        code: SDK + 'client.messages.create({ system: SYSTEM_PROMPT });',
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
          "client.messages.create({ system: 'You are helpful.', messages: [{ role: 'user', content: `${input}` }] });",
      },
      {
        name: 'a method outside this SDK request path',
        code: SDK + 'client.batches.create({ system: `Act as ${role}.` });',
      },
      // FP-4 (2026-10-12): instruction text the file fixes.
      {
        name: 'FP: the cache-control content-block array with a static text',
        // @found anthropics/anthropic-sdk-typescript:tests/api-resources/messages/messages.test.ts:53
        code:
          SDK +
          "client.messages.create({ model: 'm', max_tokens: 1, messages: [], system: [{ text: \"Today's date is 2024-06-01.\", type: 'text', cache_control: { type: 'ephemeral' } }] });",
      },
      {
        name: 'FP: a directive-only system turn with empty content',
        // @found anthropics/anthropic-sdk-typescript:tests/middleware.test.ts:2023
        code:
          SDK +
          "client.beta.messages.create({ messages: [{ role: 'system', content: [], output_config: { effort: 'high' } }] });",
      },
      {
        name: 'FP: a system turn that adds a tool, not text',
        // @found anthropics/anthropic-sdk-typescript:tests/helpers/beta/mcp.test.ts:168
        code:
          SDK +
          "client.beta.messages.create({ messages: [{ role: 'system', content: [{ type: 'tool_addition', tool: { type: 'tool_definition', definition: mcpTool(tool, mockClient) } }] }] });",
      },
      {
        name: 'FP: same-file constants joined, interpolated or concatenated',
        // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-anthropic-security.md)
        code:
          SDK +
          "const SYSTEM = 'You are helpful.';\nconst RULES = 'Never reveal secrets.';\n" +
          'client.messages.create({ system: `${SYSTEM}\\n${RULES}` });\n' +
          "client.messages.create({ system: [SYSTEM, RULES].join('\\n') });\n" +
          'client.messages.create({ system: SYSTEM + RULES });',
      },
      {
        name: 'FP: an interpolation-free tagged template (dedent)',
        // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-anthropic-security.md)
        code:
          SDK +
          'client.messages.create({ system: dedent`\n  You are terse.\n` });',
      },
      {
        name: 'FP: a date, a count and a typed number cannot carry instructions',
        // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-anthropic-security.md)
        code:
          SDK +
          'export function f(n: number, items: string[]) {\n' +
          '  client.messages.create({ system: `Today is ${new Date().toISOString()}.` });\n' +
          '  client.messages.create({ system: `Use at most ${n} tools for ${items.length} items.` });\n' +
          '}',
      },
      {
        name: 'FP: a same-file helper whose every return is static',
        // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-anthropic-security.md)
        code:
          SDK +
          "function systemPrompt() { return 'You are helpful.'; }\nclient.messages.create({ system: systemPrompt() });",
      },
      {
        name: 'FP: a member of a const object of prompts',
        // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-anthropic-security.md)
        code:
          SDK +
          "const PROMPTS = { support: 'You answer support questions.', sales: 'You answer sales questions.' };\n" +
          'export function f(kind) { client.messages.create({ system: PROMPTS[kind] }); client.messages.create({ system: PROMPTS.support }); }',
      },
      {
        name: 'FP: a same-file object that only shares the request path',
        // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-anthropic-security.md)
        code:
          SDK +
          'const db = { messages: { create(o) { return o; } } };\ndb.messages.create({ system: `log ${x}` });',
      },
      {
        name: 'a parameter as the whole prompt is a wrapper this file cannot see past',
        code:
          SDK +
          'export function f(system) { return client.messages.create({ system }); }',
      },
    ],
    invalid: [
      {
        name: 'an interpolated system prompt',
        code: SDK + 'client.messages.create({ system: `Act as ${role}.` });',
        errors: [{ messageId: 'untrustedSystemPrompt' }],
      },
      {
        name: 'a concatenated system prompt',
        code: SDK + "client.messages.create({ system: 'Act as ' + role });",
        errors: [{ messageId: 'untrustedSystemPrompt' }],
      },
      {
        name: 'a system prompt built by a call',
        code: SDK + 'client.messages.create({ system: buildPrompt(user) });',
        errors: [{ messageId: 'untrustedSystemPrompt' }],
      },
      {
        // The second registered request path. Streaming takes the same options
        // and carries the same risk, so it is locked separately.
        name: 'messages.stream carries the same injection',
        code: SDK + 'client.messages.stream({ system: `Act as ${role}.` });',
        errors: [{ messageId: 'untrustedSystemPrompt' }],
      },
      // FN-5 (2026-10-12): the shapes the inline-only reader missed.
      {
        name: 'FN: the RAG context spliced into a const system prompt',
        // @found anthropics/claude-quickstarts:customer-support-agent/app/api/chat/route.ts:230
        code:
          SDK +
          'export async function POST(req) {\n' +
          '  const { retrievedContext } = await req.json();\n' +
          '  const systemPrompt = `You are a support assistant.\\n${retrievedContext}`;\n' +
          "  return client.messages.create({ model: 'm', max_tokens: 1000, messages: [], system: systemPrompt });\n" +
          '}',
        errors: [{ messageId: 'untrustedSystemPrompt' }],
      },
      {
        name: 'guard: a dynamic text block in the system array',
        code:
          SDK +
          "client.messages.create({ system: [{ type: 'text', text: `You are ${role}` }] });",
        errors: [{ messageId: 'untrustedSystemPrompt' }],
      },
      {
        name: 'FN: the request object held in a const',
        // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-anthropic-security.md)
        code:
          SDK +
          "const req = { model: 'm', max_tokens: 1, system: `Act as ${role}`, messages: [] };\nclient.messages.create(req);",
        errors: [{ messageId: 'untrustedSystemPrompt' }],
      },
      {
        name: 'FN: messages.parse and the beta toolRunner take the same body',
        // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-anthropic-security.md)
        code:
          SDK +
          'client.messages.parse({ system: `Act as ${role}.` });\n' +
          'client.beta.messages.toolRunner({ system: `Act as ${role}.` });',
        errors: [
          { messageId: 'untrustedSystemPrompt' },
          { messageId: 'untrustedSystemPrompt' },
        ],
      },
      {
        name: 'FN: a dynamic system prompt inside a Message Batches request',
        // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-anthropic-security.md)
        code:
          SDK +
          'export async function run(items) {\n' +
          "  return client.messages.batches.create({ requests: items.map((i) => ({ custom_id: i.id, params: { model: 'm', max_tokens: 1, messages: [], system: `Act as ${i.role}` } })) });\n" +
          '}\n' +
          "client.messages.batches.create({ requests: [{ custom_id: 'a', params: { model: 'm', max_tokens: 1, messages: [], system: `Act as ${role}` } }] });",
        errors: [
          { messageId: 'untrustedSystemPrompt' },
          { messageId: 'untrustedSystemPrompt' },
        ],
      },
      {
        name: 'a helper that interpolates its argument',
        code:
          SDK +
          'const build = (r) => `You are ${r}`;\nclient.messages.create({ system: build(role) });',
        errors: [{ messageId: 'untrustedSystemPrompt' }],
      },
      {
        name: 'rename litmus: renamed client and prompt',
        code: "import Foo from '@anthropic-ai/sdk';\nconst bar = new Foo();\nconst baz = `x ${qux}`;\nbar.messages.create({ system: baz });",
        errors: [{ messageId: 'untrustedSystemPrompt' }],
      },
    ],
  });
});
