const { tag } = require('../../lib.cjs');
const { PROMPT_VALUES, promptFile } = require('../../ai-sdk.cjs');

const PKG = '@google/genai';
const LEGACY_PKG = '@google/generative-ai';
const MODEL = "'gemini-2.5-flash'";
const LEGACY_DECL =
  'const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);';

/** Gate tag -> { head, decl, clientParam? } for an `ai` (genai) client. */
const GATES = {
  Named: {
    head: `import { GoogleGenAI } from '${PKG}';`,
    decl: 'const ai = new GoogleGenAI({});',
  },
  Namespace: {
    head: `import * as genai from '${PKG}';`,
    decl: 'const ai = new genai.GoogleGenAI({});',
  },
  Require: {
    head: `const { GoogleGenAI } = require('${PKG}');`,
    decl: 'const ai = new GoogleGenAI({});',
  },
  RequireMember: {
    head: `const genai = require('${PKG}');`,
    decl: "const ai = new genai['GoogleGenAI']({});",
  },
  ClientParam: {
    head: `import type { GoogleGenAI } from '${PKG}';`,
    clientParam: 'ai: GoogleGenAI',
  },
  // The legacy SDK's own request path (see LegacyGetModel).
  Legacy: {
    head: `import { GoogleGenerativeAI } from '${LEGACY_PKG}';`,
    decl: LEGACY_DECL,
  },
  NoImport: { head: '', clientParam: 'ai: any' },
};

/**
 * Slot tag -> (v) => { sys, contents?, viaConst? }: `sys` is the
 * `systemInstruction` value, `contents` the user turns, and `viaConst` holds
 * the whole request in a const before the call.
 */
const SLOTS = {
  ConfigString: (v) => ({ sys: v }),
  ConfigContent: (v) => ({ sys: `{ parts: [{ text: ${v} }] }` }),
  ConfigParts: (v) => ({ sys: `[{ text: ${v} }]` }),
  UserContents: (v) => ({
    sys: "'You are a helpful assistant.'",
    contents: `[{ role: 'user', parts: [{ text: ${v} }] }]`,
  }),
  RequestConst: (v) => ({ sys: v, viaConst: true }),
};

/** A genai request: `{ model, contents, config: { systemInstruction } }`. */
function genaiRequest(slot) {
  const contents = slot.contents ?? "'Hi'";
  return `{ model: ${MODEL}, contents: ${contents}, config: { systemInstruction: ${slot.sys} } }`;
}
/** `call(body)`, or the body held in a const first when the slot asks. */
function viaConst(slot, body, call) {
  return slot.viaConst
    ? { fn: [`const request = ${body};`], call: call('request') }
    : { call: call(body) };
}
/** Path tag -> (slot) => { call, fn?, pre?, head? }. */
const PATHS = {
  GenerateContent: (sl) =>
    viaConst(sl, genaiRequest(sl), (b) => `ai.models.generateContent(${b})`),
  GenerateContentStream: (sl) =>
    viaConst(
      sl,
      genaiRequest(sl),
      (b) => `ai.models.generateContentStream(${b})`,
    ),
  ChatsCreate: (sl) =>
    viaConst(
      sl,
      `{ model: ${MODEL}, config: { systemInstruction: ${sl.sys} } }`,
      (b) => `ai.chats.create(${b})`,
    ),
  CachesCreate: (sl) =>
    viaConst(
      sl,
      `{ model: ${MODEL}, config: { systemInstruction: ${sl.sys}, contents: [] } }`,
      (b) => `ai.caches.create(${b})`,
    ),
  LiveConnect: (sl) =>
    viaConst(
      sl,
      `{ model: ${MODEL}, config: { systemInstruction: ${sl.sys} }, callbacks: {} }`,
      (b) => `ai.live.connect(${b})`,
    ),
  SendMessage: (sl) => ({
    ...viaConst(
      sl,
      `{ message: 'Hi', config: { systemInstruction: ${sl.sys} } }`,
      (b) => `chat.sendMessage(${b})`,
    ),
    pre: [`const chat = ai.chats.create({ model: ${MODEL} });`],
  }),
  Bracket: (sl) =>
    viaConst(sl, genaiRequest(sl), (b) => `ai.models['generateContent'](${b})`),
  LegacyGetModel: (sl) =>
    viaConst(
      sl,
      `{ model: ${MODEL}, systemInstruction: ${sl.sys} }`,
      (b) => `genAI.getGenerativeModel(${b})`,
    ),
  LegacyStartChat: (sl) => ({
    ...viaConst(
      sl,
      `{ systemInstruction: ${sl.sys} }`,
      (b) => `model.startChat(${b})`,
    ),
    pre: [`const model = genAI.getGenerativeModel({ model: ${MODEL} });`],
  }),
  LegacyGenerateContent: (sl) => ({
    ...viaConst(
      sl,
      `{ contents: [{ role: 'user', parts: [{ text: 'Hi' }] }], systemInstruction: ${sl.sys} }`,
      (b) => `model.generateContent(${b})`,
    ),
    pre: [`const model = genAI.getGenerativeModel({ model: ${MODEL} });`],
  }),
  CountTokens: (sl) =>
    viaConst(sl, genaiRequest(sl), (b) => `ai.models.countTokens(${b})`),
  ObjectReceiver: (sl) => ({
    ...viaConst(
      sl,
      genaiRequest(sl),
      (b) => `fake.models.generateContent(${b})`,
    ),
    pre: [
      'const fake = { models: { generateContent: async (p: unknown) => p } };',
    ],
  }),
  Vercel: (sl) => ({
    head: "import { generateText } from 'ai';\nimport { google } from '@ai-sdk/google';",
    call: `generateText({ model: google('gemini-2.5-flash'), system: ${sl.sys}, prompt: 'Hi' })`,
  }),
};

const LEGACY_PATHS = new Set([
  'LegacyGetModel',
  'LegacyStartChat',
  'LegacyGenerateContent',
]);

function code(s) {
  const value = PROMPT_VALUES[tag(s.value)];
  let pathTag = tag(s.path);
  const gateTag = tag(s.gate);
  // The legacy gate is exercised on the legacy SDK's own request path.
  if (gateTag === 'Legacy') pathTag = 'LegacyGetModel';
  // A legacy path needs the legacy client, whatever the gate.
  const gate = LEGACY_PATHS.has(pathTag) ? GATES.Legacy : GATES[gateTag];
  const slot = SLOTS[tag(s.slot)](value.expr);
  const path = PATHS[pathTag](slot);
  return promptFile({
    head: [gate.head, path.head].filter(Boolean).join('\n'),
    decl: gate.decl,
    clientParam: gate.clientParam,
    value,
    fn: [...(path.pre ?? []), ...(path.fn ?? [])],
    call: path.call,
  });
}

module.exports = {
  rule: 'no-untrusted-content-in-prompt',
  // 25 values + (5 slots + 13 paths + 7 gates) x 2 values
  domain: 25 + (5 + 13 + 7) * 2,
  traces: 900,
  key: (s) =>
    `${tag(s.part)}|${tag(s.value)}|${tag(s.slot)}|${tag(s.path)}|${tag(s.gate)}`,
  code,
};
