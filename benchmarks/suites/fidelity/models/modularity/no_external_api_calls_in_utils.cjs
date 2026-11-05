const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../quality.cjs');

// [module-level lines, function params, body lines]
const CALL = {
  GlobalFetch: [[], 'url: string', ['return fetch(url);']],
  GlobalThisFetch: [[], 'url: string', ['return globalThis.fetch(url);']],
  AxiosGet: [
    ["import axios from 'axios';"],
    'url: string',
    ['return axios.get(url);'],
  ],
  AxiosSubscript: [
    ["import axios from 'axios';"],
    'url: string',
    ["return axios['post'](url);"],
  ],
  AxiosDirect: [
    ["import client from 'axios';"],
    'url: string',
    ['return client(url);'],
  ],
  AxiosCreated: [
    [
      "import axios from 'axios';",
      "const api = axios.create({ baseURL: '/v1' });",
    ],
    'url: string',
    ['return api.get(url);'],
  ],
  RequiredHttps: [
    ["const https = require('node:https');"],
    'url: string',
    ['return https.get(url);'],
  ],
  NamespaceHttp: [
    ["import * as h from 'node:http';"],
    'url: string',
    ['return h.request(url);'],
  ],
  RequireDestructured: [
    ["const { request } = require('undici');"],
    'url: string',
    ['return request(url);'],
  ],
  FetchParam: [
    [],
    'url: string, fetch: (u: string) => unknown',
    ['return fetch(url);'],
  ],
  AxiosParam: [
    [],
    'url: string, axios: { get(u: string): unknown }',
    ['return axios.get(url);'],
  ],
  InnerShadow: [
    ["import axios from 'axios';", 'export const viaImport = () => axios;'],
    'url: string, axios: { get(u: string): unknown }',
    ['return axios.get(url);'],
  ],
  AxiosCreateOnly: [
    ["import axios from 'axios';"],
    'url: string',
    ['return axios.create({ baseURL: url });'],
  ],
  MapGet: [
    ['const cache = new Map<string, unknown>();'],
    'url: string',
    ['return cache.get(url);'],
  ],
  LodashGet: [
    ["import { get } from 'lodash';"],
    'url: string',
    ["return get({ url }, 'url');"],
  ],
  InHouseClient: [
    [],
    'url: string, httpClient: { get(u: string): unknown }',
    ['return httpClient.get(url);'],
  ],
};

const FILE = {
  Utility: 'src/utils/load.ts',
  Service: 'src/services/load.ts',
  UtilityTest: 'src/utils/load.test.ts',
  Shared: 'src/shared/load.ts',
};

const OPT = {
  Defaults: undefined,
  TestsChecked: { ignoreInTests: false },
  SharedPattern: { utilityPatterns: ['**/shared/**'] },
  ExplicitPair: { networkMethods: ['get', 'post', 'httpClient.get'] },
};

module.exports = {
  rule: 'no-external-api-calls-in-utils',
  // Spellings 15; Paths 2 x 4 x 3; Pairs 2 x 2.
  domain: 15 + 24 + 4,
  traces: 1000,
  key: keyOf('focus', 'call', 'path', 'opt'),
  filename: (s) => FILE[tag(s.path)],
  config: (s) => OPT[tag(s.opt)],
  code: (s) => {
    const [mod, params, body] = CALL[tag(s.call)];
    return src(
      mod,
      `export function load(${params}) {`,
      body.map((l) => `  ${l}`),
      '}',
    );
  },
};
