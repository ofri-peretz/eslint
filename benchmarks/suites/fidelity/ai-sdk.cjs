/**
 * Shared spellings for the vendor LLM SDK models
 * (`models/anthropic-security/`, `models/openai-security/`,
 * `models/gemini-security/`).
 *
 * Every rule in those three plugins is gated on the file importing the
 * vendor's SDK, so each model samples how real code reaches the client
 * constructor. A spelling is `{ head, ctor }`: `head` is the import (and any
 * declarations it needs), `ctor(args)` returns the statements that build
 * `client` from the constructor arguments `args`.
 *
 * Lives outside `models/` because the runner treats every `.cjs` there as a
 * model.
 */

/** Indent every non-empty line of `text` by `n` spaces. */
const indent = (text, n = 2) =>
  text
    .split('\n')
    .map((l) => (l ? `${' '.repeat(n)}${l}` : l))
    .join('\n');

/** `const client = new <expr>(<args>);` */
const newClient = (expr) => (args) => `const client = new ${expr}(${args});`;

/**
 * The spellings common to the three SDKs, for a client class `Cls` exported
 * by `pkg` as a named export and, unless `hasDefault` is false, as default.
 */
function standardClients(pkg, Cls, { hasDefault = true } = {}) {
  // The import the composite spellings start from.
  const main = hasDefault
    ? `import ${Cls} from '${pkg}';`
    : `import { ${Cls} } from '${pkg}';`;
  return {
    ...(hasDefault && {
      Default: { head: main, ctor: newClient(Cls) },
    }),
    Named: { head: `import { ${Cls} } from '${pkg}';`, ctor: newClient(Cls) },
    Renamed: {
      head: `import { ${Cls} as Llm } from '${pkg}';`,
      ctor: newClient('Llm'),
    },
    Namespace: {
      head: `import * as sdk from '${pkg}';`,
      ctor: newClient(`sdk.${Cls}`),
    },
    Require: {
      head: `const { ${Cls} } = require('${pkg}');`,
      ctor: newClient(Cls),
    },
    RequireMember: {
      head: `const sdk = require('${pkg}');`,
      ctor: newClient(`sdk['${Cls}']`),
    },
    // A same-file subclass whose constructor hands the options to `super`.
    Subclass: {
      head: main,
      ctor: (args) =>
        `class AppClient extends ${Cls} {\n  constructor() {\n    super(${args});\n  }\n}\nconst client = new AppClient();`,
    },
    // A same-file factory passing its options parameter straight through.
    Wrapper: {
      head: main,
      ctor: (args) =>
        `function makeClient(options: any) {\n  return new ${Cls}(options);\n}\nconst client = makeClient(${args});`,
    },
    // Another vendor's client in a file that imports this SDK: not this rule's.
    Lookalike: {
      head: `${main}\nimport { Pinecone } from '@pinecone-database/pinecone';`,
      ctor: newClient('Pinecone'),
    },
    // The same constructor with no SDK import anywhere in the file.
    NoImport: { head: '', ctor: newClient(Cls) },
  };
}

const ANTHROPIC_PKG = '@anthropic-ai/sdk';
const OPENAI_PKG = 'openai';

const CLIENTS = {
  anthropic: {
    ...standardClients(ANTHROPIC_PKG, 'Anthropic'),
    WithOptions: {
      head: `import Anthropic from '${ANTHROPIC_PKG}';`,
      ctor: (args) =>
        `const base = new Anthropic();\nconst client = base.withOptions(${args});`,
    },
    Bedrock: {
      head: "import { AnthropicBedrock } from '@anthropic-ai/bedrock-sdk';",
      ctor: newClient('AnthropicBedrock'),
    },
    Vertex: {
      head: "import { AnthropicVertex } from '@anthropic-ai/vertex-sdk';",
      ctor: newClient('AnthropicVertex'),
    },
  },
  openai: {
    ...standardClients(OPENAI_PKG, 'OpenAI'),
    WithOptions: {
      head: `import OpenAI from '${OPENAI_PKG}';`,
      ctor: (args) =>
        `const base = new OpenAI();\nconst client = base.withOptions(${args});`,
    },
    Azure: {
      head: `import { AzureOpenAI } from '${OPENAI_PKG}';`,
      ctor: newClient('AzureOpenAI'),
    },
    // The Agents SDK's model provider.
    AgentsProvider: {
      head: "import { OpenAIProvider } from '@openai/agents';",
      ctor: newClient('OpenAIProvider'),
    },
    // `openai-edge` is a different package: it does not open the gate.
    Edge: {
      head: "import { Configuration } from 'openai-edge';",
      ctor: newClient('Configuration'),
    },
  },
  gemini: {
    // `@google/genai` has no default export.
    ...standardClients('@google/genai', 'GoogleGenAI', { hasDefault: false }),
  },
};

/**
 * `@google/generative-ai` constructors that take the key positionally:
 * `new GoogleGenerativeAI(key)` and the server-side managers.
 */
const GEMINI_POSITIONAL = {
  Legacy: {
    head: "import { GoogleGenerativeAI } from '@google/generative-ai';",
    ctor: newClient('GoogleGenerativeAI'),
  },
  LegacyRenamed: {
    head: "import { GoogleGenerativeAI as Gemini } from '@google/generative-ai';",
    ctor: newClient('Gemini'),
  },
  LegacyRequire: {
    head: "const { GoogleGenerativeAI } = require('@google/generative-ai');",
    ctor: newClient('GoogleGenerativeAI'),
  },
  FileManager: {
    head: "import { GoogleAIFileManager } from '@google/generative-ai/server';",
    ctor: newClient('GoogleAIFileManager'),
  },
  CacheManager: {
    head: "import { GoogleAICacheManager } from '@google/generative-ai/server';",
    ctor: newClient('GoogleAICacheManager'),
  },
  LegacyNoImport: { head: '', ctor: newClient('GoogleGenerativeAI') },
};

/**
 * Key-shaped literals (≥ 20 chars, letters and digits, no whitespace) in each
 * vendor's documented prefix, short of the real length so no secret scanner
 * mistakes them for a live key. `aws` is AWS's own documentation example.
 */
const KEYS = {
  anthropic: "'sk-ant-api03-abcdef1234567890'",
  openai: "'sk-proj-abc123xyz789def456'",
  gemini: "'AIzaSyA1234567890abcdefghijk'",
  aws: "'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'",
};

/**
 * A whole file: the spelling's head, any extra imports and preamble, then the
 * client built from `args`. With `param`, the construction sits in an exported
 * function taking that parameter list (the key is a parameter); otherwise the
 * client is exported from module scope.
 */
function clientFile(spelling, args, { imports = '', pre = '', param } = {}) {
  const build = spelling.ctor(args);
  const tail =
    param === undefined
      ? `${pre ? `${pre}\n` : ''}${build}\nexport { client };`
      : `export async function make(${param}) {\n${indent(
          [pre, build, 'return client;'].filter(Boolean).join('\n'),
        )}\n}`;
  return [spelling.head, imports, tail].filter(Boolean).join('\n') + '\n';
}

/** The stand-in each SDK's own tests and README use for a key. */
const STAND_INS = {
  anthropic: "'my-anthropic-api-key'",
  openai: "'My API Key'",
  gemini: "'fake-api-key'",
};

/**
 * Key value tag -> the constructor arguments that carry it, for an options
 * property `prop`, or positionally when `prop` is null. Returns
 * `{ imports, pre, args, param }` for `clientFile`.
 */
function keyArgs(value, vendor, prop, key = KEYS[vendor]) {
  const wrap = (expr) => (prop === null ? expr : `{ ${prop}: ${expr} }`);
  switch (value) {
    case 'KeyLiteral':
      return { args: wrap(key) };
    case 'Placeholder':
      return { args: wrap("'<YOUR_API_KEY>'") };
    case 'StandIn':
      return { args: wrap(STAND_INS[vendor]) };
    case 'XFill':
      return { args: wrap("'sk-xxxxxxxxxxxxxxxxxxxxxxxx'") };
    case 'Short':
      return { args: wrap("'key-1234567'") };
    case 'NoDigits':
      return { args: wrap("'abcdefghijklmnopqrstuvwxyzabcdef'") };
    case 'Spaced':
      return { args: wrap("'my key 1234567890 abcdefghij'") };
    case 'Env':
      return { args: wrap('process.env.API_KEY as string') };
    case 'EnvNullish':
      return { args: wrap(`process.env.API_KEY ?? ${key}`) };
    case 'EnvOr':
      return { args: wrap(`process.env.API_KEY || ${key}`) };
    case 'Ternary':
      return {
        args: wrap(
          `process.env.NODE_ENV === 'production' ? (process.env.API_KEY as string) : ${key}`,
        ),
      };
    case 'ConstKey':
      return { pre: `const API_KEY = ${key};`, args: wrap('API_KEY') };
    case 'ConstOptions':
      return { pre: `const options = { ${prop}: ${key} };`, args: 'options' };
    case 'Shorthand':
      return { pre: `const ${prop} = ${key};`, args: `{ ${prop} }` };
    case 'Spread':
      return {
        pre: `const base = { ${prop}: ${key} };`,
        args: '{ ...base, maxRetries: 2 }',
      };
    case 'Param':
      return { param: 'apiKey: string', args: wrap('apiKey') };
    case 'Imported':
      return {
        imports: "import { API_KEY } from './secrets';",
        args: wrap('API_KEY'),
      };
    case 'UnseenSpread':
      return {
        param: 'options: object',
        args: '{ ...options, maxRetries: 2 }',
      };
    default:
      throw new Error(`unknown key value ${value}`);
  }
}

/**
 * Browser-flag inputs: `flag` decides how `dangerouslyAllowBrowser` is
 * written, `key` where the credential comes from. Returns
 * `{ imports, pre, args, param }` for `clientFile`.
 */
function browserArgs(flag, key, vendor) {
  const imports = [];
  const pre = [];
  const params = [];
  let cred;
  switch (key) {
    case 'Literal':
      cred = `apiKey: ${KEYS[vendor]}`;
      break;
    case 'ViteEnv':
      cred = 'apiKey: import.meta.env.VITE_LLM_KEY';
      break;
    case 'NextPublicEnv':
      cred = 'apiKey: process.env.NEXT_PUBLIC_LLM_KEY';
      break;
    case 'ServerEnv':
      cred = 'apiKey: process.env.LLM_API_KEY';
      break;
    case 'Imported':
      imports.push("import { LLM_KEY } from './config';");
      cred = 'apiKey: LLM_KEY';
      break;
    case 'BuildDefine':
      pre.push('declare const __LLM_KEY__: string;');
      cred = 'apiKey: __LLM_KEY__';
      break;
    case 'NoKey':
      cred = '';
      break;
    case 'ProviderFn':
      cred = "apiKey: async () => (await fetch('/api/llm-token')).text()";
      break;
    case 'Param':
      params.push('userKey: string');
      cred = 'apiKey: userKey';
      break;
    case 'Await':
      imports.push("import { fetchSessionToken } from './session';");
      cred = 'apiKey: await fetchSessionToken()';
      break;
    case 'Call':
      imports.push("import { sessionToken } from './session';");
      cred = 'apiKey: sessionToken()';
      break;
    case 'MixtureOr':
      params.push('userKey: string');
      cred = 'apiKey: userKey || import.meta.env.VITE_LLM_KEY';
      break;
    case 'AuthTokenEnv':
      cred = 'authToken: import.meta.env.VITE_LLM_TOKEN';
      break;
    case 'AzureProvider':
      imports.push(
        "import { DefaultAzureCredential, getBearerTokenProvider } from '@azure/identity';",
      );
      cred =
        "azureADTokenProvider: getBearerTokenProvider(new DefaultAzureCredential(), 'https://cognitiveservices.azure.com/.default')";
      break;
    default:
      throw new Error(`unknown key ${key}`);
  }
  const props = (flagProp) => [cred, flagProp].filter(Boolean).join(', ');
  let args;
  switch (flag) {
    case 'True':
      args = `{ ${props('dangerouslyAllowBrowser: true')} }`;
      break;
    case 'False':
      args = `{ ${props('dangerouslyAllowBrowser: false')} }`;
      break;
    case 'Runtime':
      args = `{ ${props("dangerouslyAllowBrowser: typeof window !== 'undefined'")} }`;
      break;
    case 'ConstTrue':
      pre.push('const ALLOW_BROWSER = true;');
      args = `{ ${props('dangerouslyAllowBrowser: ALLOW_BROWSER')} }`;
      break;
    case 'Absent':
      args = `{ ${props('')} }`;
      break;
    case 'OptionsConst':
      pre.push(
        `const options = { ${props('dangerouslyAllowBrowser: true')} };`,
      );
      args = 'options';
      break;
    case 'SpreadParam':
      params.push('base: object');
      args = `{ ...base, ${props('')} }`;
      break;
    default:
      throw new Error(`unknown flag ${flag}`);
  }
  return {
    imports: imports.join('\n'),
    pre: pre.join('\n'),
    args,
    param: params.length ? params.join(', ') : undefined,
  };
}

/**
 * System-prompt text values for the no-untrusted-content-in-prompt models.
 * Each is `{ dynamic, expr, mod?, fn?, imports? }`: `expr` is the prompt
 * value, written inside `reply(...)` (see `promptFile`), `mod` and `fn` are
 * declarations it needs at module and function scope. `dynamic` is the
 * contract's verdict: text this file does not fix (a string parameter or
 * request data spliced in, or request data as the whole value) is dynamic;
 * literals, consts, same-file prompt maps and helpers, imports, env reads,
 * dates, counts, number / boolean parameters, and a parameter as the whole
 * value are static.
 */
const PROMPT_VALUES = {
  Literal: { dynamic: false, expr: "'You are a helpful assistant.'" },
  PlainTemplate: { dynamic: false, expr: '`You are a helpful assistant.`' },
  Tagged: {
    dynamic: false,
    imports: "import dedent from 'dedent';",
    expr: 'dedent`You are a helpful assistant.`',
  },
  ConstConcat: {
    dynamic: false,
    mod: "const BASE_PROMPT = 'You are a helpful assistant.';",
    expr: "BASE_PROMPT + ' Answer briefly.'",
  },
  Join: {
    dynamic: false,
    expr: "['You are a helpful assistant.', 'Answer briefly.'].join('\\n')",
  },
  StringMethod: {
    dynamic: false,
    expr: "'  You are a helpful assistant.  '.trim()",
  },
  PromptsMap: {
    dynamic: false,
    mod: "const PROMPTS = { support: 'You answer support questions.', sales: 'You answer sales questions.' };",
    expr: 'PROMPTS[kind]',
  },
  StaticTernary: {
    dynamic: false,
    expr: "strict ? 'Answer briefly.' : 'Answer in detail.'",
  },
  StaticHelper: {
    dynamic: false,
    mod: "function basePrompt(brief: boolean) {\n  if (brief) return 'Answer briefly.';\n  return 'Answer in detail.';\n}",
    expr: 'basePrompt(strict)',
  },
  ImportedConst: {
    dynamic: false,
    imports: "import { RECOMMENDED_PROMPT_PREFIX } from './prompts';",
    expr: '`${RECOMMENDED_PROMPT_PREFIX} You are a helpful assistant.`',
  },
  EnvRead: {
    dynamic: false,
    expr: '`You are ${process.env.ASSISTANT_NAME}, a helpful assistant.`',
  },
  DateIso: {
    dynamic: false,
    expr: '`Today is ${new Date().toISOString()}.`',
  },
  Count: { dynamic: false, expr: '`You have ${tools.length} tools.`' },
  NumberParam: {
    dynamic: false,
    expr: '`Answer in at most ${limit} sentences.`',
  },
  BoolParam: { dynamic: false, expr: '`Strict mode: ${strict}.`' },
  WholeParam: { dynamic: false, expr: 'systemPrompt' },
  InterpParam: {
    dynamic: true,
    expr: '`You are an assistant for ${tenantName}.`',
  },
  InterpReq: {
    dynamic: true,
    expr: '`You are an assistant for ${req.body.tenant}.`',
  },
  ConcatParam: {
    dynamic: true,
    expr: "'You are an assistant for ' + tenantName",
  },
  JoinDynamic: {
    dynamic: true,
    expr: "['You are an assistant for', tenantName].join(' ')",
  },
  ConstTainted: {
    dynamic: true,
    fn: 'const persona = `You are an assistant for ${tenantName}.`;',
    expr: 'persona',
  },
  DynamicTernary: {
    dynamic: true,
    expr: "strict ? 'Answer briefly.' : `Answer as ${tenantName}.`",
  },
  DynamicHelper: {
    dynamic: true,
    mod: 'function tenantPrompt(name: string) {\n  return `You are an assistant for ${name}.`;\n}',
    expr: 'tenantPrompt(tenantName)',
  },
  WholeReq: { dynamic: true, expr: 'req.body.systemPrompt' },
  ReqConcat: {
    dynamic: true,
    expr: "'You are a helpful assistant. ' + req.query.style",
  },
};

const REPLY_PARAMS =
  "req: any, tenantName: string, systemPrompt: string, strict: boolean, limit: number, tools: string[], kind: 'support' | 'sales'";

/**
 * A request-handler file: `head` (SDK import), the value's imports and module
 * declarations, `decl` (the client), and `reply(...)` running `fn` then
 * returning `call`. `clientParam` makes the client a parameter of `reply`.
 */
function promptFile({ head, decl = '', value, fn = [], call, clientParam }) {
  const params = clientParam ? `${clientParam}, ${REPLY_PARAMS}` : REPLY_PARAMS;
  const body = [...fn, value.fn, `return ${call};`].filter(Boolean).join('\n');
  return (
    [
      head,
      value.imports,
      value.mod,
      decl,
      `export async function reply(${params}) {\n${indent(body)}\n}`,
    ]
      .filter(Boolean)
      .join('\n') + '\n'
  );
}

module.exports = {
  indent,
  PROMPT_VALUES,
  promptFile,
  browserArgs,
  CLIENTS,
  GEMINI_POSITIONAL,
  KEYS,
  STAND_INS,
  clientFile,
  keyArgs,
};
