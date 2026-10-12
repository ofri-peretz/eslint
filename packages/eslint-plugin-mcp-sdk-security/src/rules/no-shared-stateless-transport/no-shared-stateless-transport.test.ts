/**
 * Tests for mcp-sdk-security/no-shared-stateless-transport
 * CWE-488 — CVE-2026-25536: in stateless Streamable HTTP mode, one transport or
 * one McpServer reused across requests delivers one client's responses to
 * another.
 *
 * Written test-first: every invalid case below failed against a stub rule
 * (backlog item 5 of benchmarks/audits/2026-10-10-fp-fn-mcp-sdk-security.md).
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { noSharedStatelessTransport } from './index';

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
  "import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';\n" +
  "import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';\n" +
  "import { randomUUID } from 'node:crypto';\n";

const STATELESS =
  'new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })';
const SHARED_SERVER =
  "const server = new McpServer({ name: 'demo', version: '1.0.0' });\n";

const moduleLevel = (transport: string) => ({
  messageId: 'statelessTransportAtModuleLevel' as const,
  data: { transport },
});
const sharedServer = (server: string) => ({
  messageId: 'sharedServerAcrossRequests' as const,
  data: { server },
});

describe('no-shared-stateless-transport', () => {
  ruleTester.run('no-shared-stateless-transport', noSharedStatelessTransport, {
    valid: [
      {
        name: "the SDK's stateless example: server and transport both created per request",
        code:
          SDK +
          "app.post('/mcp', async (req, res) => {\n" +
          "  const server = new McpServer({ name: 'demo', version: '1.0.0' });\n" +
          `  const transport = ${STATELESS};\n` +
          "  res.on('close', () => { transport.close(); server.close(); });\n" +
          '  await server.connect(transport);\n' +
          '  await transport.handleRequest(req, res, req.body);\n' +
          '});',
      },
      {
        name: 'a same-file getServer() factory called per request',
        code:
          SDK +
          "function getServer() { return new McpServer({ name: 'demo', version: '1.0.0' }); }\n" +
          "app.post('/mcp', async (req, res) => {\n" +
          '  const server = getServer();\n' +
          `  const transport = ${STATELESS};\n` +
          '  await server.connect(transport);\n' +
          '});',
      },
      {
        name: 'stateful mode: a session-id generator and a module-level transports map',
        code:
          SDK +
          SHARED_SERVER +
          'const transports = {};\n' +
          "app.post('/mcp', async (req, res) => {\n" +
          '  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => randomUUID(),\n' +
          '    onsessioninitialized: (id) => { transports[id] = transport; } });\n' +
          '  await server.connect(transport);\n' +
          '});',
      },
      {
        name: 'a stateful transport at module level (single-session server)',
        code:
          SDK +
          'const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => randomUUID() });',
      },
      {
        name: 'sessionIdGenerator held in a variable is not stateless',
        code:
          SDK +
          'const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: makeId });',
      },
      {
        name: 'a shadowed `undefined` is not the global',
        code:
          SDK +
          SHARED_SERVER +
          'export async function handle(undefined) {\n' +
          '  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });\n' +
          '  await server.connect(transport);\n' +
          '}',
      },
      {
        name: 'options by reference — abstain',
        code:
          SDK +
          'const OPTIONS = { sessionIdGenerator: undefined };\nconst transport = new StreamableHTTPServerTransport(OPTIONS);',
      },
      {
        name: 'options with a spread — abstain',
        code:
          SDK +
          'const transport = new StreamableHTTPServerTransport({ ...base });',
      },
      {
        name: 'options with a computed key — abstain',
        code:
          SDK +
          'const transport = new StreamableHTTPServerTransport({ [key]: value });',
      },
      {
        name: 'an SSEServerTransport has no stateless mode',
        code:
          SDK +
          "import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';\n" +
          "const transport = new SSEServerTransport('/messages', res);",
      },
      {
        name: 'a local class named StreamableHTTPServerTransport is not the SDK',
        code:
          "import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';\n" +
          'class StreamableHTTPServerTransport { constructor(o) {} }\n' +
          'const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });',
      },
      {
        name: 'the same option on a non-MCP constructor',
        code:
          SDK +
          "import { Session } from 'some-session-lib';\n" +
          'const session = new Session({ sessionIdGenerator: undefined });',
      },
      {
        name: 'a file that never imports the MCP SDK',
        code:
          "import { StreamableHTTPServerTransport } from './transport';\n" +
          'const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });',
      },
      {
        name: 'a class field is per instance, not module level',
        code: SDK + `export class Session { transport = ${STATELESS}; }`,
      },
      {
        name: 'connect() on a non-MCP receiver (pg Pool)',
        code:
          SDK +
          "import { Pool } from 'pg';\n" +
          'const pool = new Pool();\n' +
          'const client = await pool.connect();\n' +
          "app.post('/mcp', async (req, res) => {\n" +
          `  const transport = ${STATELESS};\n` +
          '  await pool.connect(transport);\n' +
          '});',
      },
      {
        name: 'connect() on a receiver that cannot be resolved',
        code:
          SDK +
          'export async function handle(server, req, res) {\n' +
          `  const transport = ${STATELESS};\n` +
          '  await server.connect(transport);\n' +
          '}',
      },
      {
        name: 'connect() with a transport that cannot be resolved',
        code:
          SDK +
          SHARED_SERVER +
          'export async function handle(transport) { await server.connect(transport); }',
      },
      {
        name: 'connect() with a stateful transport per request',
        code:
          SDK +
          SHARED_SERVER +
          "app.post('/mcp', async (req, res) => {\n" +
          '  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => randomUUID() });\n' +
          '  await server.connect(transport);\n' +
          '});',
      },
      {
        name: 'connect() of a different MCP export (a Client) is not a server',
        code:
          SDK +
          "import { Client } from '@modelcontextprotocol/sdk/client/index.js';\n" +
          "const client = new Client({ name: 'c', version: '1' });\n" +
          "app.post('/mcp', async (req, res) => {\n" +
          `  const transport = ${STATELESS};\n` +
          '  await client.connect(transport);\n' +
          '});',
      },
      {
        name: 'a computed connect member is not read',
        code:
          SDK +
          SHARED_SERVER +
          "app.post('/mcp', async (req, res) => {\n" +
          `  const transport = ${STATELESS};\n` +
          '  await server[method](transport);\n' +
          '});',
      },
    ],
    invalid: [
      {
        // @found mcp-sdk-security FP/FN audit 2026-10-10, backlog item 5 (shared stateless transport, CVE-2026-25536)
        name: 'FN: a stateless transport created once at module level',
        code:
          SDK +
          SHARED_SERVER +
          `const transport = ${STATELESS};\n` +
          'await server.connect(transport);\n' +
          "app.post('/mcp', (req, res) => transport.handleRequest(req, res, req.body));",
        errors: [moduleLevel('StreamableHTTPServerTransport')],
      },
      {
        // @found mcp-sdk-security FP/FN audit 2026-10-10, backlog item 5 (shared stateless transport, CVE-2026-25536)
        name: 'FN: a module-level McpServer connected to a per-request stateless transport',
        code:
          SDK +
          SHARED_SERVER +
          "app.post('/mcp', async (req, res) => {\n" +
          `  const transport = ${STATELESS};\n` +
          '  await server.connect(transport);\n' +
          '  await transport.handleRequest(req, res, req.body);\n' +
          '});',
        errors: [sharedServer('McpServer')],
      },
      {
        name: 'a stateless transport with no options at module level',
        code: SDK + 'const transport = new StreamableHTTPServerTransport();',
        errors: [moduleLevel('StreamableHTTPServerTransport')],
      },
      {
        name: 'options that omit sessionIdGenerator are stateless',
        code:
          SDK +
          'const transport = new StreamableHTTPServerTransport({ enableJsonResponse: true });',
        errors: [moduleLevel('StreamableHTTPServerTransport')],
      },
      {
        name: "SDK v2 NodeStreamableHTTPServerTransport ('@modelcontextprotocol/node') at module level",
        code:
          "import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';\n" +
          'const transport = new NodeStreamableHTTPServerTransport({ sessionIdGenerator: undefined });',
        errors: [moduleLevel('NodeStreamableHTTPServerTransport')],
      },
      {
        name: "SDK v2 WebStandardStreamableHTTPServerTransport with a module-level McpServer ('@modelcontextprotocol/server')",
        code:
          "import { McpServer, WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/server';\n" +
          "const server = new McpServer({ name: 'demo', version: '1.0.0' });\n" +
          'export default { async fetch(request) {\n' +
          '  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined });\n' +
          '  await server.connect(transport);\n' +
          '  return transport.handleRequest(request);\n' +
          '} };',
        errors: [sharedServer('McpServer')],
      },
      {
        name: 'the low-level Server shared across requests',
        code:
          "import { Server } from '@modelcontextprotocol/sdk/server/index.js';\n" +
          "import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';\n" +
          "const server = new Server({ name: 'demo', version: '1.0.0' }, { capabilities: {} });\n" +
          "app.post('/mcp', async (req, res) => {\n" +
          `  const transport = ${STATELESS};\n` +
          '  await server.connect(transport);\n' +
          '});',
        errors: [sharedServer('Server')],
      },
      {
        name: 'the transport built inline in connect()',
        code:
          SDK +
          SHARED_SERVER +
          "app.post('/mcp', async (req, res) => {\n" +
          `  await server.connect(${STATELESS});\n` +
          '});',
        errors: [sharedServer('McpServer')],
      },
      {
        name: 'a named route handler',
        code:
          SDK +
          SHARED_SERVER +
          'async function handleMcp(req, res) {\n' +
          `  const transport = ${STATELESS};\n` +
          '  await server.connect(transport);\n' +
          '}\n' +
          "app.post('/mcp', handleMcp);",
        errors: [sharedServer('McpServer')],
      },
      {
        name: 'CommonJS require',
        code:
          "const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');\n" +
          "const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');\n" +
          "const server = new McpServer({ name: 'demo', version: '1.0.0' });\n" +
          "app.post('/mcp', async (req, res) => {\n" +
          `  const transport = ${STATELESS};\n` +
          '  await server.connect(transport);\n' +
          '});',
        errors: [sharedServer('McpServer')],
      },
      {
        name: 'a server built in an outer function and shared by the per-request inner one',
        code:
          SDK +
          'export function mount(app) {\n' +
          "  const server = new McpServer({ name: 'demo', version: '1.0.0' });\n" +
          "  app.post('/mcp', async (req, res) => {\n" +
          `    const transport = ${STATELESS};\n` +
          '    await server.connect(transport);\n' +
          '  });\n' +
          '}',
        errors: [sharedServer('McpServer')],
      },
    ],
  });
});
