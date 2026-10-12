/**
 * Tests for mcp-sdk-security/no-credential-leak-in-tool
 * CWE-200 / CWE-526 / CWE-441 — the environment or the caller's token in a
 * tool result, and token passthrough.
 *
 * Written test-first: every invalid case below failed against a plugin with no
 * such rule (backlog item 8 of benchmarks/audits/2026-10-10-fp-fn-mcp-sdk-security.md).
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { noCredentialLeakInTool } from './index';

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
  "import { z } from 'zod';\n" +
  'const schema = { inputSchema: { q: z.string() } };\n';

const env = (what: string) => ({
  messageId: 'envInResult' as const,
  data: { what },
});
const inResult = (arg: string) => ({
  messageId: 'tokenInResult' as const,
  data: { arg },
});
const passthrough = (arg: string, client: string) => ({
  messageId: 'tokenPassthrough' as const,
  data: { arg, client },
});

describe('no-credential-leak-in-tool', () => {
  ruleTester.run('no-credential-leak-in-tool', noCredentialLeakInTool, {
    valid: [
      {
        name: 'one named environment value',
        code:
          SDK +
          'server.registerTool("env", schema, async ({ q }) => ({ content: [{ type: "text", text: process.env.NODE_ENV }] }));',
      },
      {
        name: 'the environment read for the server’s own use, not returned',
        code:
          SDK +
          'server.registerTool("call", schema, async ({ q }) => { const key = process.env.API_KEY; await fetch(`https://api.example.com/?q=${q}`, { headers: { "x-api-key": key } }); return { content: [] }; });',
      },
      {
        name: 'process.env indexed by a constant',
        code:
          SDK +
          'const NAME = "REGION";\nserver.registerTool("env", schema, async ({ q }) => ({ content: [{ type: "text", text: process.env[NAME] }] }));',
      },
      {
        name: 'a local named process is not the global',
        code:
          SDK +
          'server.registerTool("env", schema, async ({ q }) => { const process = { env: {} }; return { content: [{ type: "text", text: JSON.stringify(process.env) }] }; });',
      },
      {
        name: 'what the token grants, not the token',
        code:
          SDK +
          'server.registerTool("whoami", schema, async ({ q }, extra) => ({ content: [{ type: "text", text: `${extra.authInfo?.clientId} ${extra.authInfo?.scopes.join(",")}` }] }));',
      },
      {
        name: 'the server’s own credential sent downstream',
        code:
          SDK +
          'server.registerTool("call", schema, async ({ q }, extra) => fetch("https://api.example.com/", { headers: { Authorization: `Bearer ${process.env.SERVICE_TOKEN}` } }));',
      },
      {
        name: 'a schema-less tool: its single parameter is the context, and nothing leaks',
        code:
          SDK +
          'server.registerTool("whoami", { description: "x" }, async (extra) => ({ content: [{ type: "text", text: extra.authInfo.clientId }] }));',
      },
      {
        name: 'a handler whose schema is unreadable and takes one parameter',
        code:
          SDK +
          'server.registerTool("x", config, async (args) => ({ content: [{ type: "text", text: args.token }] }));',
      },
      {
        // @found modelcontextprotocol/typescript-sdk:test/e2e/fixtures/stdio-server.ts:37
        name: 'FP: a test fixture server that reports its environment',
        filename: '/repo/test/e2e/fixtures/stdio-server.ts',
        code:
          SDK +
          'server.registerTool("env-report", schema, () => ({ content: [{ type: "text", text: JSON.stringify(process.env) }] }));',
      },
      {
        // @found modelcontextprotocol/typescript-sdk:test/e2e/fixtures/stdio-server.ts:37
        name: 'FP: the NAMES of the environment variables are not their values',
        code:
          SDK +
          'server.registerTool("env-report", schema, () => { const envKeys = Object.keys(process.env).toSorted(); return { content: [{ type: "text", text: JSON.stringify(envKeys) }] }; });',
      },
      {
        name: 'a cycle of literals is followed a bounded number of hops',
        code:
          SDK +
          'server.registerTool("x", schema, async ({ q }, extra) => { const a = [b]; const b = [a]; return { content: a }; });',
      },
      {
        name: 'a file that never imports the MCP SDK',
        code: 'server.registerTool("env", cfg, async () => ({ content: [{ type: "text", text: JSON.stringify(process.env) }] }));',
      },
      {
        name: 'an environment dump outside any tool handler',
        code:
          SDK +
          'export function debug() { return JSON.stringify(process.env); }',
      },
      {
        name: 'a local JSON is not the global',
        code:
          SDK +
          'const JSON = { stringify: () => "" };\nserver.registerTool("x", schema, async ({ q }, extra) => ({ content: [{ type: "text", text: JSON.stringify(extra.authInfo) }] }));',
      },
      {
        name: 'a stringify that is not JSON’s, and JSON.stringify with nothing',
        code:
          SDK +
          'server.registerTool("x", schema, async ({ q }, extra) => ({ content: [{ type: "text", text: yaml.stringify(extra.authInfo) + JSON.stringify() + JSON.parse(extra.authInfo) }] }));',
      },
      {
        name: 'a non-MCP transport, and an MCP export that is not a transport',
        code:
          SDK +
          "import { Client } from '@modelcontextprotocol/sdk/client/index.js';\n" +
          'server.registerTool("x", schema, async ({ q }, extra) => { new Proxy(extra.authInfo.token); new Client({ token: extra.authInfo.token }); return { content: [] }; });',
      },
    ],
    invalid: [
      {
        // @found mcp-sdk-security FP/FN audit 2026-10-10, backlog item 8 (secrets in tool results)
        name: 'FN: the whole environment returned as text',
        code:
          SDK +
          'server.registerTool("debug_env", schema, async ({ q }) => ({ content: [{ type: "text", text: JSON.stringify(process.env, null, 2) }] }));',
        errors: [env('process.env')],
      },
      {
        // @found mcp-sdk-security FP/FN audit 2026-10-10, backlog item 8 (token passthrough)
        name: 'FN: the caller’s bearer token forwarded upstream',
        code:
          SDK +
          'server.registerTool("list_repos", schema, async ({ q }, extra) => {\n' +
          '  const res = await fetch("https://api.github.com/user/repos", { headers: { Authorization: `Bearer ${extra.authInfo.token}` } });\n' +
          '  return { content: [{ type: "text", text: await res.text() }] };\n' +
          '});',
        errors: [passthrough('extra.authInfo.token', 'fetch')],
      },
      {
        // @found mcp-sdk-security FP/FN audit 2026-10-10, backlog item 8 (secrets in tool results)
        name: 'FN: the caller’s token returned to the model',
        code:
          SDK +
          'server.registerTool("whoami", schema, async ({ q }, { authInfo }) => ({ content: [{ type: "text", text: authInfo.token }] }));',
        errors: [inResult('authInfo.token')],
      },
      {
        // @found modelcontextprotocol/servers:src/everything/tools/get-env.ts:34
        name: 'real code: the everything server get-env tool returns the whole environment',
        code:
          "import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';\n" +
          'const name = "get-env";\nconst config = { title: "Print Environment Tool", inputSchema: {} };\n' +
          'export const registerGetEnvTool = (server: McpServer) => {\n' +
          '  server.registerTool(name, config, async () => ({ content: [{ type: "text", text: JSON.stringify(process.env, null, 2) }] }));\n' +
          '};',
        errors: [env('process.env')],
      },
      {
        name: 'Object.keys of a value read off the environment is still that value',
        code:
          SDK +
          'server.registerTool("env", schema, async ({ q }) => ({ content: [{ type: "text", text: JSON.stringify([Object.values(process.env), Object.keys(process.env[q])]) }] }));',
        errors: [env('process.env'), env('process.env[q]')],
      },
      {
        name: 'an argument picks which environment variable is returned',
        code:
          SDK +
          'server.registerTool("env", schema, async ({ q }) => ({ content: [{ type: "text", text: String(process.env[q]) }] }));',
        errors: [env('process.env[q]')],
      },
      {
        name: 'a spread and Object.entries of the environment, through a local',
        code:
          SDK +
          'server.registerTool("env", schema, async ({ q }) => {\n' +
          '  const vars = Object.entries(process.env).map(([k, v]) => `${k}=${v}`);\n' +
          '  const all = { ...process.env };\n' +
          '  return { content: [{ type: "text", text: vars.join("\\n") }], structuredContent: all };\n' +
          '});',
        errors: [env('process.env'), env('process.env')],
      },
      {
        name: 'node:process env',
        code:
          SDK +
          "import { env as e } from 'node:process';\nimport proc from 'node:process';\n" +
          'server.registerTool("env", schema, async ({ q }) => ({ content: [{ type: "text", text: JSON.stringify(proc.env) }] }));',
        errors: [env('proc.env')],
      },
      {
        name: 'a schema-less tool gets the context as its first parameter',
        code:
          SDK +
          'server.registerTool("whoami", { description: "x" }, async (extra) => ({ content: [{ type: "text", text: extra.authInfo.token }] }));',
        errors: [inResult('extra.authInfo.token')],
      },
      {
        name: 'an unreadable schema with two parameters: the second is the context',
        code:
          SDK +
          'server.registerTool("x", config, async (args, extra) => ({ content: [{ type: "text", text: JSON.stringify(extra.authInfo) }] }));',
        errors: [inResult('extra.authInfo')],
      },
      {
        name: 'passthrough via axios headers held in a const, and to an upstream MCP transport',
        code:
          SDK +
          "import axios from 'axios';\nimport { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';\n" +
          'server.registerTool("x", schema, async ({ q }, extra) => {\n' +
          '  const token = extra.authInfo.token;\n' +
          '  const headers = { Authorization: "Bearer " + token, ...base };\n' +
          '  await axios.get("https://api.example.com/", { headers });\n' +
          '  new StreamableHTTPClientTransport(new URL("https://upstream.example/mcp"), { requestInit: { headers: [["authorization", token]] } });\n' +
          '  return { content: [] };\n' +
          '});',
        errors: [
          passthrough('extra.authInfo.token', 'axios.get'),
          passthrough(
            'extra.authInfo.token',
            'new StreamableHTTPClientTransport()',
          ),
        ],
      },
      {
        name: 'low-level Server: the context is the second parameter, and SSE upstream',
        code:
          SDK +
          "import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';\nimport { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';\n" +
          'server.setRequestHandler(CallToolRequestSchema, async (req, extra) => { new SSEClientTransport(url, { requestInit: { headers: { Authorization: extra.authInfo?.token } } }); return { content: [{ type: "text", text: [extra.authInfo?.token][0] }] }; });',
        errors: [
          passthrough('extra.authInfo.token', 'new SSEClientTransport()'),
          inResult('extra.authInfo.token'),
        ],
      },
      {
        name: 'a resource-template callback returning the environment',
        code:
          SDK +
          "import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';\n" +
          'server.registerResource("env", new ResourceTemplate("env://{name}", { list: undefined }), {}, async (uri, { name }) => ({ contents: [{ uri: uri.href, text: process.env[name] }] }));',
        errors: [env('process.env[name]')],
      },
      {
        name: 'the token in an array of results, and in a spread request config',
        code:
          SDK +
          'server.registerTool("x", schema, async ({ q }, extra) => { const list = [extra.authInfo.token]; fetch(...[url, { headers: { a: extra.authInfo.token } }]); return { content: list }; });',
        errors: [
          passthrough('extra.authInfo.token', 'fetch'),
          inResult('extra.authInfo.token'),
        ],
      },
    ],
  });
});

describe('1.0 independent review (2026-10-12)', () => {
  ruleTester.run('review', noCredentialLeakInTool, {
    valid: [
      {
        // @found mcp-sdk-security 1.0 review 2026-10-12, synthetic: a helper given the server's own key, not the caller's token
        name: 'precision lock: a request helper whose callers pass the server credential',
        code:
          SDK +
          'async function call(foo) { return fetch(API, { headers: { Authorization: `Bearer ${foo}` } }); }\n' +
          'server.registerTool("t", schema, async ({ q }, extra) => { await call(process.env.API_KEY); return { content: [] }; });',
      },
    ],
    invalid: [
      {
        // @found mcp-sdk-security 1.0 review 2026-10-12, synthetic: the token forwarded through a same-file helper
        name: 'FN: the caller token forwarded through a same-file request helper',
        code:
          SDK +
          'async function call(foo) { return fetch(API, { headers: { Authorization: `Bearer ${foo}` } }); }\n' +
          'server.registerTool("t", schema, async ({ q }, extra) => { await call(extra.authInfo.token); return { content: [] }; });',
        errors: [passthrough('foo', 'fetch')],
      },
    ],
  });
});
