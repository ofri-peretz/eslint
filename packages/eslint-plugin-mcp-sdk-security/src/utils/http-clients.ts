/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Is this call an outbound HTTP request, and where is its URL?
 *
 * Resolved to the module that sends the request, never matched by a method
 * name — `cache.get(key)` and `router.get(path)` are not requests:
 *
 *   - the global `fetch` (only when no local binding shadows it);
 *   - `node-fetch`'s default export and `undici`'s `fetch` / `request` /
 *     `stream`;
 *   - `axios` and `got`, called directly, through a verb method, or through an
 *     instance from `axios.create()` / `got.extend()`;
 *   - `http` / `https` `get` / `request`.
 *
 * Shared by the SSRF rule (is the URL attacker-chosen?) and the token
 * passthrough check (does a request carry the caller's bearer token?).
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  objectKeyName,
  propertyName,
  resolveModuleBinding,
} from '@interlace/eslint-devkit';
import type { Construction } from './instances';
import { lookupVariable } from './tool-registration';

/** HTTP verb methods on an axios / got export or instance. */
const VERB_METHODS = new Set([
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'head',
  'options',
  'request',
  'stream',
]);

/** Module → the exports (path) that send a request. `''` is the default export. */
const REQUEST_EXPORTS: Readonly<Record<string, ReadonlySet<string>>> = {
  'node-fetch': new Set(['']),
  undici: new Set(['fetch', 'request', 'stream']),
  axios: new Set(['', ...VERB_METHODS]),
  got: new Set(['', ...VERB_METHODS]),
  http: new Set(['get', 'request']),
  https: new Set(['get', 'request']),
};

/** Factories whose result is a client with the same verb methods. */
const INSTANCE_FACTORIES: Readonly<Record<string, string>> = {
  axios: 'create',
  got: 'extend',
};

/**
 * Option keys that carry the request target when the first argument is an
 * options object.
 *
 * @vocabulary fetch / axios / got / Node http request options
 */
const URL_OPTION_KEYS = new Set([
  'url',
  'baseURL',
  'prefixUrl',
  'host',
  'hostname',
]);

export interface HttpRequest {
  /** The client, for the message: `fetch`, `axios.get`, `https.request`. */
  client: string;
  /** Expressions that choose where the request goes. */
  targets: TSESTree.Node[];
}

/** The request this call sends, or `undefined` when it is not one. */
export function httpRequestOf(
  node: TSESTree.CallExpression,
  scope: TSESLint.Scope.Scope,
  builtBy: (node: TSESTree.Node) => Construction | undefined,
): HttpRequest | undefined {
  const client = clientOf(node.callee, scope, builtBy);
  if (client === undefined) return undefined;
  const first = node.arguments[0];
  if (first === undefined) return { client, targets: [] };
  if (first.type !== 'ObjectExpression') return { client, targets: [first] };
  const targets: TSESTree.Node[] = [];
  for (const prop of first.properties) {
    if (prop.type !== 'Property') continue;
    const key = objectKeyName(prop);
    if (key !== null && URL_OPTION_KEYS.has(key)) targets.push(prop.value);
  }
  return { client, targets };
}

function clientOf(
  callee: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
  builtBy: (node: TSESTree.Node) => Construction | undefined,
): string | undefined {
  // The global fetch — not a local or imported function of that name.
  if (
    callee.type === 'Identifier' &&
    callee.name === 'fetch' &&
    !lookupVariable('fetch', scope)?.defs.length
  )
    return 'fetch';
  // A binding into a relative module (`import { api } from './http'`) is
  // followed below, to the instance that module builds.
  const binding = resolveModuleBinding(callee, scope);
  const exports = binding && REQUEST_EXPORTS[binding.module];
  if (exports !== undefined) {
    const path = binding!.path.join('.');
    if (!exports.has(path)) return undefined;
    return path === '' ? binding!.module : `${binding!.module}.${path}`;
  }
  // `const api = axios.create({ baseURL }); api(url)` / `api.get(url)`.
  let method: string | null = null;
  let receiver = callee;
  if (callee.type === 'MemberExpression') {
    method = propertyName(callee);
    if (method === null || !VERB_METHODS.has(method)) return undefined;
    receiver = callee.object;
  }
  const instance = builtBy(receiver);
  if (
    instance === undefined ||
    INSTANCE_FACTORIES[instance.module] !== instance.path.join('.')
  )
    return undefined;
  return method === null ? instance.module : `${instance.module}.${method}`;
}
