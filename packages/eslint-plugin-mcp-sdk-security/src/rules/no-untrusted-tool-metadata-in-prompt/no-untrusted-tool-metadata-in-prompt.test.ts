/**
 * Tests for mcp-sdk-security/no-untrusted-tool-metadata-in-prompt
 * CWE-1427 — an MCP server's self-description written into an LLM prompt.
 *
 * Written test-first: every invalid case below failed against a plugin with no
 * such rule (backlog item 9 of benchmarks/audits/2026-10-10-fp-fn-mcp-sdk-security.md).
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { noUntrustedToolMetadataInPrompt } from './index';

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

const CLIENT =
  "import { Client } from '@modelcontextprotocol/sdk/client/index.js';\n" +
  "import Anthropic from '@anthropic-ai/sdk';\n" +
  'const client = new Client({ name: "host", version: "1.0.0" });\n' +
  'const anthropic = new Anthropic();\n';

const ANTHROPIC = '@anthropic-ai/sdk messages.create';

const err = (source: string, field: string, sink: string) => ({
  messageId: 'toolMetadataInPrompt' as const,
  data: { source, field, sink },
});

describe('no-untrusted-tool-metadata-in-prompt', () => {
  ruleTester.run(
    'no-untrusted-tool-metadata-in-prompt',
    noUntrustedToolMetadataInPrompt,
    {
      valid: [
        {
          name: 'tools passed through the tools parameter',
          code:
            CLIENT +
            'const { tools } = await client.listTools();\n' +
            'await anthropic.messages.create({ model: "m", max_tokens: 1024, system: "You are helpful.", messages, tools: tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.inputSchema })) });',
        },
        {
          name: 'the Vercel AI SDK tools option',
          code:
            "import { Client } from '@modelcontextprotocol/sdk/client/index.js';\nimport { generateText } from 'ai';\n" +
            'const client = new Client({});\nconst listing = await client.listTools();\n' +
            'await generateText({ model, prompt: question, tools: Object.fromEntries(listing.tools.map((t) => [t.name, t])), toolChoice: "auto" });',
        },
        {
          name: 'a static system prompt and a user message',
          code:
            CLIENT +
            'await anthropic.messages.create({ model: "m", system: SYSTEM, messages: [{ role: "user", content: question }] });',
        },
        {
          name: 'a listing from something that is not the MCP Client',
          code:
            CLIENT +
            "import { Registry } from './registry';\nconst registry = new Registry();\n" +
            'const { tools } = await registry.listTools();\n' +
            'await anthropic.messages.create({ system: tools.map((t) => t.description).join("\\n") });',
        },
        {
          name: 'a create() on something that is not an LLM client',
          code:
            CLIENT +
            'const { tools } = await client.listTools();\nawait db.users.create({ data: tools[0].description });\nawait Promise.resolve().create({ system: tools });',
        },
        {
          name: 'a file that never imports the MCP SDK',
          code:
            "import Anthropic from '@anthropic-ai/sdk';\nconst anthropic = new Anthropic();\n" +
            'const { tools } = await client.listTools();\nawait anthropic.messages.create({ system: tools.map((t) => t.description).join("\\n") });',
        },
        {
          name: 'only the count of tools, and an unrelated loop',
          code:
            CLIENT +
            'const { tools } = await client.listTools();\nfor (const x of other) { log(x); }\nlet n = 0; for (n of nums) {}\n' +
            'await anthropic.messages.create({ system: `You have ${tools.length > 0 ? "some" : "no"} tools.`, metadata: { n, bullets: tools.map(() => "-").join("") } });',
        },
        {
          name: 'a request whose options are not an object literal, or have a computed key',
          code:
            CLIENT +
            'const { tools } = await client.listTools();\nawait anthropic.messages.create(options);\nawait anthropic.messages.create();\n' +
            'await anthropic.messages.create({ [key]: tools[0].description, ...rest });',
        },
        {
          name: 'a mapper whose callback is not visible, and a dynamic method',
          code:
            CLIENT +
            'const { tools } = await client.listTools();\n' +
            'await anthropic.messages.create({ system: tools.map(describeTool).join("\\n"), metadata: tools[method]((t) => t.description), x: tools[m](), y: Object.values(), z: format(tools), w: [{ ...base, content: "hi" }] });',
        },
        {
          name: 'callbacks that do not receive listing elements',
          code:
            CLIENT +
            'const { tools } = await client.listTools();\nlet s = "";\n' +
            'tools[m]((t) => { s += t.description; });\ntools.forEach(opts, (t) => { s += t.description; });\n' +
            'run((t) => { s += t.description; });\nfunction later(t) { s += t.description; }\nothers.forEach((t) => { s += t.description; });\nfor (const x of others) { s += x; }\n' +
            'await anthropic.messages.create({ system: s });',
        },
        {
          name: 'a local Object is not the global',
          code:
            CLIENT +
            'const Object = { values: () => [] };\nconst listing = await client.listTools();\n' +
            'await anthropic.messages.create({ system: Object.values(listing).join("") });',
        },
        {
          name: 'a cycle of literals is bounded',
          code:
            CLIENT +
            'const a = [b];\nconst b = [a];\nawait anthropic.messages.create({ system: a });',
        },
      ],
      invalid: [
        {
          // @found mcp-sdk-security FP/FN audit 2026-10-10, backlog item 9 (client: untrusted listTools descriptions sent to an LLM)
          name: 'FN: tool descriptions joined into the system prompt',
          code:
            CLIENT +
            'const { tools } = await client.listTools();\n' +
            'await anthropic.messages.create({ model: "m", max_tokens: 1024, system: `You can use:\\n${tools.map((t) => `${t.name}: ${t.description}`).join("\\n")}`, messages });',
          errors: [err('t.name', 'system', ANTHROPIC)],
        },
        {
          // @found mcp-sdk-security FP/FN audit 2026-10-10, backlog item 9 (client: untrusted listTools descriptions sent to an LLM)
          name: 'FN: a prompt built in a for…of loop and sent as a user message',
          code:
            CLIENT +
            'const listing = await client.listTools();\nlet catalog = "";\n' +
            'for (const tool of listing.tools) { catalog += `- ${tool.description}\\n`; }\n' +
            'await anthropic.messages.create({ messages: [{ role: "user", content: catalog }] });',
          errors: [err('listing.tools.description', 'messages', ANTHROPIC)],
        },
        {
          name: 'OpenAI chat completions, a prompt listing and a same-file mapper',
          code:
            "import { Client } from '@modelcontextprotocol/sdk/client/index.js';\nimport OpenAI from 'openai';\n" +
            'const mcp = new Client({});\nconst openai = new OpenAI();\n' +
            'function describe(p) { return `${p.name}: ${p.description}`; }\n' +
            'const { prompts } = await mcp.listPrompts();\n' +
            'const system = { role: "system", content: prompts.map(describe).join("\\n") };\n' +
            'await openai.chat.completions.create({ model: "m", messages: [system, ...history] });',
          errors: [err('p.name', 'messages', 'openai chat.completions.create')],
        },
        {
          name: 'the Vercel AI SDK system option, through Object.entries destructuring',
          code:
            "import { Client } from '@modelcontextprotocol/sdk/client/index.js';\nimport { streamText } from 'ai';\n" +
            'const client = new Client({});\nconst { resources } = await client.listResources();\nconst lines = [];\n' +
            'for (const [i, r] of Object.entries(resources)) lines.push(r.description);\n' +
            'const notes = Object.values(resources).filter((r) => r.mimeType).map((r) => r.description).join(" ");\n' +
            'await streamText({ model, system: notes, prompt: question });',
          errors: [err('r.description', 'system', 'streamText')],
        },
        {
          name: 'Google GenAI system instruction and resource templates through slice()',
          code:
            "import { Client } from '@modelcontextprotocol/sdk/client/index.js';\nimport { GoogleGenAI } from '@google/genai';\n" +
            'const client = new Client({});\nconst ai = new GoogleGenAI({});\n' +
            'const { resourceTemplates } = await client.listResourceTemplates();\n' +
            'await ai.models.generateContent({ model: "m", contents: q, config: { systemInstruction: resourceTemplates.slice(0, 5).map((t) => t.description).join() } });',
          errors: [
            err(
              't.description',
              'config',
              '@google/genai models.generateContent',
            ),
          ],
        },
        {
          name: 'a dynamic namespace on the client, and the stream API',
          code:
            CLIENT +
            'const { tools } = await client.listTools();\n' +
            'await anthropic[ns].stream({ system: tools.find((t) => t.name === "x").description });',
          errors: [
            err(
              'client.listTools().tools.description',
              'system',
              '@anthropic-ai/sdk ?.stream',
            ),
          ],
        },
        {
          name: 'iterating the listing object itself',
          code:
            CLIENT +
            'const listing = await client.listTools();\nlet s = "";\n' +
            'for (const part of Object.values(listing)) { s += part; }\n' +
            'await anthropic.messages.create({ system: s });',
          errors: [err('listing', 'system', ANTHROPIC)],
        },
        {
          name: 'a forEach accumulation and a mapper with several returns',
          code:
            CLIENT +
            'const { tools } = await client.listTools();\nlet notes = "";\n' +
            'tools.forEach((t) => { notes += t.description; });\n' +
            'const named = tools.map((t) => { if (!t.name) return 0; return t.name; });\n' +
            'await anthropic.messages.create({ system: notes, metadata: { user_id: named.join() } });',
          errors: [
            err('t.description', 'system', ANTHROPIC),
            err('t.name', 'metadata', ANTHROPIC),
          ],
        },
      ],
    },
  );
});
