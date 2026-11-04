const { tag } = require('../../lib.cjs');
const { SDK } = require('../../mcp-sdk.cjs');

/** Transport tag -> [head, class name]. */
const TRANSPORTS = {
  V1: [
    `import { StreamableHTTPServerTransport } from '${SDK}/server/streamableHttp.js';`,
    'StreamableHTTPServerTransport',
  ],
  V1Require: [
    `const { StreamableHTTPServerTransport: Transport } = require('${SDK}/server/streamableHttp.js');`,
    'Transport',
  ],
  NodeV2: [
    "import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';",
    'NodeStreamableHTTPServerTransport',
  ],
  WebV2: [
    "import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/server';",
    'WebStandardStreamableHTTPServerTransport',
  ],
  LocalClass: [
    `import { McpServer } from '${SDK}/server/mcp.js';\nexport const server = new McpServer({ name: 'demo', version: '1.0.0' });\nclass StreamableHTTPServerTransport {\n  constructor(readonly options: { sessionIdGenerator?: () => string }) {}\n}`,
    'StreamableHTTPServerTransport',
  ],
  NoMcp: [
    "import { StreamableHTTPServerTransport } from './transport';",
    'StreamableHTTPServerTransport',
  ],
};

/** Generator tag -> [imports/pre, options object text]. */
const GENS = {
  Counter: ['let n = 0;', '{ sessionIdGenerator: () => String(n++) }'],
  PreIncrement: ['let seq = 0;', '{ sessionIdGenerator: () => `s-${++seq}` }'],
  DateNow: ['', '{ sessionIdGenerator: () => String(Date.now()) }'],
  DateNowBase36: ['', '{ sessionIdGenerator: () => Date.now().toString(36) }'],
  NewDateIso: ['', '{ sessionIdGenerator: () => new Date().toISOString() }'],
  PerfNow: [
    '',
    '{ sessionIdGenerator: () => Math.floor(performance.now()).toString() }',
  ],
  Hrtime: [
    '',
    '{ sessionIdGenerator: () => process.hrtime.bigint().toString() }',
  ],
  MathRandom: [
    '',
    '{ sessionIdGenerator: () => Math.random().toString(36).slice(2) }',
  ],
  MathRandomFloor: [
    '',
    '{ sessionIdGenerator: () => String(Math.floor(Math.random() * 1e9)) }',
  ],
  Literal: ['', "{ sessionIdGenerator: () => 'session' }"],
  ModuleConstRandom: [
    "import { randomUUID } from 'node:crypto';\nconst ID = randomUUID();",
    '{ sessionIdGenerator: () => ID }',
  ],
  DateNowRef: ['', '{ sessionIdGenerator: Date.now }'],
  DateNowCast: [
    '',
    '{ sessionIdGenerator: Date.now as unknown as () => string }',
  ],
  OptionsCast: [
    '',
    '({ sessionIdGenerator: () => `id-${Date.now()}` } satisfies Record<string, unknown>)',
  ],
  MethodDateNow: [
    '',
    '{\n  sessionIdGenerator() {\n    return `${Date.now()}`;\n  },\n}',
  ],
  NamedFnRandom: [
    'function newSessionId() {\n  return Math.random().toString(16).slice(2);\n}',
    '{ sessionIdGenerator: newSessionId }',
  ],
  HelperTimestamp: [
    'function stamp() {\n  return Date.now().toString(36);\n}',
    "{ sessionIdGenerator: () => 'mcp-' + stamp() }",
  ],
  LocalConstTimestamp: [
    '',
    '{\n  sessionIdGenerator: () => {\n    const t = Date.now();\n    return `${t}`;\n  },\n}',
  ],
  RandomUuid: [
    "import { randomUUID } from 'node:crypto';",
    '{ sessionIdGenerator: () => randomUUID() }',
  ],
  RandomUuidRef: [
    "import { randomUUID } from 'crypto';",
    '{ sessionIdGenerator: randomUUID }',
  ],
  GlobalCrypto: ['', '{ sessionIdGenerator: () => crypto.randomUUID() }'],
  RandomBytesHex: [
    "import { randomBytes } from 'node:crypto';",
    "{ sessionIdGenerator: () => randomBytes(16).toString('hex') }",
  ],
  UuidV4: [
    "import { v4 as uuidv4 } from 'uuid';",
    '{ sessionIdGenerator: () => uuidv4() }',
  ],
  UuidV7: ["import { v7 } from 'uuid';", '{ sessionIdGenerator: () => v7() }'],
  Nanoid: [
    "import { nanoid } from 'nanoid';",
    '{ sessionIdGenerator: () => nanoid() }',
  ],
  TimestampPlusUuid: [
    "import { randomUUID } from 'node:crypto';",
    '{ sessionIdGenerator: () => `${Date.now()}-${randomUUID()}` }',
  ],
  ImportedGen: [
    "import { makeSessionId } from './ids';",
    '{ sessionIdGenerator: makeSessionId }',
  ],
  ObjectMethod: [
    "import { ids } from './ids';",
    '{ sessionIdGenerator: () => ids.next() }',
  ],
  LetNoUpdate: [
    "let currentId = '';\nexport function setId(v: string) {\n  currentId = v;\n}",
    '{ sessionIdGenerator: () => currentId }',
  ],
  EnvValue: ['', "{ sessionIdGenerator: () => process.env.SESSION_ID ?? '' }"],
  Conditional: [
    "import { randomUUID } from 'node:crypto';\ndeclare const debug: boolean;",
    "{ sessionIdGenerator: () => (debug ? 'debug' : randomUUID()) }",
  ],
  PerRequestConst: ["import { randomUUID } from 'node:crypto';", null],
  OptionsVar: ['', null],
  OptionsSpread: [
    "import { baseOptions } from './options';",
    '{ ...baseOptions, sessionIdGenerator: () => String(Date.now()) }',
  ],
};

module.exports = {
  rule: 'no-predictable-session-id',
  // Generators: 34 shapes on the v1 transport. Transports: 4 shapes x 6 transports.
  domain: 58,
  traces: 700,
  key: (s) => `${tag(s.part)}|${tag(s.gen)}|${tag(s.transport)}`,
  code: (s) => {
    const [head, cls] = TRANSPORTS[tag(s.transport)];
    const g = tag(s.gen);
    const [pre, opts] = GENS[g];
    let body;
    if (g === 'PerRequestConst') {
      body = `export function onRequest() {\n  const id = randomUUID();\n  return new ${cls}({ sessionIdGenerator: () => id });\n}`;
    } else if (g === 'OptionsVar') {
      body = `const options = { sessionIdGenerator: () => String(Date.now()) };\nexport const transport = new ${cls}(options);`;
    } else {
      body = `export const transport = new ${cls}(${opts});`;
    }
    return [head, pre, body].filter(Boolean).join('\n') + '\n';
  },
};
