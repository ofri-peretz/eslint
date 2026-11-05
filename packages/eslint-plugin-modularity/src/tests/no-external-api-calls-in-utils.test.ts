/**
 * Tests for no-external-api-calls-in-utils rule
 * Detects network calls in utility functions
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noExternalApiCallsInUtils } from '../rules/no-external-api-calls-in-utils';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('no-external-api-calls-in-utils', () => {
  describe('allow non-utility files', () => {
    ruleTester.run('allow network calls in services', noExternalApiCallsInUtils, {
      valid: [
        // Network calls in non-utility files are fine
        {
          name: 'the same call in a service file, which is where it belongs',
          code: 'fetch("/api/users");',
          filename: '/src/services/userService.ts',
        },
        {
          code: 'axios.get("/api/data");',
          filename: '/src/components/Dashboard.tsx',
        },
        // Test files are ignored by default
        {
          code: 'fetch("/api/test");',
          filename: '/src/utils/helper.test.ts',
        },
        {
          // burgee sweep 2026-09-23: ignoreInTests missed .[cm]js/.[cm]ts test files
          // (compat-oracle/vendor/commander/tests/*.test.cjs); matches reliability #1080.
          name: 'ignoreInTests also skips an ESM test file (.test.mjs)',
          code: 'fetch("/api/test");',
          filename: '/src/utils/helper.test.mjs',
        },
      ],
      invalid: [],
    });
  });

  describe('flag utility files with network calls', () => {
    ruleTester.run('detect network calls in utils', noExternalApiCallsInUtils, {
      valid: [
        // Pure utility functions (no network)
        {
          code: 'function formatDate(date) { return date.toISOString(); }',
          filename: '/src/utils/dateUtils.ts',
        },
        {
          code: 'const sum = (a, b) => a + b;',
          filename: '/src/helpers/math.ts',
        },
      ],
      invalid: [
        // fetch in utils
        {
          name: 'a network call reached from a utils module',
          code: 'fetch("/api/users");',
          filename: '/src/utils/api.ts',
          errors: [{ messageId: 'externalApiCallInUtils' }],
        },
        // axios in helpers
        {
          code: 'axios.get("/api/data");',
          filename: '/src/helpers/dataHelper.ts',
          errors: [{ messageId: 'externalApiCallInUtils' }],
        },
        // Multiple calls
        {
          code: `
            async function getData() {
              const users = await fetch("/api/users");
              const orders = await fetch("/api/orders");
              return { users, orders };
            }
          `,
          filename: '/src/lib/dataFetcher.ts',
          errors: [
            { messageId: 'externalApiCallInUtils' },
            { messageId: 'externalApiCallInUtils' },
          ],
        },
      ],
    });
  });

  describe('callee shape edges', () => {
    ruleTester.run('computed and nested member callees', noExternalApiCallsInUtils, {
      valid: [
        // Computed member callee: property is not an Identifier, not a network call
        {
          code: "obj['get'](url);",
          filename: '/src/utils/dynamic.ts',
        },
        // IIFE callee is neither Identifier nor MemberExpression
        {
          code: '(function () { return 1; })();',
          filename: '/src/utils/iife.ts',
        },
        // Unresolved receiver: `client` is not a known HTTP client
        {
          code: 'client.api.get(url);',
          filename: '/src/utils/nested.ts',
        },
      ],
      invalid: [
        {
          code: "import http from 'http';\nhttp.request(url);",
          filename: '/src/utils/nested.ts',
          errors: [{ messageId: 'externalApiCallInUtils' }],
        },
      ],
    });
  });

  // Regression lock: `get`/`set`/`delete`/`post` are Map/Set/Headers/
  // URLSearchParams/Cache method names too. Matching the method name alone
  // fired on every cache lookup in a utils file (45 findings / 17 files in the
  // 2026-08-11 dogfooding sweep). The receiver must resolve to an HTTP client.
  describe('built-in collections are not network calls', () => {
    ruleTester.run('method-name collisions stay silent', noExternalApiCallsInUtils, {
      valid: [
        {
          code: 'const store = new Map();\nconst hit = store.get(key);\nstore.set(key, value);\nstore.delete(key);',
          filename: '/src/utils/client-cache.ts',
        },
        {
          code: 'const points = series.get(def.id);\nconst asOf = asOfById.get(def.id) ?? null;',
          filename: '/src/utils/alerts.ts',
        },
        {
          code: "const headers = new Headers();\nheaders.get('x-request-id');",
          filename: '/src/utils/headers.ts',
        },
        {
          code: "const params = new URLSearchParams(search);\nparams.get('q');\nparams.delete('page');",
          filename: '/src/utils/query.ts',
        },
        {
          code: "const seen = new Set();\nseen.add(id);\nsessionStorage.getItem('k');",
          filename: '/src/utils/dedupe.ts',
        },
        // Express-style receiver named `request` — not the `request` package
        {
          code: "export function origin(request) { return request.get('host'); }",
          filename: '/src/utils/origin.ts',
        },
        // Receiver is a call result, not an identifier chain
        {
          code: 'getStore().get(key);',
          filename: '/src/utils/factory.ts',
        },
        // Non-HTTP module imports/requires never seed a client binding
        {
          code: "import { format } from 'date-fns';\nformat(date);",
          filename: '/src/utils/date.ts',
        },
        {
          code: "const fs = require('fs');\nfs.readFileSync(path);",
          filename: '/src/utils/read.ts',
        },
        // Type-only imports are erased at runtime
        {
          code: "import type { AxiosInstance } from 'axios';\nexport type Client = AxiosInstance;",
          filename: '/src/utils/types.ts',
        },
        // Declarator without an initializer
        {
          code: 'let pending;\npending = 1;',
          filename: '/src/utils/state.ts',
        },
        // Non-identifier destructuring targets bind nothing
        {
          code: "const { globalAgent: { maxSockets }, ...rest } = require('https');\nconsole.log(maxSockets, rest);",
          filename: '/src/utils/agent.ts',
        },
        {
          code: "const [first] = require('https');\nconsole.log(first);",
          filename: '/src/utils/agent.ts',
        },
      ],
      invalid: [
        // Imported clients still fire
        {
          code: "import axios from 'axios';\nexport const load = () => axios.get('/api/data');",
          filename: '/src/utils/api.ts',
          errors: [{ messageId: 'externalApiCallInUtils' }],
        },
        {
          code: "import { request } from 'undici';\nexport const load = () => request('https://api.github.com/repos');",
          filename: '/src/utils/api.ts',
          errors: [{ messageId: 'externalApiCallInUtils' }],
        },
        {
          code: "const got = require('got');\nexport const load = () => got('https://example.com');",
          filename: '/src/utils/api.ts',
          errors: [{ messageId: 'externalApiCallInUtils' }],
        },
        // Client alias resolves even when declared after its use
        {
          code: "import axios from 'axios';\nexport const load = () => api.get('/api/data');\nconst api = axios.create({ baseURL: '/api' });",
          filename: '/src/utils/api.ts',
          errors: [{ messageId: 'externalApiCallInUtils' }],
        },
        // Destructured require binds the client to the destructured name
        {
          code: "const { get } = require('https');\nexport const load = () => get('https://example.com');",
          filename: '/src/utils/api.ts',
          errors: [{ messageId: 'externalApiCallInUtils' }],
        },
        // Inline type specifiers are skipped, value specifiers are not
        {
          code: "import { type Options, got } from 'got';\nexport const load = () => got('https://example.com');",
          filename: '/src/utils/api.ts',
          errors: [{ messageId: 'externalApiCallInUtils' }],
        },
        {
          code: "export const load = () => window.fetch('https://api.github.com/repos');",
          filename: '/src/utils/api.ts',
          errors: [{ messageId: 'externalApiCallInUtils' }],
        },
        // Escape hatch: explicit `object.method` pair for an in-house client
        {
          code: "export const load = () => httpClient.get('/api/data');",
          filename: '/src/utils/api.ts',
          options: [{ networkMethods: ['httpClient.get'] }],
          errors: [{ messageId: 'externalApiCallInUtils' }],
        },
        // A namespace import is handled by the ImportDeclaration listener —
        // `specifier.type !== 'ImportSpecifier'` is true for
        // ImportNamespaceSpecifier — but nothing pinned it.
        {
          code: "import * as http from 'node:http';\nhttp.request(url);",
          filename: '/src/utils/api.ts',
          errors: [{ messageId: 'externalApiCallInUtils' }],
        },
        // Alias DEPTH is not the limitation; opacity is. The Program:exit
        // fixpoint propagates client-ness until nothing new is added, so a
        // second hop still resolves. KNOWN-LIMITATIONS.md claimed otherwise
        // until this test was written to check.
        {
          code: "import axios from 'axios';\nconst api = axios.create();\nconst api2 = api.create();\napi2.get(url);",
          filename: '/src/utils/api.ts',
          errors: [{ messageId: 'externalApiCallInUtils' }],
        },
      ],
    });
  });
});

// Found by the fidelity model (benchmarks/suites/fidelity/models/modularity):
// clients were a flat set of NAMES, so an injected client named `fetch` or
// `axios` - the dependency injection this rule recommends - reported, and a
// subscripted method did not.
describe('no-external-api-calls-in-utils — clients by binding', () => {
  const filename = '/src/utils/load.ts';
  ruleTester.run('binding', noExternalApiCallsInUtils, {
    valid: [
      {
        name: 'an injected fetch parameter is the recommended fix',
        code: 'export function load(url: string, fetch: (u: string) => unknown) { return fetch(url); }',
        filename,
      },
      {
        name: 'an injected axios parameter is the recommended fix',
        code: 'export function load(url: string, axios: { get(u: string): unknown }) { return axios.get(url); }',
        filename,
      },
      {
        name: 'a parameter shadowing an imported client in an inner scope',
        code: "import axios from 'axios';\nexport const keep = axios;\nexport function load(url: string, axios: { get(u: string): unknown }) { return axios.get(url); }",
        filename,
      },
      {
        name: 'a type-only import is not a client',
        code: "import type axios from 'axios';\nexport function load(url: string, client: typeof axios) { return client.get(url); }",
        filename,
      },
      {
        name: 'a function imported from a non-HTTP module',
        code: "import { get } from 'lodash';\nexport const read = (o: object) => get(o, 'a');",
        filename,
      },
      {
        name: 'a require of a non-HTTP module',
        code: "const { get } = require('lodash');\nexport const read = (o: object) => get(o, 'a');",
        filename,
      },
      {
        name: 'a let without an initialiser is not a client',
        code: 'let client: any;\nexport const read = (u: string) => client.get(u);',
        filename,
      },
      {
        name: 'a destructured alias is not followed as a client',
        code: "import axios from 'axios';\nconst { get } = axios;\nexport const read = (u: string) => get(u);",
        filename,
      },
      {
        name: 'a const derived from a non-client root',
        code: 'const api = makeApi().client;\nexport const read = (u: string) => api.get(u);',
        filename,
      },
      {
        name: 'a dynamic member names no method',
        code: "import axios from 'axios';\nexport const read = (u: string, m: string) => (axios as any)[m](u);",
        filename,
      },
      {
        name: '* stays inside one path segment',
        code: "import axios from 'axios';\nexport const read = (u: string) => axios.get(u);",
        filename: '/src/shared/a/b/load.ts',
        options: [{ utilityPatterns: ['src/shared/*/load.ts'] }],
      },
      {
        name: 'a window that the code declares is not the global',
        code: 'export function load(url: string, window: { fetch(u: string): unknown }) { return window.fetch(url); }',
        filename,
      },
    ],
    invalid: [
      {
        name: '** spans several directories in utilityPatterns',
        code: "import axios from 'axios';\nexport const read = (u: string) => axios.get(u);",
        filename: '/src/shared/a/b/utils/load.ts',
        options: [{ utilityPatterns: ['**/shared/**/utils/**'] }],
        errors: [{ messageId: 'externalApiCallInUtils' }],
      },
      {
        name: 'a subscripted method on an imported client',
        code: "import axios from 'axios';\nexport const send = (u: string) => axios['post'](u);",
        filename,
        errors: [{ messageId: 'externalApiCallInUtils' }],
      },
      {
        name: 'a client derived through two consts',
        code: "import axios from 'axios';\nconst base = axios.create();\nconst api = base;\nexport const read = (u: string) => api.get(u);",
        filename,
        errors: [{ messageId: 'externalApiCallInUtils' }],
      },
    ],
  });
});
