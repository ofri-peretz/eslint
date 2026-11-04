const { tag } = require('../../lib.cjs');
const { toolProgram } = require('../../mcp-sdk.cjs');

/** Sink tag -> [imports, pre, statement(url)]. */
const SINKS = {
  GlobalFetch: ['', '', (v) => `const res = await fetch(${v});`],
  NodeFetch: [
    "import fetch from 'node-fetch';",
    '',
    (v) => `const res = await fetch(${v});`,
  ],
  UndiciRequest: [
    "import { request } from 'undici';",
    '',
    (v) => `const res = await request(${v});`,
  ],
  AxiosGet: [
    "import axios from 'axios';",
    '',
    (v) => `const res = await axios.get(${v});`,
  ],
  AxiosConfig: [
    "import axios from 'axios';",
    '',
    (v) => `const res = await axios({ method: 'get', url: ${v} });`,
  ],
  AxiosInstance: [
    "import axios from 'axios';",
    'const api = axios.create({ timeout: 5000 });',
    (v) => `const res = await api.get(${v});`,
  ],
  Got: [
    "import got from 'got';",
    '',
    (v) => `const res = await got(${v}).json();`,
  ],
  HttpsGet: [
    "import https from 'node:https';",
    '',
    (v) => `https.get(${v}, (res) => res.resume());`,
  ],
  CacheGet: [
    "import { cache } from './cache';",
    '',
    (v) => `const res = await cache.get(${v});`,
  ],
  ShadowedFetch: [
    "import { fetchFromCache as fetch } from './cache';",
    '',
    (v) => `const res = await fetch(${v});`,
  ],
};

const FLOWS = {
  Direct: (a) => ['', a],
  HostTemplate: (a) => ['', `\`https://\${${a}}/status\``],
  OriginConcat: (a) => ['', `'https://api.example.com' + ${a}`],
  BaseNoSlash: (a) => ['', `\`\${API_ORIGIN}\${${a}}\``],
  NewUrlAbsolute: (a) => ['', `new URL(${a}, API_ORIGIN)`],
  EnvBaseNoSlash: (a) => ['', `\`\${process.env.API_URL}\${${a}}\``],
  PathTemplate: (a) => ['', `\`https://api.github.com/repos/\${${a}}\``],
  EncodedPath: (a) => [
    '',
    `\`\${API_ORIGIN}/v1/items/\${encodeURIComponent(${a})}\``,
  ],
  NewUrlPath: (a) => ['', `new URL(\`/v1/items/\${${a}}\`, API_ORIGIN)`],
  EnvBaseSlash: (a) => ['', `\`\${process.env.API_URL}/items/\${${a}}\``],
  HostAllowlist: (a) => [
    `const target = new URL(${a});\nif (!ALLOWED_HOSTS.has(target.hostname)) {\n  throw new Error('host not allowed');\n}`,
    'target.href',
  ],
  HostCompare: (a) => [
    `const target = new URL(${a});\nif (target.hostname !== 'api.example.com') return { isError: true, content: [] };`,
    'target.href',
  ],
  ProtocolCheck: (a) => [
    `const target = new URL(${a});\nif (target.protocol !== 'https:') throw new Error('https only');`,
    'target.href',
  ],
  SchemePrefixCheck: (a) => [
    `if (!${a}.startsWith('https://')) throw new Error('https only');`,
    a,
  ],
  Literal: () => ['', "'https://api.example.com/health'"],
};

module.exports = {
  rule: 'no-ssrf-in-tool',
  // Wiring: 54 gate/registration pairs x 2 sinks x 2 flows = 216.
  // Sinks: 10 sinks x 15 flows = 150.
  domain: 366,
  traces: 3600,
  key: (s) =>
    `${tag(s.part)}|${tag(s.gate)}|${tag(s.reg)}|${tag(s.sink)}|${tag(s.flow)}`,
  code: (s) => {
    const [imports, pre, stmt] = SINKS[tag(s.sink)];
    const flow = FLOWS[tag(s.flow)];
    return toolProgram(
      tag(s.gate),
      tag(s.reg),
      (a) => {
        const [p, v] = flow(a);
        return [p, stmt(v)].filter(Boolean).join('\n');
      },
      {
        arg: 'url',
        imports,
        pre: [
          pre,
          "const API_ORIGIN = 'https://api.example.com';",
          "const ALLOWED_HOSTS = new Set(['api.example.com', 'docs.example.com']);",
        ]
          .filter(Boolean)
          .join('\n'),
      },
    );
  },
};
