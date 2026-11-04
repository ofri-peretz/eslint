/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-external-api-calls-in-utils
 * Detects network calls in utility functions
 *
 * @see https://rules.sonarsource.com/javascript/RSPEC-1075/
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  formatLLMMessage,
  isGlobalReference,
  MessageIcons,
  propertyName,
  variableOf,
} from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds =
  | 'externalApiCallInUtils'
  | 'useDependencyInjection'
  | 'extractToService'
  | 'passApiClient';

export interface Options {
  httpModules?: string[];
  ignoreInTests?: boolean;
  networkMethods?: string[];
  utilityPatterns?: string[];
}

type RuleOptions = [Options?];

/**
 * Modules whose imports/requires are HTTP clients. A `.get()` only counts as a
 * network call when its receiver resolves back to one of these (or to `fetch`)
 * — `Map`, `Set`, `Headers`, `URLSearchParams` and `Cache` all share the
 * `get`/`set`/`delete` method names and must stay silent.
 */
const DEFAULT_HTTP_MODULES = [
  'axios',
  'got',
  'ky',
  'node-fetch',
  'undici',
  'superagent',
  'request',
  'phin',
  'needle',
  'http',
  'https',
  'http2',
  'node:http',
  'node:https',
  'node:http2',
];

const DEFAULT_NETWORK_METHODS = [
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'head',
  'options',
  'request',
  'fetch',
  'all',
  'stream',
];

const DEFAULT_UTILITY_PATTERNS = ['**/utils/**', '**/helpers/**', '**/lib/**'];

/** Globals that are HTTP clients on their own. */
const GLOBAL_CLIENTS = new Set(['fetch']);

/** Objects that host the global `fetch` (`window.fetch(...)`). */
const GLOBAL_CLIENT_HOSTS = new Set(['window', 'globalThis', 'global', 'self']);

/**
 * Module names too generic to treat as an HTTP client without an import —
 * `request.get('host')` on an Express request is far more common than the
 * `request` package, and `got` is an ordinary English word.
 */
const AMBIGUOUS_MODULE_NAMES = new Set(['request', 'got']);

/**
 * Check if file is a utility file
 */
function isUtilityFile(filename: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    const regex = new RegExp(
      pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'),
    );
    return regex.test(filename);
  });
}

/** How many `const a = b.create()` links a client may be derived through. */
const MAX_ALIAS_HOPS = 8;

/**
 * Innermost identifier of a member chain: `a.b.c` -> `a`
 */
function rootIdentifier(node: TSESTree.Node): TSESTree.Identifier | null {
  let current: TSESTree.Node = node;
  while (current.type === 'MemberExpression') {
    current = current.object;
  }
  return current.type === 'Identifier' ? current : null;
}

/**
 * Module specifier of `require('x')`, or null when the node is not a require
 */
function requiredModule(node: TSESTree.Node): string | null {
  if (
    node.type === 'CallExpression' &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'require' &&
    node.arguments[0]?.type === 'Literal' &&
    typeof node.arguments[0].value === 'string'
  ) {
    return node.arguments[0].value;
  }
  return null;
}

export const noExternalApiCallsInUtils = createRule<RuleOptions, MessageIds>({
  name: 'no-external-api-calls-in-utils',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-modularity/docs/rules/no-external-api-calls-in-utils.md',
      description: 'Detects network calls in utility functions',
    },
    hasSuggestions: true,
    messages: {
      externalApiCallInUtils: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'External API call in utils',
        description: 'Network call in utility function - breaks testability',
        severity: 'HIGH',
        fix: 'Use dependency injection for network calls',
        documentationLink:
          'https://rules.sonarsource.com/javascript/RSPEC-1075/',
      }),
      useDependencyInjection: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Dependency Injection',
        description: 'Inject API client',
        severity: 'LOW',
        fix: 'function util(apiClient) { return apiClient.get(...) }',
        documentationLink: 'https://en.wikipedia.org/wiki/Dependency_injection',
      }),
      extractToService: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Extract to Service',
        description: 'Extract to service layer',
        severity: 'LOW',
        fix: 'Create services/apiService.ts',
        documentationLink:
          'https://martinfowler.com/eaaCatalog/serviceLayer.html',
      }),
      passApiClient: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Pass API Client',
        description: 'Pass API client as parameter',
        severity: 'LOW',
        fix: 'function util(apiClient, data) { ... }',
        documentationLink: 'https://en.wikipedia.org/wiki/Dependency_injection',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          httpModules: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_HTTP_MODULES,
          },
          ignoreInTests: {
            type: 'boolean',
            default: true,
          },
          networkMethods: {
            description:
              'HTTP method names to flag. A bare name ("get") applies only when the receiver resolves to a known HTTP client. A dotted entry ("httpClient.get") is an exact object.method escape hatch that bypasses client resolution entirely — use it for an in-house client this rule cannot trace.',
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_NETWORK_METHODS,
          },
          utilityPatterns: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_UTILITY_PATTERNS,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      httpModules: DEFAULT_HTTP_MODULES,
      ignoreInTests: true,
      networkMethods: DEFAULT_NETWORK_METHODS,
      utilityPatterns: DEFAULT_UTILITY_PATTERNS,
    },
  ],
  createOnce(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    currentOptions,
  ) {
    let modules: Set<string>;
    let methods: Set<string>;
    let explicitPairs: Set<string>;
    /** Module names usable as an undeclared global (`axios` from a CDN). */
    let globalClients: Set<string>;
    let calls: TSESTree.CallExpression[];

    /**
     * Does this identifier hold an HTTP client, by its binding?
     *
     * A parameter is never one: a client passed in is the dependency injection
     * this rule recommends, so `function load(axios) { axios.get(u) }` and a
     * parameter named `fetch` are the fix, not the finding. An import or
     * require of an HTTP module is one, and so is a const derived from one
     * (`const api = axios.create()`). An undeclared name keeps the name match
     * (the global `fetch`, a CDN `axios`).
     */
    function isClient(id: TSESTree.Identifier, hops = 0): boolean {
      const variable = variableOf(id, context.sourceCode);
      if (!variable || variable.defs.length === 0) {
        return globalClients.has(id.name);
      }
      const def = variable.defs[0];
      if (def.type === 'ImportBinding') {
        const declaration = def.parent as TSESTree.ImportDeclaration;
        return (
          declaration.importKind !== 'type' &&
          modules.has(String(declaration.source.value))
        );
      }
      if (def.type !== 'Variable' || def.node.init === null) return false;
      const init = def.node.init;
      const source = requiredModule(init);
      if (source !== null) return modules.has(source);
      // `const api = axios.create()` / `const send = axios.post`
      if (def.node.id.type !== 'Identifier' || hops >= MAX_ALIAS_HOPS)
        return false;
      const root = rootIdentifier(
        init.type === 'CallExpression' ? init.callee : init,
      );
      return root !== null && isClient(root, hops + 1);
    }

    /**
     * A call is a network call only when its callee resolves to an HTTP client
     */
    function isNetworkCall(node: TSESTree.CallExpression): boolean {
      const callee = node.callee;
      if (callee.type === 'Identifier') {
        return isClient(callee);
      }
      if (callee.type !== 'MemberExpression') {
        return false;
      }
      // `axios['post'](url)` calls the same method `axios.post` does.
      const method = propertyName(callee);
      const root = rootIdentifier(callee.object);
      if (method === null || root === null) {
        return false;
      }
      // Explicit `object.method` pairs stay name-based: an escape hatch the
      // project configures for an in-house client the rule cannot trace.
      if (explicitPairs.has(`${root.name}.${method}`)) {
        return true;
      }
      if (
        GLOBAL_CLIENT_HOSTS.has(root.name) &&
        isGlobalReference(root, context.sourceCode)
      ) {
        return GLOBAL_CLIENTS.has(method);
      }
      return methods.has(method) && isClient(root);
    }

    return {
      before() {
        const [options = {}] = currentOptions();
        const {
          httpModules = DEFAULT_HTTP_MODULES,
          ignoreInTests = true,
          networkMethods = DEFAULT_NETWORK_METHODS,
          utilityPatterns = DEFAULT_UTILITY_PATTERNS,
        }: Options = options || {};

        const filename = context.filename;
        const isTestFile =
          ignoreInTests && /\.(test|spec)\.[cm]?[jt]sx?$/.test(filename);
        if (isTestFile) {
          return false;
        }
        const isUtility = isUtilityFile(filename, utilityPatterns);
        if (!isUtility) {
          return false;
        }

        modules = new Set(httpModules);
        methods = new Set(networkMethods);
        explicitPairs = new Set(
          networkMethods.filter((method) => method.includes('.')),
        );
        globalClients = new Set<string>(GLOBAL_CLIENTS);
        for (const source of modules) {
          const bare = source.replace(/^node:/, '');
          if (
            /^[A-Za-z_$][\w$]*$/.test(bare) &&
            !AMBIGUOUS_MODULE_NAMES.has(bare)
          ) {
            globalClients.add(bare);
          }
        }
        calls = [];
        return true;
      },
      CallExpression(node: TSESTree.CallExpression) {
        calls.push(node);
      },
      'Program:exit'() {
        for (const node of calls) {
          if (!isNetworkCall(node)) {
            continue;
          }
          context.report({
            node,
            messageId: 'externalApiCallInUtils',
            suggest: [
              {
                messageId: 'useDependencyInjection',
                fix: () => null,
              },
              {
                messageId: 'extractToService',
                fix: () => null,
              },
              {
                messageId: 'passApiClient',
                fix: () => null,
              },
            ],
          });
        }
      },
    };
  },
});
