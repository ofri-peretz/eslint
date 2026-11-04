/**
 * @fileoverview Tests for require-network-timeout
 *
 * Coverage: Comprehensive test suite with valid and invalid cases
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireNetworkTimeout } from '../../rules/reliability/require-network-timeout';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-network-timeout', requireNetworkTimeout, {
  valid: [
    { name: 'a timeout is set', code: 'fetch(url, { timeout: 5000 })' },
    { code: 'axios.get(url, { timeout: 10000 })' },
  ],

  invalid: [
    { name: 'a fetch with no timeout can hang forever', code: 'fetch(url)', errors: [{ messageId: 'violationDetected' }] },
  ],
});

ruleTester.run('require-network-timeout — bound and unbound variants', requireNetworkTimeout, {
  valid: [
    // AbortSignal bounds the request just like a timeout
    { code: 'fetch(url, { signal: controller.signal })' },
    // Non-network member call on a non-axios object is out of scope
    { code: 'client.get(url)' },
    // Non-network direct call is out of scope
    { code: 'compute(url)' },
  ],

  invalid: [
    // axios without any bound
    { code: 'axios.get(url)', errors: [{ messageId: 'violationDetected' }] },
    // Options object without timeout/signal
    {
      code: 'fetch(url, { method: "GET" })',
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});

ruleTester.run('require-network-timeout — which call, which slot (fidelity)', requireNetworkTimeout, {
  valid: [
    {
      name: 'options the file cannot see prove nothing: a parameter',
      code: 'export const load = (url: string, options: RequestInit) => fetch(url, options);',
    },
    {
      name: 'options the file cannot see prove nothing: a spread of a parameter',
      code: 'export const load = (url: string, defaults: RequestInit) => fetch(url, { ...defaults });',
    },
    {
      name: 'a static computed key names `timeout` as surely as the bare key',
      code: 'fetch(url, { ["timeout"]: 1000 })',
    },
    {
      name: 'a quoted key names `timeout` as surely as the bare key',
      code: "fetch(url, { 'timeout': 1000 })",
    },
    {
      name: 'a const-bound options literal with a timeout bounds the request',
      code: 'const cfg = { timeout: 5000 }; fetch(url, cfg);',
    },
    {
      name: 'axios.post takes its config third: a timeout there bounds it',
      code: "import axios from 'axios'; axios.post(url, payload, { timeout: 5000 });",
    },
    {
      name: 'axios.post with an AbortSignal in its config is bounded',
      code: "import axios from 'axios'; axios.post(url, payload, { signal: AbortSignal.timeout(5000) });",
    },
    {
      name: 'axios.create sends no request',
      code: "import axios from 'axios'; export const api = axios.create();",
    },
    {
      name: 'axios.isCancel sends no request',
      code: "import axios from 'axios'; export const cancelled = (e: unknown) => axios.isCancel(e);",
    },
    {
      name: 'axios(config) with an opaque config proves nothing',
      code: "import axios from 'axios'; export const send = (config: object) => axios(config);",
    },
    {
      name: 'a local function named fetch is not the network call',
      code: 'function fetch(u: string) { return u; } fetch(url);',
    },
    {
      name: 'a spread of a const-bound literal carries its timeout',
      code: 'const base = { timeout: 5000 }; fetch(url, { ...base, method: "POST" });',
    },
    {
      name: 'a key chosen at runtime might be `timeout`',
      code: 'export const load = (k: string) => fetch(url, { [k]: 1000 });',
    },
    {
      name: 'a cycle of spreads resolves to nothing provable',
      code: 'const a: object = { ...b }; const b: object = { ...a }; fetch(url, a);',
    },
    {
      name: 'axios(url, config) reads the config second',
      code: "import axios from 'axios'; axios('/users', { timeout: 5000 });",
    },
    {
      name: 'a method chosen at runtime names no known request',
      code: "import axios from 'axios'; export const go = (m: string) => axios[m](url);",
    },
    {
      name: 'a named export of axios is not the callable root',
      code: "import { isAxiosError } from 'axios'; isAxiosError(url);",
    },
    {
      name: 'a local object named axios is not the library',
      code: 'const axios = { get: (u: string) => u }; axios.get(url);',
    },
  ],
  invalid: [
    {
      name: 'axios.post with a timeout field in the BODY is still unbounded',
      code: "import axios from 'axios'; axios.post(url, { timeout: 30 });",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'globalThis.fetch is the global fetch',
      code: "globalThis.fetch(url, { method: 'POST' });",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'axios imported under another name',
      code: "import http from 'axios'; http.get(url, { headers: {} });",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'axios(config) whose config has no bound',
      code: "import axios from 'axios'; axios({ url, method: 'get' });",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'a const-bound options literal with no bound',
      code: "const cfg = { method: 'POST' }; fetch(url, cfg);",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'axios(url) with a string URL and no config',
      code: "import axios from 'axios'; axios('/users');",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'axios(url) with a template URL and no config',
      code: "import axios from 'axios'; axios(`/users/${id}`);",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'axios imported as `{ default as http }`',
      code: "import { default as http } from 'axios'; http.get(url);",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'a spread of a const-bound literal with no bound',
      code: 'const base = { method: "POST" }; fetch(url, { ...base });',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'axios bracket access reaches the same request',
      code: "import axios from 'axios'; axios['get'](url);",
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});
