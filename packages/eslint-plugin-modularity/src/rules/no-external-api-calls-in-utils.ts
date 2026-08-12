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
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
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
  return patterns.some(pattern => {
    const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
    return regex.test(filename);
  });
}

/**
 * Innermost object of a member chain: `a.b.c` -> `a`
 */
function rootName(node: TSESTree.Node): string | null {
  let current: TSESTree.Node = node;
  while (current.type === 'MemberExpression') {
    current = current.object;
  }
  return current.type === 'Identifier' ? current.name : null;
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
        documentationLink: 'https://rules.sonarsource.com/javascript/RSPEC-1075/',
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
        documentationLink: 'https://martinfowler.com/eaaCatalog/serviceLayer.html',
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
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const {
      httpModules = DEFAULT_HTTP_MODULES,
      ignoreInTests = true,
      networkMethods = DEFAULT_NETWORK_METHODS,
      utilityPatterns = DEFAULT_UTILITY_PATTERNS,
    }: Options = options || {};

    const filename = context.filename;
    const isTestFile = ignoreInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (isTestFile) {
      return {};
    }

    const isUtility = isUtilityFile(filename, utilityPatterns);

    if (!isUtility) {
      return {};
    }

    const modules = new Set(httpModules);
    const methods = new Set(networkMethods);
    // Explicit `object.method` pairs stay name-based — an escape hatch for
    // in-house clients the import tracking can't know about.
    const explicitPairs = new Set(networkMethods.filter(method => method.includes('.')));

    /** Identifiers known to hold an HTTP client. */
    const clients = new Set<string>(GLOBAL_CLIENTS);
    for (const source of modules) {
      const bare = source.replace(/^node:/, '');
      if (/^[A-Za-z_$][\w$]*$/.test(bare) && !AMBIGUOUS_MODULE_NAMES.has(bare)) {
        clients.add(bare);
      }
    }

    // `const api = axios.create()` — resolved to a fixpoint on Program:exit so
    // declaration order doesn't matter.
    const aliases: Array<[local: string, root: string]> = [];
    const calls: TSESTree.CallExpression[] = [];

    function trackBinding(id: TSESTree.Node) {
      if (id.type === 'Identifier') {
        clients.add(id.name);
      } else if (id.type === 'ObjectPattern') {
        for (const property of id.properties) {
          if (property.type === 'Property' && property.value.type === 'Identifier') {
            clients.add(property.value.name);
          }
        }
      }
    }

    /**
     * A call is a network call only when its callee resolves to an HTTP client
     */
    function isNetworkCall(node: TSESTree.CallExpression): boolean {
      const callee = node.callee;

      if (callee.type === 'Identifier') {
        return clients.has(callee.name);
      }

      if (
        callee.type !== 'MemberExpression' ||
        callee.computed ||
        callee.property.type !== 'Identifier'
      ) {
        return false;
      }

      const method = callee.property.name;
      const root = rootName(callee.object);

      if (root === null) {
        return false;
      }
      if (explicitPairs.has(`${root}.${method}`)) {
        return true;
      }
      if (GLOBAL_CLIENT_HOSTS.has(root)) {
        return GLOBAL_CLIENTS.has(method);
      }
      return clients.has(root) && methods.has(method);
    }

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        if (node.importKind === 'type' || !modules.has(node.source.value)) {
          return;
        }
        for (const specifier of node.specifiers) {
          if (specifier.type !== 'ImportSpecifier' || specifier.importKind !== 'type') {
            clients.add(specifier.local.name);
          }
        }
      },
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (!node.init) {
          return;
        }
        const source = requiredModule(node.init);
        if (source !== null) {
          if (modules.has(source)) {
            trackBinding(node.id);
          }
          return;
        }
        // `const api = axios.create()` / `const send = axios.post`
        const root = rootName(node.init.type === 'CallExpression' ? node.init.callee : node.init);
        if (root !== null && node.id.type === 'Identifier') {
          aliases.push([node.id.name, root]);
        }
      },
      CallExpression(node: TSESTree.CallExpression) {
        calls.push(node);
      },
      'Program:exit'() {
        let changed = true;
        while (changed) {
          changed = false;
          for (const [local, root] of aliases) {
            if (clients.has(root) && !clients.has(local)) {
              clients.add(local);
              changed = true;
            }
          }
        }

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

