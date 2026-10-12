// Renders one state of models/mcp-sdk-security.no-ssrf-in-tool.qnt.
// Spells the shape only; the verdict is the model's `expected`.
import { bind, v1Tool } from './_mcp.mjs';

export const plugin = 'mcp-sdk-security';
export const rule = 'no-ssrf-in-tool';
export const dimensions = ['source', 'shape', 'guard', 'sink', 'binding'];

const SHAPE = {
  Whole: (e) => e,
  HostInterp: (e) => '`https://${' + e + '}/v1/status`',
  PathAfterOrigin: (e) => '`${API}/items/${' + e + '}`',
  QueryAfterOrigin: (e) => '`${API}/search?q=${' + e + '}`',
  NewUrlWhole: (e) => `new URL(${e})`,
  NewUrlRelative: (e) => `new URL('/v1/' + ${e}, API)`,
  ConcatOpenOrigin: (e) => `API + ${e}`,
};

const SINK = {
  Fetch: ['', (v) => `await fetch(${v});`],
  AxiosGet: [
    "import axios from 'axios';",
    (v) => `await axios.get(String(${v}));`,
  ],
  AxiosConfig: [
    "import axios from 'axios';",
    (v) => `await axios({ url: String(${v}), method: 'get' });`,
  ],
  GotDefault: ["import got from 'got';", (v) => `await got(${v});`],
  UndiciRequest: [
    "import { request } from 'undici';",
    (v) => `await request(${v});`,
  ],
  HttpsGet: ["import https from 'node:https';", (v) => `https.get(${v});`],
};

/** Checks on `v`, then the request. */
const GUARD = {
  NoGuard: (sink) => (v) => sink(v),
  HostnameAllowlist: (sink) => (v) =>
    `if (!ALLOWED.has(new URL(String(${v})).hostname)) throw new Error('host');\n  ${sink(v)}`,
  SomeCallback: (sink) => (v) =>
    `const host = new URL(String(${v})).hostname;\n  if (!ALLOWED_LIST.some((h) => host === h)) throw new Error('host');\n  ${sink(v)}`,
  SchemeOnly: (sink) => (v) =>
    `if (!String(${v}).startsWith('https://')) throw new Error('https only');\n  ${sink(v)}`,
  IsValidUrlHelper: (sink) => (v) =>
    `if (!isValidUrl(String(${v}))) throw new Error('invalid');\n  ${sink(v)}`,
  ProtocolCheck: (sink) => (v) =>
    `if (new URL(String(${v})).protocol !== 'https:') throw new Error('https only');\n  ${sink(v)}`,
};

/** @param {Record<string, string>} c one case: dimension -> variant */
export function render(c) {
  const [imp, sink] = SINK[c.sink];
  const raw = c.source === 'ToolArg' ? 'target' : 'MIRROR';
  const { top, body } = bind(
    c.binding,
    SHAPE[c.shape](raw),
    GUARD[c.guard](sink),
  );
  return [
    imp,
    "const API = 'https://api.example.com';",
    "const MIRROR = 'mirror.example.com';",
    "const ALLOWED = new Set(['api.example.com']);",
    "const ALLOWED_LIST = ['api.example.com'];",
    'function isValidUrl(s: string): boolean {\n  try {\n    new URL(s);\n    return true;\n  } catch {\n    return false;\n  }\n}',
    top,
    v1Tool('target', body),
    '',
  ]
    .filter(Boolean)
    .join('\n');
}
