/**
 * Tests for mcp-sdk-security/require-http-transport-hardening
 * CWE-346 / CWE-306 — an MCP HTTP transport with no Host validation, an
 * all-interfaces express app with no allowedHosts, and a network-reachable
 * server that nothing authenticates.
 *
 * Written test-first: every invalid case below failed against a stub rule
 * (backlog item 3 of benchmarks/audits/2026-10-10-fp-fn-mcp-sdk-security.md).
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { requireHttpTransportHardening } from './index';

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

const STREAMABLE =
  "import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';\n" +
  "import { randomUUID } from 'node:crypto';\n";
const SSE =
  "import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';\n";
const EXPRESS_APP =
  "import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';\n";
const HOST_MW =
  "import { hostHeaderValidation, localhostHostValidation } from '@modelcontextprotocol/sdk/server/middleware/hostHeaderValidation.js';\n";
const AUTH =
  "import { requireBearerAuth } from '@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js';\n" +
  "import { mcpAuthRouter, mcpAuthMetadataRouter } from '@modelcontextprotocol/sdk/server/auth/router.js';\n";

/** Options that turn the transport's own Host validation on. */
const HARDENED =
  "{ sessionIdGenerator: () => randomUUID(), enableDnsRebindingProtection: true, allowedHosts: ['127.0.0.1'] }";
/** A hardened transport, so only the network/auth checks are in play. */
const HARDENED_TRANSPORT =
  STREAMABLE +
  `const transport = new StreamableHTTPServerTransport(${HARDENED});\n`;

const rebinding = (transport: string) => ({
  messageId: 'missingRebindingProtection' as const,
  data: { transport },
});
const allInterfaces = (host: string, factory = 'createMcpExpressApp') => ({
  messageId: 'allInterfacesWithoutAllowedHosts' as const,
  data: { factory, host },
});
const unvalidatedApp = (framework: string) => ({
  messageId: 'appWithoutHostValidation' as const,
  data: { framework },
});
const missingAuth = (host: string) => ({
  messageId: 'missingAuth' as const,
  data: { host },
});

/** createMcpExpressApp hosts the SDK guards with localhostHostValidation. */
const LOOPBACK_HOSTS = ['127.0.0.1', 'localhost', '::1'];
/** Hosts that bind every interface. */
const ALL_INTERFACE_HOSTS = ['0.0.0.0', '::'];
/** The SDK's auth exports. */
const AUTH_EXPORTS = [
  'requireBearerAuth',
  'mcpAuthRouter',
  'mcpAuthMetadataRouter',
];

describe('require-http-transport-hardening', () => {
  ruleTester.run(
    'require-http-transport-hardening',
    requireHttpTransportHardening,
    {
      valid: [
        {
          name: 'a Streamable HTTP transport with enableDnsRebindingProtection and allowedHosts',
          code: HARDENED_TRANSPORT,
        },
        {
          name: 'an SSEServerTransport with its options (the 3rd argument) hardened',
          code:
            SSE +
            "const t = new SSEServerTransport('/messages', res, { enableDnsRebindingProtection: true, allowedHosts: ['localhost'], allowedOrigins: ['http://localhost'] });",
        },
        {
          name: 'allowedHosts held in a const',
          code:
            STREAMABLE +
            "const HOSTS = ['mcp.example.com'];\n" +
            'new StreamableHTTPServerTransport({ enableDnsRebindingProtection: true, allowedHosts: HOSTS });',
        },
        {
          name: 'the whole options object held in a const',
          code:
            STREAMABLE +
            `const OPTIONS = ${HARDENED};\n` +
            'new StreamableHTTPServerTransport(OPTIONS);',
        },
        {
          name: 'options that are a parameter — cannot be read, abstain',
          code:
            STREAMABLE +
            'export function make(opts) { return new StreamableHTTPServerTransport(opts); }',
        },
        {
          name: 'options built by a call — cannot be read, abstain',
          code:
            STREAMABLE + 'new StreamableHTTPServerTransport(buildOptions());',
        },
        {
          name: 'options with a spread — the spread may carry the protection, abstain',
          code:
            STREAMABLE +
            'new StreamableHTTPServerTransport({ ...base, sessionIdGenerator: undefined });',
        },
        {
          name: 'options with a computed key — it may name any option, abstain',
          code:
            STREAMABLE +
            'new StreamableHTTPServerTransport({ [flagName]: true, sessionIdGenerator: undefined });',
        },
        {
          name: 'options passed as a spread argument — abstain',
          code: STREAMABLE + 'new StreamableHTTPServerTransport(...args);',
        },
        {
          name: 'enableDnsRebindingProtection decided at runtime — abstain',
          code:
            STREAMABLE +
            "new StreamableHTTPServerTransport({ enableDnsRebindingProtection: process.env.REBIND === '1', allowedHosts: ['a.example'] });",
        },
        {
          name: 'allowedHosts computed at runtime — abstain',
          code:
            STREAMABLE +
            "new StreamableHTTPServerTransport({ enableDnsRebindingProtection: true, allowedHosts: process.env.HOSTS.split(',') });",
        },
        {
          name: 'the file mounts hostHeaderValidation — the app validates Host',
          code:
            HOST_MW +
            STREAMABLE +
            "app.use(hostHeaderValidation(['mcp.example.com']));\n" +
            'new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });',
        },
        {
          name: 'the file mounts localhostHostValidation — the app validates Host',
          code:
            HOST_MW +
            SSE +
            'app.use(localhostHostValidation());\n' +
            "new SSEServerTransport('/messages', res);",
        },
        {
          name: 'createMcpExpressApp() with the default host validates Host',
          code:
            EXPRESS_APP +
            STREAMABLE +
            'const app = createMcpExpressApp();\n' +
            'new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });',
        },
        ...LOOPBACK_HOSTS.map((host) => ({
          name: `createMcpExpressApp on loopback host ${host} validates Host`,
          code:
            EXPRESS_APP +
            STREAMABLE +
            `const app = createMcpExpressApp({ host: '${host}' });\n` +
            'new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });',
        })),
        {
          name: 'createMcpExpressApp with no host option uses the loopback default',
          code:
            EXPRESS_APP +
            STREAMABLE +
            "const app = createMcpExpressApp({ name: 'x' });\n" +
            'new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });',
        },
        {
          name: 'createMcpExpressApp on 0.0.0.0 with allowedHosts validates Host',
          code:
            EXPRESS_APP +
            STREAMABLE +
            "const app = createMcpExpressApp({ host: '0.0.0.0', allowedHosts: ['mcp.example.com'] });\n" +
            'new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });',
        },
        {
          name: 'createMcpExpressApp options that cannot be read — abstain',
          code:
            EXPRESS_APP +
            STREAMABLE +
            'const app = createMcpExpressApp(appOptions());\n' +
            'new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });',
        },
        {
          name: 'createMcpExpressApp options with a spread — abstain',
          code:
            EXPRESS_APP +
            "const app = createMcpExpressApp({ ...base, host: '0.0.0.0' });",
        },
        {
          name: 'createMcpExpressApp host from the environment — abstain',
          code:
            EXPRESS_APP +
            'const app = createMcpExpressApp({ host: process.env.HOST });',
        },
        {
          name: 'a file that never imports the MCP SDK',
          code:
            "import { StreamableHTTPServerTransport } from './transport';\n" +
            'new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });',
        },
        {
          name: 'a local class named StreamableHTTPServerTransport is not the SDK',
          code:
            "import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';\n" +
            'class StreamableHTTPServerTransport { constructor(o) {} }\n' +
            'new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });',
        },
        {
          name: 'the same option names on a non-MCP constructor',
          code:
            "import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';\n" +
            "import { Proxy } from 'some-proxy';\n" +
            'new Proxy({ enableDnsRebindingProtection: false, allowedHosts: [] });',
        },
        {
          name: 'a createMcpExpressApp that is not the SDK export',
          code:
            "import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';\n" +
            "import { createMcpExpressApp } from './app';\n" +
            "const app = createMcpExpressApp({ host: '0.0.0.0' });\napp.listen(3000, '0.0.0.0');",
        },
        ...AUTH_EXPORTS.map((name) => ({
          name: `a network bind with the SDK auth export ${name} in the file`,
          code:
            AUTH +
            HARDENED_TRANSPORT +
            `app.post('/mcp', ${name}({ verifier }), (req, res) => transport.handleRequest(req, res));\n` +
            "app.listen(3000, '0.0.0.0');",
        })),
        {
          name: 'a network bind with custom middleware mounted by identifier',
          code:
            HARDENED_TRANSPORT +
            "app.use(authenticate);\napp.listen(3000, '0.0.0.0');",
        },
        {
          name: 'a network bind with custom middleware mounted inline',
          code:
            HARDENED_TRANSPORT +
            'app.use((req, res, next) => (req.headers.authorization === expected ? next() : res.sendStatus(401)));\n' +
            "app.listen(3000, '0.0.0.0');",
        },
        {
          name: 'a network bind where the MCP route carries a middleware argument',
          code:
            HARDENED_TRANSPORT +
            "app.post('/mcp', checkToken, async (req, res) => { await transport.handleRequest(req, res, req.body); });\n" +
            "app.listen(3000, '0.0.0.0');",
        },
        {
          name: 'a network bind where a named MCP route handler is mounted behind middleware',
          code:
            HARDENED_TRANSPORT +
            'async function handle(req, res) { await transport.handleRequest(req, res); }\n' +
            "app.post('/mcp', checkToken, handle);\n" +
            "app.listen(3000, '0.0.0.0');",
        },
        {
          name: 'a network bind where a const-arrow MCP route handler is mounted behind middleware',
          code:
            HARDENED_TRANSPORT +
            'const handle = async (req, res) => { await transport.handleRequest(req, res); };\n' +
            'export { handle };\n' +
            "app.post('/mcp', checkToken, handle);\n" +
            "app.listen(3000, '0.0.0.0');",
        },
        {
          name: 'a bind on loopback is not network-reachable',
          code: HARDENED_TRANSPORT + "app.listen(3000, '127.0.0.1');",
        },
        {
          name: 'a bind with no host argument is not an explicit all-interfaces bind',
          code: HARDENED_TRANSPORT + 'app.listen(3000);',
        },
        {
          name: 'a bind whose host cannot be read',
          code: HARDENED_TRANSPORT + 'app.listen(3000, process.env.HOST);',
        },
        {
          name: 'an all-interfaces bind in a file with no MCP HTTP transport',
          code:
            "import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';\n" +
            "import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';\n" +
            "const server = new McpServer({ name: 'x', version: '1' });\n" +
            "app.post('/mcp', (req, res) => isInitializeRequest(req.body));\n" +
            "app.listen(3000, '0.0.0.0');",
        },
        // ---- SDK v2 and test files: the 2026-10-11 real-code scan.
        {
          // (was: invalid) SDK v2 transports have no enableDnsRebindingProtection
          // option — the app validates Host. With no app in the file there is
          // nothing to judge.
          name: "SDK v2 NodeStreamableHTTPServerTransport ('@modelcontextprotocol/node') on its own",
          code:
            "import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';\n" +
            'const t = new NodeStreamableHTTPServerTransport();',
        },
        {
          // (was: invalid) as above, for the web-standard transport.
          name: "SDK v2 WebStandardStreamableHTTPServerTransport ('@modelcontextprotocol/server') on its own",
          code:
            "import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/server';\n" +
            'const t = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined });',
        },
        {
          // @found modelcontextprotocol/typescript-sdk:examples/guides/serving/sessions-state-scaling.examples.ts:64
          name: 'FP: an SDK v2 transport wired into an Express app passed in as a parameter',
          code:
            "import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';\n" +
            "import type { Express } from 'express';\n" +
            'function sessionsRouting(app: Express) {\n' +
            "  app.post('/mcp', async (req, res) => {\n" +
            '    const transport = new NodeStreamableHTTPServerTransport({ sessionIdGenerator: () => crypto.randomUUID() });\n' +
            '    await transport.handleRequest(req, res, req.body);\n' +
            '  });\n' +
            '}',
        },
        {
          // @found modelcontextprotocol/typescript-sdk:examples/guides/serving/sessions-state-scaling.examples.ts:21
          name: 'FP: an SDK v2 transport built at module level with no app in the file',
          code:
            "import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';\n" +
            "import { randomUUID } from 'node:crypto';\n" +
            'const transport = new NodeStreamableHTTPServerTransport({ sessionIdGenerator: () => randomUUID() });',
        },
        {
          // @found modelcontextprotocol/typescript-sdk:test/e2e/helpers/index.ts:264
          name: 'FP: an SDK v2 transport in a test helper',
          filename: '/repo/test/e2e/helpers/index.ts',
          code:
            "import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/server';\n" +
            "import { Hono } from 'hono';\n" +
            'const app = new Hono();\n' +
            "app.all('/mcp', (c) => new WebStandardStreamableHTTPServerTransport().handleRequest(c.req.raw));",
        },
        {
          // @found modelcontextprotocol/typescript-sdk:test/integration/test/server.test.ts:1968
          name: 'FP: createMcpExpressApp on 0.0.0.0 inside a test file',
          filename: '/repo/test/integration/test/server.test.ts',
          code:
            EXPRESS_APP +
            "const app = createMcpExpressApp({ host: '0.0.0.0' });",
        },
        {
          // @found modelcontextprotocol/typescript-sdk:test/integration/test/stateManagementStreamableHttp.test.ts:62
          name: 'FP: a v1 transport in a *.test.ts file',
          filename: '/repo/src/transport.test.ts',
          code:
            STREAMABLE +
            'new StreamableHTTPServerTransport({ sessionIdGenerator: () => randomUUID() });',
        },
        {
          name: 'an SDK v2 Express app from createMcpExpressApp() — localhost validation by default',
          code:
            "import { createMcpExpressApp } from '@modelcontextprotocol/express';\n" +
            "import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';\n" +
            'const app = createMcpExpressApp();\n' +
            "app.post('/mcp', async (req, res) => { await new NodeStreamableHTTPServerTransport().handleRequest(req, res, req.body); });",
        },
        {
          name: 'a raw SDK v2 Express app that mounts hostHeaderValidation',
          code:
            "import { hostHeaderValidation } from '@modelcontextprotocol/express';\n" +
            "import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';\n" +
            "import express from 'express';\n" +
            'const app = express();\n' +
            "app.use(hostHeaderValidation(['mcp.example.com']));\n" +
            "app.post('/mcp', async (req, res) => { await new NodeStreamableHTTPServerTransport().handleRequest(req, res, req.body); });",
        },
        {
          name: 'a raw SDK v2 Hono app that mounts localhostHostValidation',
          code:
            "import { localhostHostValidation } from '@modelcontextprotocol/hono';\n" +
            "import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/server';\n" +
            "import { Hono } from 'hono';\n" +
            'const app = new Hono();\n' +
            "app.use('*', localhostHostValidation());\n" +
            "app.all('/mcp', (c) => new WebStandardStreamableHTTPServerTransport().handleRequest(c.req.raw));",
        },
        {
          name: 'a raw Express app that serves no MCP transport',
          code:
            "import { McpServer } from '@modelcontextprotocol/server';\n" +
            "import express from 'express';\n" +
            'const app = express();\n' +
            "app.get('/health', (req, res) => res.send('ok'));",
        },
        {
          name: 'an SDK v2 transport with an express() app that registers no route',
          code:
            "import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';\n" +
            "import express from 'express';\n" +
            'const app = express();\nconst t = new NodeStreamableHTTPServerTransport();',
        },
        {
          name: 'an SDK v2 transport with apps that register no route (references that are not route calls)',
          code:
            "import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';\n" +
            "import express from 'express';\n" +
            'const t = new NodeStreamableHTTPServerTransport();\n' +
            'serve(express());\n' +
            'const app = express();\n' +
            'listenOrExit(app, PORT); table[app] = 1; const getter = app.get; wrap(app.post); app[method]();\n' +
            'app.listen(3000);',
        },
        {
          name: 'createMcpHonoApp and createMcpFastifyApp on loopback',
          code:
            "import { createMcpHonoApp } from '@modelcontextprotocol/hono';\n" +
            "import { createMcpFastifyApp } from '@modelcontextprotocol/fastify';\n" +
            "createMcpHonoApp({ host: 'localhost' });\ncreateMcpFastifyApp();",
        },
        {
          name: 'a listen({ host }) on loopback',
          code:
            HARDENED_TRANSPORT +
            "server.listen({ port: 3000, host: 'localhost' });",
        },
      ],
      invalid: [
        {
          // @found mcp-sdk-security FP/FN audit 2026-10-10, backlog item 3 (HTTP transport hardening)
          name: 'FN: a StreamableHTTPServerTransport without enableDnsRebindingProtection',
          code:
            STREAMABLE +
            'new StreamableHTTPServerTransport({ sessionIdGenerator: () => randomUUID() });',
          errors: [rebinding('StreamableHTTPServerTransport')],
        },
        {
          // @found mcp-sdk-security FP/FN audit 2026-10-10, backlog item 3 (HTTP transport hardening)
          name: 'FN: an SSEServerTransport with no options',
          code:
            SSE +
            "app.get('/sse', (req, res) => { const t = new SSEServerTransport('/messages', res); });",
          errors: [rebinding('SSEServerTransport')],
        },
        {
          // @found mcp-sdk-security FP/FN audit 2026-10-10, backlog item 3 (HTTP transport hardening)
          name: 'FN: createMcpExpressApp on 0.0.0.0 without allowedHosts',
          code:
            EXPRESS_APP +
            "const app = createMcpExpressApp({ host: '0.0.0.0' });",
          errors: [allInterfaces('0.0.0.0')],
        },
        {
          // @found mcp-sdk-security FP/FN audit 2026-10-10, backlog item 3 (HTTP transport hardening)
          name: 'FN: an MCP HTTP server bound to all interfaces with no auth middleware',
          code:
            HARDENED_TRANSPORT +
            "app.post('/mcp', async (req, res) => { await transport.handleRequest(req, res, req.body); });\n" +
            "app.listen(3000, '0.0.0.0');",
          errors: [missingAuth('0.0.0.0')],
        },
        {
          name: 'protection on but no allowedHosts — Host is never compared',
          code:
            STREAMABLE +
            'new StreamableHTTPServerTransport({ enableDnsRebindingProtection: true });',
          errors: [rebinding('StreamableHTTPServerTransport')],
        },
        {
          name: 'allowedHosts set but protection explicitly off',
          code:
            STREAMABLE +
            "new StreamableHTTPServerTransport({ enableDnsRebindingProtection: false, allowedHosts: ['a.example'] });",
          errors: [rebinding('StreamableHTTPServerTransport')],
        },
        {
          name: 'protection off decides it even when allowedHosts cannot be read',
          code:
            STREAMABLE +
            'new StreamableHTTPServerTransport({ enableDnsRebindingProtection: false, allowedHosts: hostList() });',
          errors: [rebinding('StreamableHTTPServerTransport')],
        },
        {
          name: 'an empty allowedHosts validates nothing',
          code:
            STREAMABLE +
            'new StreamableHTTPServerTransport({ enableDnsRebindingProtection: true, allowedHosts: [] });',
          errors: [rebinding('StreamableHTTPServerTransport')],
        },
        {
          // @found modelcontextprotocol/servers:src/everything/transports/streamableHttp.ts:109
          name: 'real code: a v1 Streamable HTTP transport on a raw express app, listening on PORT',
          code:
            STREAMABLE +
            "import express from 'express';\nimport cors from 'cors';\nimport { listenOrExit } from './listen.js';\n" +
            'const app = express();\napp.use(cors({ origin: "*" }));\n' +
            "app.post('/mcp', async (req, res) => {\n" +
            '  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => randomUUID(), eventStore });\n' +
            '  await transport.handleRequest(req, res, req.body);\n' +
            '});\n' +
            'listenOrExit(app, PORT, `listening on ${PORT}`);',
          errors: [rebinding('StreamableHTTPServerTransport')],
        },
        {
          // @found modelcontextprotocol/servers:src/everything/transports/sse.ts:71
          name: 'real code: a v1 SSE transport on a raw express app, listening on PORT',
          code:
            SSE +
            "import express from 'express';\nimport { listenOrExit } from './listen.js';\n" +
            'const app = express();\n' +
            "app.get('/sse', async (req, res) => { const transport = new SSEServerTransport('/message', res); await server.connect(transport); });\n" +
            'listenOrExit(app, PORT, "running");',
          errors: [rebinding('SSEServerTransport')],
        },
        {
          name: "the legacy SSE transport ('@modelcontextprotocol/server-legacy') still carries the option",
          code:
            "import { SSEServerTransport } from '@modelcontextprotocol/server-legacy';\n" +
            "const t = new SSEServerTransport('/messages', res);",
          errors: [rebinding('SSEServerTransport')],
        },
        {
          name: 'SDK v2: a raw express() app serving a Node transport with no Host validation',
          code:
            "import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';\n" +
            "import express from 'express';\n" +
            'const app = express();\n' +
            'app.use(express.json());\n' +
            "app.post('/mcp', async (req, res) => { await new NodeStreamableHTTPServerTransport().handleRequest(req, res, req.body); });",
          errors: [unvalidatedApp('express')],
        },
        {
          name: 'SDK v2: a new Hono() app serving createMcpHandler with no Host validation',
          code:
            "import { createMcpHandler } from '@modelcontextprotocol/server';\n" +
            "import { Hono } from 'hono';\n" +
            'const handler = createMcpHandler(() => buildServer());\n' +
            'const app = new Hono();\n' +
            "app.all('/mcp', (c) => handler(c.req.raw));",
          errors: [unvalidatedApp('hono')],
        },
        ...ALL_INTERFACE_HOSTS.map((host) => ({
          name: `SDK v2 createMcpHonoApp / createMcpFastifyApp on '${host}' without allowedHosts`,
          code:
            "import { createMcpHonoApp } from '@modelcontextprotocol/hono';\n" +
            "import { createMcpFastifyApp } from '@modelcontextprotocol/fastify';\n" +
            `createMcpHonoApp({ host: '${host}' });\ncreateMcpFastifyApp({ host: '${host}' });`,
          errors: [
            allInterfaces(host, 'createMcpHonoApp'),
            allInterfaces(host, 'createMcpFastifyApp'),
          ],
        })),
        {
          name: 'options held in a const that leaves protection off',
          code:
            STREAMABLE +
            'const OPTIONS = { sessionIdGenerator: () => randomUUID() };\n' +
            'new StreamableHTTPServerTransport(OPTIONS);',
          errors: [rebinding('StreamableHTTPServerTransport')],
        },
        {
          name: 'SSEServerTransport options without allowedHosts',
          code:
            SSE +
            "new SSEServerTransport('/messages', res, { enableDnsRebindingProtection: true, allowedOrigins: ['http://localhost'] });",
          errors: [rebinding('SSEServerTransport')],
        },
        {
          name: 'CommonJS require of the transport',
          code:
            "const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');\n" +
            'new StreamableHTTPServerTransport({});',
          errors: [rebinding('StreamableHTTPServerTransport')],
        },
        {
          name: 'createMcpExpressApp on a LAN address applies no Host validation',
          code:
            EXPRESS_APP +
            STREAMABLE +
            "const app = createMcpExpressApp({ host: '192.168.1.10' });\n" +
            'new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });',
          errors: [rebinding('StreamableHTTPServerTransport')],
        },
        ...ALL_INTERFACE_HOSTS.map((host) => ({
          name: `createMcpExpressApp host '${host}' held in a const`,
          code:
            EXPRESS_APP +
            `const HOST = '${host}';\n` +
            'const app = createMcpExpressApp({ host: HOST });',
          errors: [allInterfaces(host)],
        })),
        {
          name: 'createMcpExpressApp on 0.0.0.0 with an unhardened transport: all three findings',
          code:
            EXPRESS_APP +
            STREAMABLE +
            "const app = createMcpExpressApp({ host: '0.0.0.0' });\n" +
            'const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });',
          errors: [
            allInterfaces('0.0.0.0'),
            missingAuth('0.0.0.0'),
            rebinding('StreamableHTTPServerTransport'),
          ],
        },
        ...ALL_INTERFACE_HOSTS.map((host) => ({
          name: `listen(port, '${host}') through a const host, no auth`,
          code:
            HARDENED_TRANSPORT +
            `const HOST = '${host}';\nhttpServer.listen(PORT, HOST, () => {});`,
          errors: [missingAuth(host)],
        })),
        {
          name: 'listen({ host: 0.0.0.0 }) object form, no auth',
          code:
            HARDENED_TRANSPORT +
            "fastify.listen({ port: 3000, host: '0.0.0.0' });",
          errors: [missingAuth('0.0.0.0')],
        },
        {
          name: 'body-parser and other factory middleware are not authentication',
          code:
            HARDENED_TRANSPORT +
            'app.use(express.json());\n' +
            "app.listen(3000, '0.0.0.0');",
          errors: [missingAuth('0.0.0.0')],
        },
        {
          name: 'a named MCP route handler mounted with no middleware',
          code:
            HARDENED_TRANSPORT +
            'async function handle(req, res) { await transport.handleRequest(req, res); }\n' +
            "app.post('/mcp', handle);\n" +
            'const alias = handle;\n' +
            "app.listen(3000, '0.0.0.0');",
          errors: [missingAuth('0.0.0.0')],
        },
        {
          name: 'handleRequest inside an IIFE and an object method is no route registration',
          code:
            HARDENED_TRANSPORT +
            'const routes = { async mcp(req, res) { await transport.handleRequest(req, res); } };\n' +
            '(async () => { await transport.handleRequest(req0, res0); })();\n' +
            "app.listen(3000, '0.0.0.0');",
          errors: [missingAuth('0.0.0.0')],
        },
      ],
    },
  );
});
