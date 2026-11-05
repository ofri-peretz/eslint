const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../reliability.cjs');

// The options object each Bound spells, or null for none at all.
const OPTS = {
  NoOptions: null,
  Timeout: '{ timeout: 5000 }',
  Signal: '{ signal: AbortSignal.timeout(5000) }',
  QuotedTimeout: "{ 'timeout': 5000 }",
  OtherKeys: "{ headers: { accept: 'application/json' } }",
  ConstNoBound: 'cfg',
  ConstBound: 'cfg',
  Opaque: 'opts',
  SpreadOpaque: '{ ...opts }',
};
const CONST = {
  ConstNoBound: "const cfg = { headers: { accept: 'application/json' } };",
  ConstBound: 'const cfg = { timeout: 5000 };',
};

const AXIOS = "import axios from 'axios';";
// `axios(config)` / `axios.request(config)`: the options ARE the config, so
// their keys sit beside `url` (a visible const or an opaque value is spread).
const configFirst = (o, b) => {
  if (o === null) return '{ url }';
  if (b === 'Opaque') return 'opts';
  if (o.startsWith('{ ')) return `{ url, ${o.slice(2)}`;
  return `{ url, ...${o} }`;
};
// [module head, call given the options source (or null)]
const CLIENT = {
  Fetch: ['', (o) => `fetch(url${o ? `, ${o}` : ''})`],
  GlobalThisFetch: ['', (o) => `globalThis.fetch(url${o ? `, ${o}` : ''})`],
  ShadowedFetch: [
    'function fetch(u: string, o?: object) { return { u, o }; }',
    (o) => `fetch(url${o ? `, ${o}` : ''})`,
  ],
  AxiosGet: [AXIOS, (o) => `axios.get(url${o ? `, ${o}` : ''})`],
  AxiosPost: [AXIOS, (o) => `axios.post(url, payload${o ? `, ${o}` : ''})`],
  AxiosPostBodyTimeout: [
    AXIOS,
    (o) => `axios.post(url, { timeout: 30 }${o ? `, ${o}` : ''})`,
  ],
  AxiosDelete: [AXIOS, (o) => `axios.delete(url${o ? `, ${o}` : ''})`],
  AxiosRequest: [AXIOS, (o, b) => `axios.request(${configFirst(o, b)})`],
  AxiosCall: [AXIOS, (o, b) => `axios(${configFirst(o, b)})`],
  AxiosGlobal: ['', (o) => `axios.get(url${o ? `, ${o}` : ''})`],
  AxiosLocalObject: [
    'const axios = { get: (u: string, o?: object) => ({ u, o }) };',
    (o) => `axios.get(url${o ? `, ${o}` : ''})`,
  ],
  AxiosRenamed: [
    "import http from 'axios';",
    (o) => `http.get(url${o ? `, ${o}` : ''})`,
  ],
  AxiosRequire: [
    "const axios = require('axios');",
    (o) => `axios.get(url${o ? `, ${o}` : ''})`,
  ],
  AxiosBracket: [AXIOS, (o) => `axios['get'](url${o ? `, ${o}` : ''})`],
  AxiosCreate: [AXIOS, (o) => `axios.create(${o ?? ''})`],
  AxiosIsCancel: [AXIOS, (o) => `axios.isCancel(url${o ? `, ${o}` : ''})`],
  NotNetwork: ['', (o) => `cache.get(url${o ? `, ${o}` : ''})`],
};

module.exports = {
  rule: 'require-network-timeout',
  domain: 17 * 9,
  traces: 1700,
  key: keyOf('client', 'bound'),
  code: (s) => {
    const b = tag(s.bound);
    const [head, call] = CLIENT[tag(s.client)];
    const opts = OPTS[b];
    // `axios(config)` / `axios.request(config)` merge the options into the
    // one config object; spreading an inline literal keeps its keys visible.
    return [
      head,
      'const cache = new Map<string, unknown>();',
      CONST[b] ?? '',
      'export async function load(url: string, payload: object, opts: any) {',
      `  return ${call(opts, b)};`,
      '}',
      '',
    ].join('\n');
  },
};
