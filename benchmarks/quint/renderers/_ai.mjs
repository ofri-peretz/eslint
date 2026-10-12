// Shared spelling for the inference-SDK renderers (anthropic / openai /
// gemini). Renderers spell shapes only; every verdict comes from the model.
//
// Key-shaped fixtures are assembled at run time so this file holds no literal
// a secret scanner would read as a live key.
const token = 'Zx9Qw2Lm8Rt4Yv6Np0Kc3Hd5Wb7';

export const VENDOR = {
  anthropic: {
    pkg: '@anthropic-ai/sdk',
    named: 'Anthropic',
    defaultImport: true,
    keys: {
      VendorKey: ['sk', 'ant', 'api03', token].join('-'),
      GenericToken: '3f9a2c7e1b8d4f6a0c5e9b2d7a1f4c8e',
      Placeholder: 'my-anthropic-api-key',
      Short: 'sk-ant-x',
      Masked: 'sk-ant-xxxxxxxxxxxxxxxxxxxxxxxx',
    },
  },
  openai: {
    pkg: 'openai',
    named: 'OpenAI',
    defaultImport: true,
    keys: {
      VendorKey: ['sk', 'proj', token].join('-'),
      GenericToken: '3f9a2c7e1b8d4f6a0c5e9b2d7a1f4c8e',
      Placeholder: 'My API Key',
      Short: 'sk-1',
      Masked: 'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx',
    },
  },
  gemini: {
    pkg: '@google/genai',
    named: 'GoogleGenAI',
    defaultImport: false,
    keys: {
      VendorKey: ['AIzaSy', token].join(''),
      GenericToken: '3f9a2c7e1b8d4f6a0c5e9b2d7a1f4c8e',
      Placeholder: 'fake-api-key',
      Short: 'AIzaAAAA',
      Masked: 'AIzaxxxxxxxxxxxxxxxxxxxxxxxx',
    },
  },
};

/** `import …` that binds the SDK's client as `Client`. */
export function importClient(v) {
  return v.defaultImport
    ? `import Client from '${v.pkg}';`
    : `import { ${v.named} as Client } from '${v.pkg}';`;
}

/* --------------------------------------------------------------------- */
/* no-hardcoded-api-key                                                   */
/* --------------------------------------------------------------------- */

export const KEY_DIMENSIONS = ['shape', 'origin', 'client'];

/**
 * The credential value and any statement it needs, for an option `prop`.
 * Returns `{ pre, options }` where `options` is the object-literal source (or
 * an identifier holding one) and `value` the bare value expression.
 */
function keyOrigin(origin, literal, prop) {
  const lit = JSON.stringify(literal);
  switch (origin) {
    case 'Literal':
      return { pre: '', value: lit, options: `{ ${prop}: ${lit} }` };
    case 'ViaConst':
      return {
        pre: `const key = ${lit};\n`,
        value: 'key',
        options: `{ ${prop}: key }`,
      };
    case 'OptionsConst':
      return {
        pre: `const key = ${lit};\nconst opts = { ${prop}: ${lit}, maxRetries: 2 };\n`,
        value: 'key',
        options: 'opts',
      };
    case 'SpreadConst':
      return {
        pre: `const key = ${lit};\nconst base = { ${prop}: ${lit} };\n`,
        value: 'key',
        options: '{ ...base, maxRetries: 2 }',
      };
    case 'EnvRead':
      return {
        pre: '',
        value: 'process.env.API_KEY!',
        options: `{ ${prop}: process.env.API_KEY }`,
      };
    case 'EnvFallback':
      return {
        pre: '',
        value: `process.env.API_KEY ?? ${lit}`,
        options: `{ ${prop}: process.env.API_KEY ?? ${lit} }`,
      };
    case 'Imported':
      return {
        pre: "import { API_KEY } from './config';\n",
        value: 'API_KEY',
        options: `{ ${prop}: API_KEY }`,
      };
    default:
      throw new Error(`origin ${origin}`);
  }
}

/** Render one no-hardcoded-api-key case for a vendor. */
export function renderKey(vendor, c) {
  const v = VENDOR[vendor];
  const literal = v.keys[c.shape];
  let prop = 'apiKey';
  let head = importClient(v);
  let make = (o) => `new Client(${o})`;
  switch (c.client) {
    case 'DefaultImport':
      break;
    case 'AliasedImport':
      head = `import { ${v.named} as Foo } from '${v.pkg}';`;
      make = (o) => `new Foo(${o})`;
      break;
    case 'NamespaceImport':
      head = `import * as sdk from '${v.pkg}';`;
      make = (o) => `new sdk.${v.named}(${o})`;
      break;
    case 'RequireCjs':
      head = `const { ${v.named}: Foo } = require('${v.pkg}');`;
      make = (o) => `new Foo(${o})`;
      break;
    case 'Subclass':
      head += '\nclass Mine extends Client {}';
      make = (o) => `new Mine(${o})`;
      break;
    case 'Wrapper':
      head +=
        '\nfunction makeClient(opts: any) {\n  return new Client(opts);\n}';
      make = (o) => `makeClient(${o})`;
      break;
    case 'WithOptions':
      head += '\nconst base0 = new Client();';
      make = (o) => `base0.withOptions(${o})`;
      break;
    case 'BedrockSecret':
      head = "import { AnthropicBedrock } from '@anthropic-ai/bedrock-sdk';";
      prop = 'awsSecretKey';
      make = (o) => `new AnthropicBedrock(${o})`;
      break;
    case 'AzureClient':
      head = "import { AzureOpenAI } from 'openai';";
      make = (o) => `new AzureOpenAI(${o})`;
      break;
    case 'Positional':
      head = "import { GoogleGenerativeAI } from '@google/generative-ai';";
      break;
    case 'OtherVendor':
      head += "\nimport { Pinecone } from '@pinecone-database/pinecone';";
      make = (o) => `new Pinecone(${o})`;
      break;
    case 'TestMatcher':
      head += '\ndeclare const expect: any;';
      make = (o) => `expect.objectContaining(${o})`;
      break;
    default:
      throw new Error(`client ${c.client}`);
  }
  const { pre, value, options } = keyOrigin(c.origin, literal, prop);
  const arg = c.client === 'Positional' ? value : options;
  const call =
    c.client === 'Positional' ? `new GoogleGenerativeAI(${arg})` : make(arg);
  return `${head}\n${pre}export const client = ${call};\n`;
}

/* --------------------------------------------------------------------- */
/* no-untrusted-content-in-prompt                                         */
/* --------------------------------------------------------------------- */

export const PROMPT_DIMENSIONS = ['value', 'slot', 'carrier', 'receiver'];

/** The instruction value and the statements it needs. */
const PROMPT_VALUE = {
  Static: { top: '', pre: '', v: "'You are a helpful assistant.'" },
  ReqField: { top: '', pre: '', v: 'req.body.persona' },
  ConstOfReq: {
    top: '',
    pre: '  const persona = req.body.persona;\n',
    v: 'persona',
  },
  ConstStatic: {
    top: "const SYSTEM = 'You are terse.';\n",
    pre: '',
    v: 'SYSTEM',
  },
  StaticHelper: {
    top: "const buildPrompt = () => 'You are terse.';\n",
    pre: '',
    v: 'buildPrompt()',
  },
  HelperOfReq: {
    top: 'const buildPrompt = (p: string) => `You are ${p}.`;\n',
    pre: '',
    v: 'buildPrompt(req.body.persona)',
  },
  TemplateMixed: {
    top: "const BASE = 'You are helpful.';\n",
    pre: '',
    v: '`${BASE} Speak as ${req.body.persona}.`',
  },
  TemplateStatic: {
    top: "const BASE = 'You are helpful.';\n",
    pre: '',
    v: '`${BASE} Be brief.`',
  },
  DateInterp: {
    top: '',
    pre: '',
    v: '`Today is ${new Date().toISOString()}.`',
  },
  ImportedConst: {
    top: "import { PREFIX } from './prompts';\n",
    pre: '',
    v: '`${PREFIX} Be brief.`',
  },
  WholeParam: { top: '', pre: '', v: 'systemPrompt' },
  EnvInterp: { top: '', pre: '', v: '`You are ${process.env.BOT_NAME}.`' },
};

/**
 * Per slot: the SDK import and client, and `call(request)` / `request(V)`.
 * `kind: 'ctor'` slots construct an SDK export instead of calling a client.
 */
const PROMPT_SLOT = {
  // anthropic
  SystemString: {
    sdk: "import Anthropic from '@anthropic-ai/sdk';\nconst client = new Anthropic();",
    request: (v) => `{ model: 'm', max_tokens: 1, system: ${v}, messages: [] }`,
    call: (r) => `client.messages.create(${r})`,
  },
  SystemBlocks: {
    sdk: "import Anthropic from '@anthropic-ai/sdk';\nconst client = new Anthropic();",
    request: (v) =>
      `{ model: 'm', max_tokens: 1, system: [{ type: 'text', text: ${v}, cache_control: { type: 'ephemeral' } }], messages: [] }`,
    call: (r) => `client.messages.create(${r})`,
  },
  BatchParams: {
    sdk: "import Anthropic from '@anthropic-ai/sdk';\nconst client = new Anthropic();",
    request: (v) => `{ model: 'm', max_tokens: 1, system: ${v}, messages: [] }`,
    call: (r) =>
      `client.messages.batches.create({ requests: [{ custom_id: 'a', params: ${r} }] })`,
  },
  // openai
  Instructions: {
    sdk: "import OpenAI from 'openai';\nconst client = new OpenAI();",
    request: (v) => `{ model: 'gpt-4.1', instructions: ${v}, input: 'hi' }`,
    call: (r) => `client.responses.create(${r})`,
  },
  SystemTurn: {
    sdk: "import OpenAI from 'openai';\nconst client = new OpenAI();",
    request: (v) =>
      `{ model: 'gpt-4o', messages: [{ role: 'system', content: ${v} }, { role: 'user', content: 'hi' }] }`,
    call: (r) => `client.chat.completions.create(${r})`,
  },
  DeveloperTurn: {
    sdk: "import OpenAI from 'openai';\nconst client = new OpenAI();",
    request: (v) =>
      `{ model: 'o3', messages: [{ role: 'developer', content: ${v} }, { role: 'user', content: 'hi' }] }`,
    call: (r) => `client.chat.completions.create(${r})`,
  },
  InputDeveloper: {
    sdk: "import OpenAI from 'openai';\nconst client = new OpenAI();",
    request: (v) =>
      `{ model: 'gpt-4.1', input: [{ role: 'developer', content: ${v} }, { role: 'user', content: 'hi' }] }`,
    call: (r) => `client.responses.create(${r})`,
  },
  AgentInstructions: {
    sdk: "import { Agent } from '@openai/agents';",
    local: 'class Agent2 {\n  constructor(_o: unknown) {}\n}',
    request: (v) => `{ name: 'assistant', instructions: ${v} }`,
    call: (r) => `new Agent(${r})`,
    localCall: (r) => `new Agent2(${r})`,
  },
  // gemini
  ConfigInstruction: {
    sdk: "import { GoogleGenAI } from '@google/genai';\nconst client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });",
    request: (v) =>
      `{ model: 'gemini-2.5-flash', contents: 'hi', config: { systemInstruction: ${v} } }`,
    call: (r) => `client.models.generateContent(${r})`,
  },
  ModelInstruction: {
    sdk: "import { GoogleGenerativeAI } from '@google/generative-ai';\nconst client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);",
    request: (v) => `{ model: 'gemini-1.5-flash', systemInstruction: ${v} }`,
    call: (r) => `client.getGenerativeModel(${r})`,
  },
  PartsInstruction: {
    sdk: "import { GoogleGenAI } from '@google/genai';\nconst client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });",
    request: (v) =>
      `{ model: 'gemini-2.5-flash', contents: 'hi', config: { systemInstruction: { parts: [{ text: ${v} }] } } }`,
    call: (r) => `client.models.generateContent(${r})`,
  },
};

/** Render one no-untrusted-content-in-prompt case. */
export function renderPrompt(c) {
  const value = PROMPT_VALUE[c.value];
  const slot = PROMPT_SLOT[c.slot];
  let sdk = slot.sdk;
  let call = slot.call;
  if (c.receiver === 'LocalObject') {
    if (slot.local) {
      sdk = `${slot.sdk}\n${slot.local}`;
      call = slot.localCall;
    } else {
      // Keep the SDK import (it opens the gate) but call a same-file object
      // that only shares the request path.
      const imp = slot.sdk.split('\n')[0];
      sdk = `${imp}\nconst client: any = {};`;
    }
  }
  const request = slot.request(value.v);
  const pre =
    c.carrier === 'RequestConst'
      ? `${value.pre}  const request = ${request};\n`
      : value.pre;
  const arg = c.carrier === 'RequestConst' ? 'request' : request;
  return [
    sdk,
    value.top,
    'export async function handler(req: any, systemPrompt: string) {',
    `${pre}  return ${call(arg)};`,
    '}',
    '',
  ]
    .filter(Boolean)
    .join('\n');
}

/* --------------------------------------------------------------------- */
/* no-browser-api-key-exposure                                            */
/* --------------------------------------------------------------------- */

export const BROWSER_DIMENSIONS = ['credential', 'flag', 'carrier', 'client'];

const CREDENTIAL = {
  NoKey: { top: '', pre: '', prop: '' },
  LiteralKey: {
    top: '',
    pre: '',
    prop: `apiKey: '${['sk', 'live', token].join('-')}'`,
  },
  EnvKey: { top: '', pre: '', prop: 'apiKey: process.env.API_KEY' },
  ViteEnvKey: {
    top: '',
    pre: '',
    prop: 'apiKey: import.meta.env.VITE_API_KEY',
  },
  FallbackToEnv: {
    top: '',
    pre: '',
    prop: 'apiKey: userKey || process.env.API_KEY',
  },
  ImportedKey: {
    top: "import { API_KEY } from './config';\n",
    pre: '',
    prop: 'apiKey: API_KEY',
  },
  ParamKey: { top: '', pre: '', prop: 'apiKey: userKey' },
  FetchedToken: {
    top: '',
    pre: "  const { token } = await (await fetch('/api/token')).json();\n",
    prop: 'apiKey: token',
  },
  ProviderFn: {
    top: '',
    pre: '',
    prop: "apiKey: async () => (await fetch('/api/token')).text()",
  },
  TokenProvider: {
    top: "const getToken = async () => 'entra-token';\n",
    pre: '',
    prop: 'azureADTokenProvider: getToken',
  },
};

const FLAG = {
  TrueInline: { top: '', prop: 'dangerouslyAllowBrowser: true' },
  TrueConst: {
    top: 'const allow = true;\n',
    prop: 'dangerouslyAllowBrowser: allow',
  },
  FalseFlag: { top: '', prop: 'dangerouslyAllowBrowser: false' },
  RuntimeFlag: { top: '', prop: 'dangerouslyAllowBrowser: inBrowser' },
  NoFlag: { top: '', prop: '' },
};

/** Render one no-browser-api-key-exposure case for `vendor`. */
export function renderBrowser(vendor, c) {
  const v = VENDOR[vendor];
  const other = vendor === 'anthropic' ? VENDOR.openai : VENDOR.anthropic;
  const cred = CREDENTIAL[c.credential];
  const flag = FLAG[c.flag];
  const props = [cred.prop, flag.prop].filter(Boolean).join(', ');
  const options = `{ ${props} }`;
  let head = importClient(v);
  let ctor = 'Client';
  if (c.client === 'SdkAliased') {
    head = `import { ${v.named} as Foo } from '${v.pkg}';`;
    ctor = 'Foo';
  }
  if (c.client === 'OtherVendor') {
    head = `${importClient(v)}\nimport Other from '${other.pkg}';`;
    ctor = 'Other';
  }
  const pre =
    c.carrier === 'OptionsConst'
      ? `${cred.pre}  const options = ${options};\n`
      : cred.pre;
  const arg = c.carrier === 'OptionsConst' ? 'options' : options;
  return [
    head,
    cred.top + flag.top,
    'export async function connect(userKey: string, inBrowser: boolean) {',
    `${pre}  return new ${ctor}(${arg});`,
    '}',
    '',
  ]
    .filter(Boolean)
    .join('\n');
}
