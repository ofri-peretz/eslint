/**
 * Tests for mcp-sdk-security/no-ssrf-in-tool
 * CWE-918 — a tool argument choosing where an outbound request goes.
 *
 * Written test-first: every invalid case below failed against a plugin with no
 * such rule (backlog item 2 of benchmarks/audits/2026-10-10-fp-fn-mcp-sdk-security.md).
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll, expect } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { join } from 'node:path';
import { noSsrfInTool, authorityOpen } from './index';

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
  "import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';\n" +
  "import axios from 'axios';\n" +
  "const API = 'https://api.example.com';\n";

/** A server file beside `fixtures/cross-file/http.ts`, which builds an axios instance. */
const SERVER = join(
  __dirname,
  '..',
  '..',
  '..',
  'fixtures',
  'cross-file',
  'server.ts',
);

const err = (arg: string, client: string) => ({
  messageId: 'toolArgToRequestHost' as const,
  data: { arg, client },
});

describe('authorityOpen', () => {
  it('is open until a host character meets a delimiter', () => {
    expect(authorityOpen('')).toBe(true);
    expect(authorityOpen('https://')).toBe(true);
    expect(authorityOpen('https://api.example.com')).toBe(true);
    expect(authorityOpen('/')).toBe(true);
    expect(authorityOpen('https://api.example.com/')).toBe(false);
    expect(authorityOpen('https://api.example.com?q=')).toBe(false);
    expect(authorityOpen('/repos/')).toBe(false);
    expect(authorityOpen('x/')).toBe(false);
  });
});

describe('no-ssrf-in-tool', () => {
  ruleTester.run('no-ssrf-in-tool', noSsrfInTool, {
    valid: [
      {
        name: 'a fixed URL',
        code:
          SDK +
          'server.registerTool("f", cfg, async ({ q }) => fetch("https://api.example.com/search"));',
      },
      {
        name: 'the argument fills a path segment after a fixed origin',
        code:
          SDK +
          'server.registerTool("f", cfg, async ({ owner, repo }) => fetch(`https://api.github.com/repos/${owner}/${repo}`));',
      },
      {
        name: 'the argument fills a query after a fixed origin, by concatenation',
        code:
          SDK +
          'server.registerTool("f", cfg, async ({ q }) => fetch("https://api.example.com/search?q=" + q));',
      },
      {
        name: 'a resolvable const origin with a path, then the argument',
        code:
          SDK +
          'server.registerTool("f", cfg, async ({ id }) => axios.get(`${API}/v1/items/${id}`));',
      },
      {
        name: 'an unreadable base followed by a slash fixes the origin',
        code:
          SDK +
          'server.registerTool("f", cfg, async ({ id }) => fetch(`${process.env.API_URL}/items/${id}`));',
      },
      {
        name: 'new URL with a relative path argument and a fixed base',
        code:
          SDK +
          'server.registerTool("f", cfg, async ({ id }) => fetch(new URL(`/v1/${encodeURIComponent(id)}`, API)));',
      },
      {
        name: 'a URL that is not a tool argument',
        code:
          SDK +
          'server.registerTool("f", cfg, async ({ q }) => fetch(configuredUrl));',
      },
      {
        name: 'a request outside any tool handler',
        code: SDK + 'async function get(url) { return fetch(url); }',
      },
      {
        name: 'a file that never imports the MCP SDK',
        code: 'server.registerTool("f", cfg, async ({ url }) => fetch(url));',
      },
      {
        name: 'a local function named fetch is not the global',
        code:
          SDK +
          'function fetch(u) { return u; }\nserver.registerTool("f", cfg, async ({ url }) => fetch(url));',
      },
      {
        name: 'a get() that is not an HTTP client',
        code:
          SDK +
          'server.registerTool("f", cfg, async ({ key }) => cache.get(key));',
      },
      {
        name: 'a fetch with no arguments',
        code:
          SDK + 'server.registerTool("f", cfg, async ({ url }) => fetch());',
      },
      {
        name: 'allowlist: hostname checked with has() before the request',
        code:
          SDK +
          'const ALLOWED_HOSTS = new Set(["api.example.com"]);\n' +
          'server.registerTool("f", cfg, async ({ url }) => {\n' +
          '  const target = new URL(url);\n' +
          '  if (!ALLOWED_HOSTS.has(target.hostname)) throw new Error("host not allowed");\n' +
          '  return fetch(target);\n' +
          '});',
      },
      {
        name: 'allowlist: origin compared, request wrapped in the check',
        code:
          SDK +
          'server.registerTool("f", cfg, async ({ url }) => {\n' +
          '  const target = new URL(url);\n' +
          '  if (target.origin === API) { return axios.get(target.href); }\n' +
          '});',
      },
      {
        name: 'allowlist: startsWith on the string, and a validator call',
        code:
          SDK +
          "import { isAllowed } from './policy';\n" +
          'server.registerTool("f", cfg, async ({ a, b }) => {\n' +
          '  if (!a.startsWith(API + "/")) return { content: [] };\n' +
          '  if (!isAllowed(b)) return { content: [] };\n' +
          '  await fetch(a); await fetch(b);\n' +
          '});',
      },
      {
        name: 'allowlist: a same-file helper that checks before returning',
        code:
          SDK +
          'function allowed(raw) { const u = new URL(raw); if (u.hostname !== "api.example.com") throw new Error("no"); return u; }\n' +
          'server.registerTool("f", cfg, async ({ url }) => fetch(allowed(url)));',
      },
      {
        name: 'a closed-set schema is the allowlist',
        code:
          SDK +
          "import { z } from 'zod';\n" +
          'server.registerTool("f", { inputSchema: { url: z.enum(["https://a.example/", "https://b.example/"]) } }, async ({ url }) => fetch(url));',
      },
      {
        name: 'an axios-like create() that is not axios',
        code:
          SDK +
          "import ky from './ky';\nconst api = ky.create();\n" +
          'server.registerTool("f", cfg, async ({ url }) => { api.get(url); api(url); });',
      },
      {
        name: 'an http export that does not send a request',
        code:
          SDK +
          "import http from 'node:http';\n" +
          'server.registerTool("f", cfg, async ({ url }) => http.createServer(url));',
      },
      {
        name: 'a request options object with no target keys',
        code:
          SDK +
          'server.registerTool("f", cfg, async ({ t }) => axios({ method: "GET", timeout: t, ...rest }));',
      },
      {
        name: 'a method on an unresolvable receiver',
        code:
          SDK +
          'server.registerTool("f", cfg, async ({ url }) => this.client.get(url));',
      },
      {
        name: 'a const cycle is bounded, not followed forever',
        code:
          SDK +
          'server.registerTool("f", cfg, async ({ url }) => { const a = b; const b = a; return fetch(a); });',
      },
      {
        name: 'new URL with no arguments, and a local URL class',
        code:
          SDK +
          'server.registerTool("f", cfg, async ({ url }) => { fetch(new URL()); });\n' +
          'function local() { class URL {} return (u) => fetch(new URL(u)); }',
      },
    ],
    invalid: [
      {
        // @found mcp-sdk-security FP/FN audit 2026-10-10, backlog item 2 (SSRF from tool arguments)
        name: 'FN: fetch(url) with the URL taken from the tool arguments',
        code:
          SDK +
          'server.registerTool("fetch_url", cfg, async ({ url }) => ({ content: [{ type: "text", text: await (await fetch(url)).text() }] }));',
        errors: [err('url', 'fetch')],
      },
      {
        // @found mcp-sdk-security FP/FN audit 2026-10-10, backlog item 2 (SSRF from tool arguments)
        name: 'FN: the argument is the host of an interpolated URL',
        code:
          SDK +
          'server.registerTool("status", cfg, async ({ host }) => axios.get(`https://${host}/status`));',
        errors: [err('host', 'axios.get')],
      },
      {
        // @found mcp-sdk-security FP/FN audit 2026-10-10, backlog item 2 (SSRF from tool arguments)
        name: 'FN: got, undici, node-fetch and https with a tool-argument URL',
        code:
          SDK +
          "import got from 'got';\nimport { request } from 'undici';\nimport nodeFetch from 'node-fetch';\nimport https from 'node:https';\n" +
          'server.registerTool("f", cfg, async ({ url }) => { await got(url); await request(url); await nodeFetch(url); https.get(url, cb); });',
        errors: [
          err('url', 'got'),
          err('url', 'undici.request'),
          err('url', 'node-fetch'),
          err('url', 'https.get'),
        ],
      },
      {
        name: 'a host suffix after a fixed host with no slash',
        code:
          SDK +
          'server.registerTool("f", cfg, async ({ sub }) => fetch("https://api.example.com" + sub));',
        errors: [err('sub', 'fetch')],
      },
      {
        name: 'an unreadable base directly followed by the argument',
        code:
          SDK +
          'server.registerTool("f", cfg, async ({ path }) => fetch(`${process.env.API_URL}${path}`));',
        errors: [err('path', 'fetch')],
      },
      {
        name: 'a scheme from code and the host from the argument',
        code:
          SDK +
          'server.registerTool("f", cfg, async ({ host }) => fetch(`${scheme}://${host}/x`));',
        errors: [err('host', 'fetch')],
      },
      {
        name: 'new URL(arg, base): an absolute argument overrides the base',
        code:
          SDK +
          'server.registerTool("f", cfg, async ({ target }) => fetch(new URL(target, API)));',
        errors: [err('target', 'fetch')],
      },
      {
        name: 'new URL(relative, arg): the base is the argument',
        code:
          SDK +
          'server.registerTool("f", cfg, async ({ base }) => fetch(new URL("/health", base)));',
        errors: [err('base', 'fetch')],
      },
      {
        name: 'the URL held in a const, then a URL object, then its href',
        code:
          SDK +
          'server.registerTool("f", cfg, async (args) => {\n' +
          '  const raw = args.endpoint.trim();\n' +
          '  const u = new URL(raw);\n' +
          '  return axios.post(u.href, {});\n' +
          '});',
        errors: [err('args.endpoint.href', 'axios.post')],
      },
      {
        name: 'axios and got config objects, and an axios instance',
        code:
          SDK +
          "import got from 'got';\nconst api = axios.create({ timeout: 5000 });\nconst g = got.extend({});\n" +
          'server.registerTool("f", cfg, async ({ a, b, c, d, e }) => { await axios({ url: a }); await got({ prefixUrl: b }); await api.get(c); await api(d); await g.post(e); });',
        errors: [
          err('a', 'axios'),
          err('b', 'got'),
          err('c', 'axios.get'),
          err('d', 'axios'),
          err('e', 'got.post'),
        ],
      },
      {
        name: 'an axios instance imported from a relative module',
        filename: SERVER,
        code:
          "import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';\nimport { api } from './http';\n" +
          'server.registerTool("f", cfg, async ({ url }) => api.get(url));',
        errors: [err('url', 'axios.get')],
      },
      {
        name: 'http.request with an options object naming the host',
        code:
          SDK +
          "import http from 'node:http';\n" +
          'server.registerTool("f", cfg, async ({ host }) => http.request({ hostname: host, path: "/" }, cb));',
        errors: [err('host', 'http.request')],
      },
      {
        name: 'a resource-template variable as the URL',
        code:
          SDK +
          'server.registerResource("page", new ResourceTemplate("page://{url}", { list: undefined }), {}, async (uri, { url }) => ({ contents: [{ uri: uri.href, text: await (await fetch(url)).text() }] }));',
        errors: [err('url', 'fetch')],
      },
      {
        name: 'low-level Server: request.params.arguments',
        code:
          SDK +
          "import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';\n" +
          'server.setRequestHandler(CallToolRequestSchema, async (req) => fetch(String(req.params.arguments.url)));',
        errors: [err('req.params.arguments.url', 'fetch')],
      },
      {
        name: 'checks that do not confine the host',
        code:
          SDK +
          'server.registerTool("f", cfg, async ({ a, b, c, d }) => {\n' +
          '  const ua = new URL(a);\n' +
          '  if (ua.protocol !== "https:") throw new Error("https only");\n' +
          '  if (b.trim() === "") throw new Error("empty");\n' +
          '  if (!(await fetch(c)).ok) throw new Error("down");\n' +
          '  const ud = new URL(d);\n' +
          '  if (ud[key] !== API) throw new Error("x");\n' +
          '  if (ud.hostname > API) throw new Error("x");\n' +
          '  await fetch(ua); await fetch(b); await fetch(ud);\n' +
          '});',
        errors: [
          err('c', 'fetch'),
          err('a', 'fetch'),
          err('b', 'fetch'),
          err('d', 'fetch'),
        ],
      },
      {
        name: 'a let reassigned from a fixed URL to one built from the argument',
        code:
          SDK +
          'server.registerTool("f", cfg, async ({ url }) => { let target = new URL(API); target = new URL(url); return fetch(target); });',
        errors: [err('url', 'fetch')],
      },
      {
        name: 'a same-file helper with no check passes the URL through',
        code:
          SDK +
          'function withScheme(u) { return u.startsWith("http") ? u : "https://" + u; }\n' +
          'server.registerTool("f", cfg, async ({ url }) => fetch(withScheme(url)));',
        errors: [err('url', 'fetch')],
      },
    ],
  });
});
