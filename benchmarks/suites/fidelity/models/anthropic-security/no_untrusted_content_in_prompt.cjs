const { tag } = require('../../lib.cjs');
const { PROMPT_VALUES, promptFile } = require('../../ai-sdk.cjs');

const PKG = '@anthropic-ai/sdk';
const MODEL = "model: 'claude-sonnet-4-5', max_tokens: 1024";
const HI = "{ role: 'user', content: 'Hi' }";

/** Gate tag -> { head, decl, clientParam? }. */
const GATES = {
  Default: {
    head: `import Anthropic from '${PKG}';`,
    decl: 'const client = new Anthropic();',
  },
  Named: {
    head: `import { Anthropic } from '${PKG}';`,
    decl: 'const client = new Anthropic();',
  },
  Namespace: {
    head: `import * as sdk from '${PKG}';`,
    decl: 'const client = new sdk.Anthropic();',
  },
  Require: {
    head: `const { Anthropic } = require('${PKG}');`,
    decl: 'const client = new Anthropic();',
  },
  RequireMember: {
    head: `const sdk = require('${PKG}');`,
    decl: "const client = new sdk['Anthropic']();",
  },
  ClientParam: {
    head: `import type Anthropic from '${PKG}';`,
    clientParam: 'client: Anthropic',
  },
  Bedrock: {
    head: "import { AnthropicBedrock } from '@anthropic-ai/bedrock-sdk';",
    decl: 'const client = new AnthropicBedrock();',
  },
  NoImport: { head: '', clientParam: 'client: any' },
};

/** Slot tag -> (v) => { body, fn? }: the request body carrying prompt `v`. */
const SLOTS = {
  SystemString: (v) => ({
    body: `{ ${MODEL}, system: ${v}, messages: [${HI}] }`,
  }),
  SystemBlocks: (v) => ({
    body: `{ ${MODEL}, system: [{ type: 'text', text: ${v}, cache_control: { type: 'ephemeral' } }], messages: [${HI}] }`,
  }),
  SystemTurn: (v) => ({
    body: `{ ${MODEL}, messages: [{ role: 'system', content: ${v} }, ${HI}] }`,
  }),
  UserTurn: (v) => ({
    body: `{ ${MODEL}, system: 'You are a helpful assistant.', messages: [{ role: 'user', content: ${v} }] }`,
  }),
  RequestConst: (v) => ({
    fn: [`const params = { ${MODEL}, system: ${v}, messages: [${HI}] };`],
    body: 'params',
  }),
  MessagesConst: (v) => ({
    fn: [`const messages = [{ role: 'system', content: ${v} }, ${HI}];`],
    body: `{ ${MODEL}, messages }`,
  }),
};

/** Path tag -> (body) => { call, head?, fn? }. */
const PATHS = {
  Create: (b) => ({ call: `client.messages.create(${b})` }),
  Stream: (b) => ({ call: `client.messages.stream(${b})` }),
  Parse: (b) => ({ call: `client.messages.parse(${b})` }),
  ToolRunner: (b) => ({
    call: `client.beta.messages.toolRunner({ ...${b}, tools: [] })`,
  }),
  Batch: (b) => ({
    call: `client.messages.batches.create({ requests: [{ custom_id: 'r1', params: ${b} }] })`,
  }),
  BatchMap: (b) => ({
    call: `client.messages.batches.create({ requests: tools.map((id) => ({ custom_id: id, params: ${b} })) })`,
  }),
  Bracket: (b) => ({ call: `client.messages['create'](${b})` }),
  CountTokens: (b) => ({ call: `client.messages.countTokens(${b})` }),
  ObjectReceiver: (b) => ({
    fn: ['const fake = { messages: { create: async (p: unknown) => p } };'],
    call: `fake.messages.create(${b})`,
  }),
  Vercel: () => ({
    head: "import { generateText } from 'ai';\nimport { anthropic } from '@ai-sdk/anthropic';",
    call: null,
  }),
};

function code(s) {
  const value = PROMPT_VALUES[tag(s.value)];
  const gate = GATES[tag(s.gate)];
  const pathTag = tag(s.path);
  const slot = SLOTS[tag(s.slot)](value.expr);
  const path = PATHS[pathTag](slot.body);
  const call =
    pathTag === 'Vercel'
      ? `generateText({ model: anthropic('claude-sonnet-4-5'), system: ${value.expr}, prompt: 'Hi' })`
      : path.call;
  return promptFile({
    head: [gate.head, path.head].filter(Boolean).join('\n'),
    decl: gate.decl,
    clientParam: gate.clientParam,
    value,
    fn: [...(slot.fn ?? []), ...(path.fn ?? [])],
    call,
  });
}

module.exports = {
  rule: 'no-untrusted-content-in-prompt',
  // 25 values + (6 slots + 10 paths + 8 gates) x 2 values
  domain: 25 + (6 + 10 + 8) * 2,
  traces: 900,
  key: (s) =>
    `${tag(s.part)}|${tag(s.value)}|${tag(s.slot)}|${tag(s.path)}|${tag(s.gate)}`,
  code,
};
