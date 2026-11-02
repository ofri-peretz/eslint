const { tag, withTestFile } = require('../../lib.cjs');

const base = {
  rule: 'no-ssrf',
  domain: 98, // 7 clients x 7 URL sources x 2 option values
  traces: 1100,
  key: (s) => `${tag(s.client)}|${tag(s.urlSrc)}|unresolved=${s.unresolvedOpt}`,
  config: (s) => ({ reportUnresolvedUrls: s.unresolvedOpt }),
  code: (s) => {
    const [pre, u] = {
      Literal: ['', "'https://api.partner.example/feed'"],
      ReqQuery: ['', 'req.query.url'],
      ReqTemplate: ['', '`${API_BASE}${req.params.path}`'],
      DestructuredReq: ['const { feedUrl } = req.body;', 'feedUrl'],
      LocalTemplate: ['', '`https://api.internal/items/${id}`'],
      UserNamedParam: ['', 'userUrl'],
      AllowlistGuard: [
        "const target = new URL(req.query.url);\n  if (target.protocol !== 'https:' || !ALLOWED_HOSTS.has(target.hostname)) throw new Error('host not allowed');",
        'target.href',
      ],
    }[tag(s.urlSrc)];
    const [head, call] = {
      Fetch: ['', `await fetch(${u})`],
      AxiosGet: ["import axios from 'axios';", `await axios.get(${u})`],
      HttpsRequestObj: [
        "import https from 'node:https';",
        `https.request({ host: ${u}, path: '/', method: 'GET' })`,
      ],
      HttpGet: ["const http = require('http');", `http.get(${u})`],
      GotCall: ["import got from 'got';", `await got(${u})`],
      NodeFetchRenamed: [
        "import nodeFetch from 'node-fetch';",
        `await nodeFetch(${u})`,
      ],
      MapGet: ['const cache = new Map<string, string>();', `cache.get(${u})`],
    }[tag(s.client)];
    return `${head}\nconst API_BASE = 'https://api.partner.example';\nconst ALLOWED_HOSTS = new Set(['api.partner.example']);\nexport async function handler(req: any, id: string, userUrl: string) {\n  ${pre}\n  return ${call};\n}\n`;
  },
  model: (s) => s.verdict,
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: false });
