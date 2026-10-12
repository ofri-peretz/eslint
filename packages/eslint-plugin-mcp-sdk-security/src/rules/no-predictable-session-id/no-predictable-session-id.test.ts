/**
 * Tests for mcp-sdk-security/no-predictable-session-id
 * CWE-330 — an MCP Streamable HTTP transport whose sessionIdGenerator returns
 * a counter, a timestamp, Math.random() or a constant.
 *
 * Written test-first: every invalid case below failed against a stub rule
 * (backlog item 6 of benchmarks/audits/2026-10-10-fp-fn-mcp-sdk-security.md).
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { noPredictableSessionId } from './index';

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

const SDK =
  "import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';\n" +
  "import { randomUUID, randomBytes, getRandomValues } from 'node:crypto';\n";

/** A transport whose sessionIdGenerator is `generator`. */
const transport = (generator: string) =>
  `new StreamableHTTPServerTransport({ sessionIdGenerator: ${generator} });`;

const predictable = { messageId: 'predictableSessionId' as const };
const constant = { messageId: 'constantSessionId' as const };

/** Methods that derive a string from a value without adding entropy. */
const DERIVING_METHODS = [
  'toString',
  'toFixed',
  'toISOString',
  'getTime',
  'valueOf',
  'slice',
  'substring',
  'substr',
  'padStart',
  'padEnd',
  'replace',
  'replaceAll',
  'toUpperCase',
  'toLowerCase',
  'trim',
  'join',
];
/** Global functions that derive a value without adding entropy. */
const DERIVING_GLOBALS = ['String', 'Math.floor', 'Math.round', 'Math.trunc'];
/** Predictable global sources. */
const PREDICTABLE_GLOBALS = [
  'Date.now',
  'performance.now',
  'Math.random',
  'process.hrtime',
  'process.hrtime.bigint',
];

describe('no-predictable-session-id', () => {
  ruleTester.run('no-predictable-session-id', noPredictableSessionId, {
    valid: [
      {
        name: "randomUUID from 'node:crypto'",
        code: SDK + transport('() => randomUUID()'),
      },
      {
        name: 'randomUUID passed by reference — nothing to read, abstain',
        code: SDK + transport('randomUUID'),
      },
      {
        name: 'randomBytes(...).toString(hex)',
        code: SDK + transport("() => randomBytes(16).toString('hex')"),
      },
      {
        name: "getRandomValues from 'crypto' (default import)",
        code:
          "import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';\n" +
          "import crypto from 'crypto';\n" +
          transport(
            "() => Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('hex')",
          ),
      },
      {
        name: 'the global crypto.randomUUID()',
        code:
          "import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';\n" +
          transport('() => crypto.randomUUID()'),
      },
      {
        name: 'the global crypto.getRandomValues() inside an unknown call',
        code:
          "import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';\n" +
          transport(
            "() => Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('hex')",
          ),
      },
      {
        name: "uuid's v4 and v7",
        code:
          SDK +
          "import { v4 as uuidv4, v7 } from 'uuid';\n" +
          transport('() => uuidv4()') +
          '\n' +
          transport('() => v7()'),
      },
      {
        name: "nanoid's nanoid",
        code:
          SDK +
          "import { nanoid } from 'nanoid';\n" +
          transport('() => nanoid()'),
      },
      {
        name: 'a timestamp prefix on a CSPRNG id still contains a CSPRNG source',
        code: SDK + transport('() => `${Date.now()}-${randomUUID()}`'),
      },
      {
        name: 'a CSPRNG id read through a member is still a CSPRNG source',
        code: SDK + transport("() => randomUUID().split('-')[0]"),
      },
      {
        name: 'an imported generator — cannot see into it, abstain',
        code:
          SDK +
          "import { makeSessionId } from './ids';\n" +
          transport('() => makeSessionId()'),
      },
      {
        name: 'an imported generator passed by reference — abstain',
        code:
          SDK +
          "import { makeSessionId } from './ids';\n" +
          transport('makeSessionId'),
      },
      {
        name: 'a method call it cannot see into — abstain',
        code: SDK + transport('() => ids.next()'),
      },
      {
        name: 'a let read without update — abstain',
        code: SDK + 'let current = load();\n' + transport('() => current'),
      },
      {
        name: 'an environment variable — abstain',
        code: SDK + transport('() => process.env.SESSION_ID'),
      },
      {
        name: 'a shadowed Date is not the global',
        code:
          SDK +
          'const Date = { now: () => randomUUID() };\n' +
          transport('() => String(Date.now())'),
      },
      {
        name: 'a shadowed Math is not the global',
        code:
          SDK +
          'export function make(Math) {\n' +
          `  return ${transport('() => String(Math.random())')}\n` +
          '}',
      },
      {
        name: 'a per-request CSPRNG const closed over by the generator',
        code:
          SDK +
          "app.post('/mcp', (req, res) => {\n" +
          '  const id = randomUUID();\n' +
          `  const t = ${transport('() => id')}\n` +
          '});',
      },
      {
        name: 'stateless mode has no generator',
        code: SDK + transport('undefined'),
      },
      {
        name: 'a generator with no return — abstain',
        code: SDK + transport('() => {}'),
      },
      {
        name: 'a self-referencing const chain — bounded, abstain',
        code: SDK + transport('() => { const a = b; const b = a; return a; }'),
      },
      {
        name: 'a same-file helper that returns randomUUID()',
        code:
          SDK +
          'function makeId() { return randomUUID(); }\n' +
          transport('() => makeId()'),
      },
      {
        name: 'a generator returned by a call it cannot see into — abstain',
        code: SDK + transport('() => factory()()'),
      },
      {
        name: 'a conditional is not followed — abstain',
        code:
          SDK + transport('() => (legacy ? String(Date.now()) : randomUUID())'),
      },
      {
        name: 'a destructured const — abstain',
        code: SDK + transport('() => { const { id } = state; return id; }'),
      },
      {
        name: 'crypto.randomUUID passed by reference — not a predictable source',
        code:
          "import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';\n" +
          transport('crypto.randomUUID'),
      },
      {
        name: 'a method on a local object passed by reference — abstain',
        code: SDK + 'const ids = makeIds();\n' + transport('ids.next'),
      },
      {
        name: 'a generator built by a call — abstain',
        code: SDK + transport('makeGenerator()'),
      },
      {
        name: 'options by reference — abstain',
        code:
          SDK +
          'const OPTIONS = { sessionIdGenerator: () => String(n++) };\n' +
          'new StreamableHTTPServerTransport(OPTIONS);',
      },
      {
        name: 'options with a spread — abstain',
        code:
          SDK +
          'new StreamableHTTPServerTransport({ ...base, sessionIdGenerator: () => String(n++) });',
      },
      {
        name: 'options with a computed key — abstain',
        code:
          SDK +
          'new StreamableHTTPServerTransport({ [key]: () => randomUUID(), enableJsonResponse: true });',
      },
      {
        name: 'no sessionIdGenerator option',
        code:
          SDK +
          'new StreamableHTTPServerTransport({ enableJsonResponse: true });',
      },
      {
        name: 'no options at all',
        code: SDK + 'new StreamableHTTPServerTransport();',
      },
      {
        name: 'the same option on a non-MCP constructor',
        code:
          SDK +
          "import { SessionStore } from 'some-session-lib';\nnew SessionStore({ sessionIdGenerator: () => String(n++) });",
      },
      {
        name: 'an SSEServerTransport generates its own session id',
        code:
          SDK +
          "import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';\n" +
          "new SSEServerTransport('/messages', res, { sessionIdGenerator: () => 'x' });",
      },
      {
        name: 'a local class named StreamableHTTPServerTransport is not the SDK',
        code:
          "import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';\n" +
          'class StreamableHTTPServerTransport { constructor(o) {} }\n' +
          transport("() => 'session'"),
      },
      {
        name: 'a file that never imports the MCP SDK',
        code:
          "import { StreamableHTTPServerTransport } from './t';\n" +
          transport('() => String(n++)'),
      },
    ],
    invalid: [
      {
        // @found mcp-sdk-security FP/FN audit 2026-10-10, backlog item 6 (predictable session IDs)
        name: 'FN: a counter as the session id',
        code: SDK + 'let counter = 0;\n' + transport('() => String(counter++)'),
        errors: [predictable],
      },
      {
        // @found mcp-sdk-security FP/FN audit 2026-10-10, backlog item 6 (predictable session IDs)
        name: 'FN: Date.now() as the session id',
        code: SDK + transport('() => Date.now().toString()'),
        errors: [predictable],
      },
      {
        // @found mcp-sdk-security FP/FN audit 2026-10-10, backlog item 6 (predictable session IDs)
        name: 'FN: Math.random() as the session id',
        code: SDK + transport('() => Math.random().toString(36).slice(2)'),
        errors: [predictable],
      },
      {
        // @found mcp-sdk-security FP/FN audit 2026-10-10, backlog item 6 (predictable session IDs)
        name: 'FN: a constant session id shared by every client',
        code: SDK + transport("() => 'session'"),
        errors: [constant],
      },
      {
        name: 'a template of a timestamp and Math.random()',
        code: SDK + transport('() => `${Date.now()}-${Math.random()}`'),
        errors: [predictable],
      },
      {
        name: 'a prefix and a pre-increment',
        code: SDK + 'let n = 0;\n' + transport("() => 'sess-' + ++n"),
        errors: [predictable],
      },
      {
        name: 'new Date().toISOString()',
        code: SDK + transport('() => new Date().toISOString()'),
        errors: [predictable],
      },
      {
        name: 'Math.floor(Math.random() * 1e9)',
        code:
          SDK + transport('() => Math.floor(Math.random() * 1e9).toString()'),
        errors: [predictable],
      },
      {
        name: 'a method-shorthand generator with a block body and a local const',
        code:
          'import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";\n' +
          'new StreamableHTTPServerTransport({ sessionIdGenerator() { const t = Date.now(); return `s${t}`; } });',
        errors: [predictable],
      },
      {
        name: 'a same-file function declaration passed by reference',
        code:
          SDK +
          'let seq = 0;\nfunction nextId() { return String(seq++); }\n' +
          transport('nextId'),
        errors: [predictable],
      },
      {
        name: 'a same-file const arrow passed by reference',
        code:
          SDK +
          'const nextId = () => Date.now().toString(36);\n' +
          transport('nextId'),
        errors: [predictable],
      },
      {
        name: 'a module-level CSPRNG const is computed once — every session gets it',
        code: SDK + 'const ID = randomUUID();\n' + transport('() => ID'),
        errors: [constant],
      },
      {
        name: 'a module-level string const',
        code: SDK + "const SESSION = 'shared';\n" + transport('() => SESSION'),
        errors: [constant],
      },
      {
        name: 'every branch returns a constant',
        code: SDK + transport("() => { if (flag) return 'a'; return 'b'; }"),
        errors: [constant],
      },
      {
        name: 'a same-file helper called by the generator',
        code:
          SDK +
          "let n = 0;\nfunction makeId() { return 'id-' + n++; }\n" +
          transport('() => makeId()'),
        errors: [predictable],
      },
      {
        name: 'Date.now passed by reference',
        code: SDK + transport('Date.now'),
        errors: [predictable],
      },
      {
        name: 'an update on a member counter',
        code:
          SDK + 'const state = { n: 0 };\n' + transport('() => `${state.n++}`'),
        errors: [predictable],
      },
      {
        name: "SDK v2 NodeStreamableHTTPServerTransport ('@modelcontextprotocol/node')",
        code:
          "import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';\n" +
          'new NodeStreamableHTTPServerTransport({ sessionIdGenerator: () => String(Date.now()) });',
        errors: [predictable],
      },
      {
        name: "SDK v2 WebStandardStreamableHTTPServerTransport ('@modelcontextprotocol/server')",
        code:
          "import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/server';\n" +
          'new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: () => String(Math.random()) });',
        errors: [predictable],
      },
      ...PREDICTABLE_GLOBALS.map((source) => ({
        name: `every predictable global source: ${source}`,
        code: SDK + transport(`() => String(${source}())`),
        errors: [predictable],
      })),
      ...DERIVING_METHODS.map((method) => ({
        name: `every deriving method keeps it predictable: .${method}()`,
        code: SDK + transport(`() => String(Date.now()).${method}('')`),
        errors: [predictable],
      })),
      ...DERIVING_GLOBALS.map((fn) => ({
        name: `every deriving global keeps it predictable: ${fn}()`,
        code: SDK + transport(`() => ${fn}(Date.now())`),
        errors: [predictable],
      })),
    ],
  });
});
