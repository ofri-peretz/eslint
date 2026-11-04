const { tag } = require('../../lib.cjs');
const { SDK, indent } = require('../../mcp-sdk.cjs');

const GATES = {
  ClientEsm: `import { Client } from '${SDK}/client/index.js';`,
  ClientRequire: `const { Client } = require('${SDK}/client/index.js');`,
  ClientV2: "import { Client } from '@modelcontextprotocol/client';",
};

/** Listing tag -> [extra head, statement binding `items`]. */
const LISTINGS = {
  ListTools: ['', 'const { tools: items } = await client.listTools();'],
  ListPrompts: ['', 'const { prompts: items } = await client.listPrompts();'],
  ListResources: [
    '',
    'const { resources: items } = await client.listResources();',
  ],
  ListResourceTemplates: [
    '',
    'const { resourceTemplates: items } = await client.listResourceTemplates();',
  ],
  NotClient: [
    "import { registry } from './registry';",
    'const { tools: items } = await registry.listTools();',
  ],
  LookalikeClient: [
    "import { Client as LocalClient } from './local-client';",
    "const local = new LocalClient({ name: 'host', version: '1.0.0' });\nconst { tools: items } = await local.listTools();",
  ],
};

/** Derive tag -> statements binding `catalog`. */
const DERIVES = {
  MapJoin:
    "const catalog = items.map((t: any) => `${t.name}: ${t.description}`).join('\\n');",
  ForOfConcat:
    "let catalog = '';\nfor (const item of items) catalog += `- ${item.description}\\n`;",
  Stringify: 'const catalog = JSON.stringify(items);',
  FilterFind:
    "const catalog = String(items.filter((t: any) => t.name !== 'debug').find((t: any) => t.description)?.description);",
  Count: 'const catalog = `You have ${items.length} tools.`;',
};

/** Target tag -> statement sending `catalog`. */
const TARGETS = {
  AnthropicSystem:
    'await anthropic.messages.create({ model: MODEL, max_tokens: 1024, messages, system: `You can use:\\n${catalog}` });',
  AnthropicMessage:
    "await anthropic.messages.create({ model: MODEL, max_tokens: 1024, messages: [{ role: 'user', content: catalog }] });",
  AnthropicTools:
    "await anthropic.messages.create({ model: MODEL, max_tokens: 1024, messages, system: 'You are helpful.', tools: [{ name: 'search', description: catalog, input_schema: { type: 'object' } }] });",
  OpenAiSystemMessage:
    "await openai.chat.completions.create({ model: MODEL, messages: [{ role: 'system', content: catalog }] });",
  OpenAiTools:
    "await openai.chat.completions.create({ model: MODEL, messages, tools: [{ type: 'function', function: { name: 'search', description: catalog } }] });",
  GenAiContents:
    'await genai.models.generateContent({ model: MODEL, contents: catalog });',
  AiSdkSystem:
    'await generateText({ model: aiModel, system: catalog, prompt: question });',
  AiSdkTools:
    'await generateText({ model: aiModel, prompt: question, tools: { search: { description: catalog, parameters: {} } } });',
  UnresolvedLlm:
    'await llm.messages.create({ model: MODEL, messages, system: catalog });',
  ConsoleLog: "console.log('catalog', catalog);",
};

const HEAD = [
  "import Anthropic from '@anthropic-ai/sdk';",
  "import OpenAI from 'openai';",
  "import { GoogleGenAI } from '@google/genai';",
  "import { generateText } from 'ai';",
  "const MODEL = 'some-model';",
  'const anthropic = new Anthropic();',
  'const openai = new OpenAI();',
  'const genai = new GoogleGenAI({});',
  'declare const aiModel: any;',
  'declare const question: string;',
  'declare const messages: any[];',
].join('\n');

module.exports = {
  rule: 'no-untrusted-tool-metadata-in-prompt',
  // Flows: 5 derivations x 10 targets = 50. Wiring: 6 listings x 2 targets x 3 gates = 36.
  domain: 86,
  traces: 1000,
  key: (s) =>
    [s.part, s.listing, s.derive, s.target, s.gate].map(tag).join('|'),
  code: (s) => {
    const [extra, list] = LISTINGS[tag(s.listing)];
    const body = [list, DERIVES[tag(s.derive)], TARGETS[tag(s.target)]].join(
      '\n',
    );
    return `${GATES[tag(s.gate)]}\n${extra}\n${HEAD}\nconst client = new Client({ name: 'host', version: '1.0.0' });\nexport async function answer(llm: any) {\n${indent(body, 2)}\n}\n`;
  },
};
