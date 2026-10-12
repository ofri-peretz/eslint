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

describe('1.0 independent review (2026-10-12)', () => {
  ruleTester.run('review', noSsrfInTool, {
    valid: [
      {
        // @found mcp-sdk-security 1.0 review 2026-10-12, synthetic: an allowlist written as a .some callback
        name: 'FP: the hostname checked against an allowlist inside a .some callback',
        code:
          SDK +
          'const ALLOWED = ["api.github.com"];\n' +
          'server.registerTool("f", cfg, async ({ url }) => {\n' +
          '  const foo = new URL(url);\n  const bar = foo.hostname;\n' +
          '  if (!ALLOWED.some((d) => bar === d || bar.endsWith(`.${d}`))) throw new Error("blocked");\n' +
          '  return fetch(foo);\n});',
      },
      {
        // @found modelcontextprotocol/typescript-sdk:examples/server-quickstart/src/index.ts:19
        name: 'precision lock: a request helper whose callers fix the origin',
        code:
          SDK +
          'const BASE = "https://api.weather.gov";\n' +
          'async function makeRequest(foo) { const r = await fetch(foo, { headers: {} }); return r.json(); }\n' +
          'server.registerTool("alerts", cfg, async ({ state }) => makeRequest(`${BASE}/alerts?area=${state}`));',
      },
      {
        // @found mcp-sdk-security 1.0 review 2026-10-12, synthetic: a same-file allowlist predicate
        name: 'precision lock: a same-file predicate that checks the hostname',
        code:
          SDK +
          'const ALLOWED = new Set(["api.github.com"]);\n' +
          'function allowed(foo) { return ALLOWED.has(new URL(foo).hostname); }\n' +
          'function sameApi(foo) { return foo.startsWith("https://api.github.com/"); }\n' +
          'server.registerTool("f", cfg, async ({ url }) => { if (!allowed(url)) throw new Error("no"); return fetch(url); });\n' +
          'server.registerTool("g", cfg, async ({ url }) => { if (!sameApi(url)) throw new Error("no"); return fetch(url); });',
      },
    ],
    invalid: [
      {
        // @found mcp-sdk-security 1.0 review 2026-10-12, synthetic: "https only" is not a host check
        name: 'FN: a scheme-only startsWith check',
        code:
          SDK +
          'server.registerTool("f", cfg, async ({ url }) => {\n' +
          '  if (!url.startsWith("https://")) throw new Error("https only");\n' +
          '  return fetch(url);\n});',
        errors: [err('url', 'fetch')],
      },
      {
        // @found mcp-sdk-security 1.0 review 2026-10-12, synthetic: URL syntax validation is not an allowlist
        name: 'FN: a same-file predicate that only parses the URL',
        code:
          SDK +
          'function isValidUrl(foo) { try { new URL(foo); return true; } catch { return false; } }\n' +
          'server.registerTool("f", cfg, async ({ url }) => {\n' +
          '  if (!isValidUrl(url)) throw new Error("invalid");\n' +
          '  return fetch(url);\n});',
        errors: [err('url', 'fetch')],
      },
      {
        // @found modelcontextprotocol/servers:src/everything/tools/gzip-file-as-resource.ts:197
        name: 'real code: the allowlist applies only when configured, and the default is empty',
        code:
          SDK +
          "const ALLOWED = (process.env.ALLOWED ?? '').split(',').filter((d) => d.length > 0);\n" +
          'function validate(foo) {\n' +
          '  const u = new URL(foo);\n' +
          '  if (ALLOWED.length > 0) {\n' +
          '    const domain = u.hostname;\n' +
          '    if (!ALLOWED.some((d) => domain === d)) throw new Error("blocked");\n' +
          '  }\n  return u;\n}\n' +
          'async function fetchSafely(bar) { return fetch(bar); }\n' +
          'server.registerTool("gzip", cfg, async ({ data }) => fetchSafely(validate(data)));',
        errors: [err('data', 'fetch')],
      },
      {
        // @found mcp-sdk-security 1.0 review 2026-10-12, synthetic: class-based server and request helper
        name: 'FN: a request helper, and a class method, given the tool URL',
        code:
          SDK +
          'async function get(foo) { const r = await fetch(foo); return r.text(); }\n' +
          'server.registerTool("a", cfg, async ({ url }) => get(url));\n' +
          'class Fetcher {\n' +
          '  constructor() { server.registerTool("b", cfg, async (args) => this.fetchIt(args.url)); }\n' +
          '  async fetchIt(bar) { return axios.get(bar); }\n}',
        errors: [err('url', 'fetch'), err('args.url', 'axios.get')],
      },
    ],
  });
});

describe('1.0 review: helper call sites and predicate shapes', () => {
  ruleTester.run('shapes', noSsrfInTool, {
    valid: [
      {
        name: 'precision lock: helper call sites with no argument, a spread, or a host check before the call',
        code:
          SDK +
          'async function get(foo) { return fetch(foo); }\n' +
          'server.registerTool("f", cfg, async ({ url }) => {\n' +
          '  await get(); await get(...parts);\n' +
          '  if (!ALLOWED.has(new URL(url).hostname)) throw new Error("no");\n' +
          '  return get(url);\n});',
      },
      {
        name: 'precision lock: a startsWith prefix this file cannot read is treated as a check',
        code:
          SDK +
          'server.registerTool("f", cfg, async ({ url }) => { if (!url.startsWith(env.PREFIX)) throw new Error("no"); return fetch(url); });',
      },
    ],
    invalid: [
      {
        // @found mcp-sdk-security 1.0 review 2026-10-12, synthetic
        name: 'FN: a destructured helper parameter, and a predicate that reads no host',
        code:
          SDK +
          'async function getIt({ u }) { return fetch(u); }\n' +
          'function present(foo) { return foo[k] !== undefined && foo.length > 0; }\n' +
          'server.registerTool("f", cfg, async ({ url }) => { if (!present(url)) throw new Error("no"); return getIt({ u: url }); });',
        errors: [err('u', 'fetch')],
      },
    ],
  });
});

describe('1.0 review: origin shapes the Quint model found', () => {
  ruleTester.run('origins', noSsrfInTool, {
    valid: [
      {
        // @found benchmarks/quint/models/mcp-sdk-security.no-ssrf-in-tool.qnt (ToolArg/PathAfterOrigin/any/ViaLet, …/ViaHelperReturn, AxiosGet/Inline)
        name: 'FP: a fixed-origin URL bound through a let, returned by a helper, or wrapped in String() / .href',
        code:
          SDK +
          'function pick(a) { return a; }\n' +
          'server.registerTool("f", cfg, async ({ id }) => {\n' +
          '  let v = "fixed";\n  v = `${API}/items/${id}`;\n  await fetch(v);\n' +
          '  await fetch(pick(`${API}/search?q=${id}`));\n' +
          '  await axios.get(String(new URL("/v1/" + id, API)));\n' +
          '  await fetch(new URL(`/v1/${id}`, API).href);\n});',
      },
    ],
    invalid: [
      {
        // @found benchmarks/quint/models/mcp-sdk-security.no-ssrf-in-tool.qnt (ToolArg/Whole/SchemeOnly/AxiosGet/any)
        name: 'FN: a scheme-only check on a converted URL, and an open origin through a let and String()',
        code:
          SDK +
          'server.registerTool("f", cfg, async ({ url }) => {\n' +
          '  if (!String(url).startsWith("https://")) throw new Error("https");\n' +
          '  let v = API;\n  v = url;\n  await axios.get(String(v));\n});',
        errors: [err('url', 'axios.get')],
      },
    ],
  });
});

describe('1.0 review: URL wrappers and let writes', () => {
  ruleTester.run('wrappers', noSsrfInTool, {
    valid: [
      {
        name: 'precision lock: awaited, optional-chained and toString() fixed-origin URLs, and a let with no initialiser',
        code:
          SDK +
          'async function build(a) { return new URL(`/v1/${a}`, API); }\n' +
          'server.registerTool("f", cfg, async ({ id }) => {\n' +
          '  await fetch(await build(id));\n' +
          '  const u = new URL(`/v1/${id}`, API);\n' +
          '  await fetch(u?.href);\n  await fetch(u.toString());\n' +
          '  let w;\n  w = `${API}/x/${id}`;\n  await fetch(w);\n});\n' +
          'function hostOk(a) { if (!ALLOWED.has(new URL(a).hostname)) throw new Error("no"); return a; }\n' +
          'server.registerTool("g", cfg, async ({ url }) => fetch(`${hostOk(url)}`));',
      },
    ],
    invalid: [
      {
        // `parts[k]()` — a computed call on an argument — is not followed: the
        // call may return anything.
        name: 'recall lock: an emptiness check, a computed member, a destructured let and a += write leave the origin to the argument',
        code:
          SDK +
          "import { makeUrl } from 'url-kit';\n" +
          'server.registerTool("f", cfg, async ({ url, parts }) => {\n' +
          '  if (String(url) === "") throw new Error("empty");\n' +
          '  await fetch(url);\n' +
          '  await fetch(parts[k]);\n' +
          '  let { href } = new URL(url);\n  await fetch(href);\n' +
          '  let s = "";\n  s += url;\n  await fetch(s);\n' +
          '  await fetch(makeUrl(url).toString(1));\n  await fetch(parts[k]());\n});',
        errors: [
          err('url', 'fetch'),
          err('parts', 'fetch'),
          err('url.href', 'fetch'),
          err('url', 'fetch'),
        ],
      },
    ],
  });
});
