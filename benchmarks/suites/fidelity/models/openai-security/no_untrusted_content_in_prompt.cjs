const { tag } = require('../../lib.cjs');
const { PROMPT_VALUES, promptFile } = require('../../ai-sdk.cjs');

const MODEL = "model: 'gpt-5'";
const HI = "{ role: 'user', content: 'Hi' }";

/** Gate tag -> { head, decl, clientParam? }. */
const GATES = {
  Default: {
    head: "import OpenAI from 'openai';",
    decl: 'const client = new OpenAI();',
  },
  Named: {
    head: "import { OpenAI } from 'openai';",
    decl: 'const client = new OpenAI();',
  },
  Namespace: {
    head: "import * as sdk from 'openai';",
    decl: 'const client = new sdk.OpenAI();',
  },
  Require: {
    head: "const { OpenAI } = require('openai');",
    decl: 'const client = new OpenAI();',
  },
  RequireMember: {
    head: "const sdk = require('openai');",
    decl: "const client = new sdk['OpenAI']();",
  },
  Azure: {
    head: "import { AzureOpenAI } from 'openai';",
    decl: "const client = new AzureOpenAI({ apiVersion: '2025-04-01-preview' });",
  },
  ClientParam: {
    head: "import type OpenAI from 'openai';",
    clientParam: 'client: OpenAI',
  },
  NoImport: { head: '', clientParam: 'client: any' },
};

/**
 * Slot tag -> (v) => { kind, body | call, fn?, head? }. `kind` is the request
 * family the slot belongs to (chat, responses, run), whose default path the
 * Slots part uses; a constructor slot gives the whole `call`.
 */
const SLOTS = {
  Instructions: (v) => ({
    kind: 'responses',
    body: `{ ${MODEL}, instructions: ${v}, input: 'Hi' }`,
    chat: `{ ${MODEL}, messages: [{ role: 'system', content: ${v} }, ${HI}] }`,
    assistant: `{ ${MODEL}, instructions: ${v} }`,
    run: `{ assistant_id: 'asst_1', instructions: ${v} }`,
  }),
  AdditionalInstructions: (v) => ({
    kind: 'run',
    body: `{ assistant_id: 'asst_1', additional_instructions: ${v} }`,
  }),
  ChatSystem: (v) => ({
    kind: 'chat',
    body: `{ ${MODEL}, messages: [{ role: 'system', content: ${v} }, ${HI}] }`,
  }),
  ChatDeveloper: (v) => ({
    kind: 'chat',
    body: `{ ${MODEL}, messages: [{ role: 'developer', content: ${v} }, ${HI}] }`,
  }),
  ChatParts: (v) => ({
    kind: 'chat',
    body: `{ ${MODEL}, messages: [{ role: 'system', content: [{ type: 'text', text: ${v} }] }, ${HI}] }`,
  }),
  InputDeveloper: (v) => ({
    kind: 'responses',
    body: `{ ${MODEL}, input: [{ role: 'developer', content: ${v} }, ${HI}] }`,
  }),
  ChatUser: (v) => ({
    kind: 'chat',
    body: `{ ${MODEL}, messages: [{ role: 'system', content: 'You are a helpful assistant.' }, { role: 'user', content: ${v} }] }`,
  }),
  InputUser: (v) => ({
    kind: 'responses',
    body: `{ ${MODEL}, instructions: 'You are a helpful assistant.', input: [{ role: 'user', content: ${v} }] }`,
  }),
  RequestConst: (v) => ({
    kind: 'responses',
    fn: [`const params = { ${MODEL}, instructions: ${v}, input: 'Hi' };`],
    body: 'params',
  }),
  MessagesConst: (v) => ({
    kind: 'chat',
    fn: [
      `const messages = [{ role: 'system' as const, content: ${v} }, ${HI}];`,
    ],
    body: `{ ${MODEL}, messages }`,
  }),
  AgentCtor: (v) => ({
    head: "import { Agent } from '@openai/agents';",
    call: `new Agent({ name: 'support', instructions: ${v} })`,
  }),
  RealtimeAgentCtor: (v) => ({
    head: "import { RealtimeAgent } from '@openai/agents/realtime';",
    call: `new RealtimeAgent({ name: 'voice', instructions: ${v} })`,
  }),
};

const KIND_PATH = {
  chat: 'ChatCreate',
  responses: 'ResponsesCreate',
  run: 'RunsCreate',
};

/** Path tag -> (slot) => call. Each path takes the body its family accepts. */
const PATHS = {
  ChatCreate: (sl) => `client.chat.completions.create(${sl.chat ?? sl.body})`,
  ChatParse: (sl) => `client.chat.completions.parse(${sl.chat ?? sl.body})`,
  ChatStream: (sl) => `client.chat.completions.stream(${sl.chat ?? sl.body})`,
  ChatRunTools: (sl) =>
    `client.chat.completions.runTools({ ...${sl.chat ?? sl.body}, tools: [] })`,
  ResponsesCreate: (sl) => `client.responses.create(${sl.body})`,
  ResponsesParse: (sl) => `client.responses.parse(${sl.body})`,
  ResponsesStream: (sl) => `client.responses.stream(${sl.body})`,
  AssistantsCreate: (sl) => `client.beta.assistants.create(${sl.assistant})`,
  AssistantsUpdate: (sl) =>
    `client.beta.assistants.update('asst_1', ${sl.assistant})`,
  RunsCreate: (sl) =>
    `client.beta.threads.runs.create('thread_1', ${sl.run ?? sl.body})`,
  RunsCreateAndPoll: (sl) =>
    `client.beta.threads.runs.createAndPoll('thread_1', ${sl.run})`,
  RunsStream: (sl) => `client.beta.threads.runs.stream('thread_1', ${sl.run})`,
  Bracket: (sl) => `client.responses['create'](${sl.body})`,
  ObjectReceiver: (sl) => `fake.responses.create(${sl.body})`,
  Vercel: () => null,
};

function code(s) {
  const value = PROMPT_VALUES[tag(s.value)];
  const gate = GATES[tag(s.gate)];
  const slot = SLOTS[tag(s.slot)](value.expr);
  const part = tag(s.part);
  const pathTag =
    part === 'Slots' && slot.kind ? KIND_PATH[slot.kind] : tag(s.path);
  const fn = [...(slot.fn ?? [])];
  const head = [gate.head, slot.head];
  let call;
  if (slot.call) call = slot.call;
  else if (pathTag === 'Vercel') {
    head.push(
      "import { generateText } from 'ai';\nimport { openai } from '@ai-sdk/openai';",
    );
    call = `generateText({ model: openai('gpt-5'), system: ${value.expr}, prompt: 'Hi' })`;
  } else {
    if (pathTag === 'ObjectReceiver')
      fn.push(
        'const fake = { responses: { create: async (p: unknown) => p } };',
      );
    call = PATHS[pathTag](slot);
  }
  return promptFile({
    head: head.filter(Boolean).join('\n'),
    decl: gate.decl,
    clientParam: gate.clientParam,
    value,
    fn,
    call,
  });
}

module.exports = {
  rule: 'no-untrusted-content-in-prompt',
  // 25 values + (12 slots + 15 paths + 8 gates) x 2 values
  domain: 25 + (12 + 15 + 8) * 2,
  traces: 1100,
  key: (s) =>
    `${tag(s.part)}|${tag(s.value)}|${tag(s.slot)}|${tag(s.path)}|${tag(s.gate)}`,
  code,
};
