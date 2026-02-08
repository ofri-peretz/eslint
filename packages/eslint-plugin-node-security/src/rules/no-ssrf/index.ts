/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-ssrf
 * Detects Server-Side Request Forgery (SSRF) vulnerabilities where
 * user-controlled URLs are passed to HTTP client functions without validation.
 *
 * CWE-918: Server-Side Request Forgery (SSRF)
 *
 * @see https://cwe.mitre.org/data/definitions/918.html
 * @see https://owasp.org/www-community/attacks/Server_Side_Request_Forgery
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'ssrfVulnerability';

export interface Options {
  /** Ignore in test files. Default: true */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

// HTTP client functions that make outbound requests
const HTTP_CLIENT_FUNCTIONS = new Set([
  'fetch',       // built-in / node-fetch
  'got',         // got
  'nodeFetch',   // node-fetch
  'undici',      // undici
]);

// HTTP client method calls (e.g., axios.get, http.request)
const HTTP_CLIENT_METHODS = new Set([
  'get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'request',
]);

// Object names that are HTTP client libraries
const HTTP_CLIENT_OBJECTS = new Set([
  'axios', 'got', 'superagent', 'request', 'http', 'https', 'undici',
]);

// Function names that indicate URL validation
const VALIDATION_FUNCTION_NAMES = new Set([
  'validateUrl', 'validateURL', 'isValidUrl', 'isSafeUrl', 'isAllowed',
  'isValidURL', 'checkUrl', 'checkURL', 'sanitizeUrl', 'sanitizeURL',
]);

// Substrings in identifier names that suggest user input
const USER_INPUT_SUBSTRINGS = [
  'url', 'endpoint', 'uri', 'href', 'link',
  'target', 'dest', 'source', 'host',
  'user', 'input', 'param',
];

/**
 * Check if a function parameter name suggests user input
 */
function isUserInputParamName(name: string): boolean {
  const lower = name.toLowerCase();
  return USER_INPUT_SUBSTRINGS.some(sub => lower.includes(sub));
}

/**
 * AST-based check: does this node contain a validation pattern?
 * Walks the node tree looking for known validation constructs.
 */
function nodeContainsValidation(node: TSESTree.Node): boolean {
  // new URL(x) — URL constructor (parsing/validation)
  if (
    node.type === AST_NODE_TYPES.NewExpression &&
    node.callee.type === AST_NODE_TYPES.Identifier &&
    node.callee.name === 'URL'
  ) {
    return true;
  }

  // validateUrl(x), isValidUrl(x), etc.
  if (
    node.type === AST_NODE_TYPES.CallExpression &&
    node.callee.type === AST_NODE_TYPES.Identifier &&
    VALIDATION_FUNCTION_NAMES.has(node.callee.name)
  ) {
    return true;
  }

  // arr.includes(x), set.has(x), x.startsWith('...'), regex.test(x)
  if (
    node.type === AST_NODE_TYPES.CallExpression &&
    node.callee.type === AST_NODE_TYPES.MemberExpression &&
    node.callee.property.type === AST_NODE_TYPES.Identifier
  ) {
    const method = node.callee.property.name;
    if (method === 'includes' || method === 'has' || method === 'startsWith' || method === 'test' || method === 'some') {
      return true;
    }
  }

  // hostname === '...' or host === '...'
  if (
    node.type === AST_NODE_TYPES.BinaryExpression &&
    (node.operator === '===' || node.operator === '==') &&
    (
      (node.left.type === AST_NODE_TYPES.MemberExpression &&
       node.left.property.type === AST_NODE_TYPES.Identifier &&
       (node.left.property.name === 'hostname' || node.left.property.name === 'host')) ||
      (node.right.type === AST_NODE_TYPES.MemberExpression &&
       node.right.property.type === AST_NODE_TYPES.Identifier &&
       (node.right.property.name === 'hostname' || node.right.property.name === 'host'))
    )
  ) {
    return true;
  }

  // throw new Error(...) — guard clause
  if (node.type === AST_NODE_TYPES.ThrowStatement) {
    return true;
  }

  // Keys to skip: non-child properties that cause circular refs or aren't AST children
  const SKIP_KEYS = new Set(['parent', 'range', 'loc', 'tokens', 'comments', 'start', 'end']);

  // Recurse into child nodes
  for (const key of Object.keys(node)) {
    if (SKIP_KEYS.has(key)) continue;
    const value = (node as unknown as Record<string, unknown>)[key];
    if (value && typeof value === 'object' && 'type' in (value as Record<string, unknown>)) {
      if (nodeContainsValidation(value as TSESTree.Node)) return true;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item && typeof item === 'object' && 'type' in item) {
          if (nodeContainsValidation(item as TSESTree.Node)) return true;
        }
      }
    }
  }

  return false;
}

/**
 * Check if there is URL validation before the HTTP call using AST walking
 */
function hasValidationBefore(node: TSESTree.CallExpression): boolean {
  // Walk up to find the containing block
  let current: TSESTree.Node | undefined = (node as TSESTree.Node & { parent?: TSESTree.Node }).parent;
  while (current) {
    const parent: TSESTree.Node | undefined = (current as TSESTree.Node & { parent?: TSESTree.Node }).parent;
    if (!parent) break;

    if (parent.type === AST_NODE_TYPES.BlockStatement || parent.type === AST_NODE_TYPES.Program) {
      const body = parent.body;
      const idx = body.indexOf(current as TSESTree.Statement);

      // Check previous sibling statements for validation patterns
      for (let i = idx - 1; i >= 0 && i >= idx - 10; i--) {
        if (nodeContainsValidation(body[i])) {
          return true;
        }
      }
    }

    // Check if inside an if-block where the condition contains validation
    if (parent.type === AST_NODE_TYPES.IfStatement && parent.test) {
      if (nodeContainsValidation(parent.test)) {
        return true;
      }
    }

    current = parent;
  }

  return false;
}

export const noSsrf = createRule<RuleOptions, MessageIds>({
  name: 'no-ssrf',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Detects HTTP requests with user-controlled URLs (SSRF vulnerability)',
    },
    messages: {
      ssrfVulnerability: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Server-Side Request Forgery (SSRF)',
        cwe: 'CWE-918',
        description:
          'HTTP request with potentially user-controlled URL. An attacker could access internal services.',
        severity: 'HIGH',
        fix: 'Validate URL against an allowlist of permitted hosts before making the request.',
        documentationLink:
          'https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: true,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInTests: true }],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const { allowInTests = true }: Options = options || {};

    const filename = context.filename || context.getFilename();
    const isTestFile =
      allowInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);
    if (isTestFile) return {};

    return {
      CallExpression(node: TSESTree.CallExpression) {
        let isHttpCall = false;

        // 1. Direct function call: fetch(url), got(url)
        if (
          node.callee.type === AST_NODE_TYPES.Identifier &&
          HTTP_CLIENT_FUNCTIONS.has(node.callee.name)
        ) {
          isHttpCall = true;
        }

        // 2. Method call: axios.get(url), http.request(url)
        if (
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.object.type === AST_NODE_TYPES.Identifier &&
          node.callee.property.type === AST_NODE_TYPES.Identifier &&
          HTTP_CLIENT_OBJECTS.has(node.callee.object.name) &&
          HTTP_CLIENT_METHODS.has(node.callee.property.name)
        ) {
          isHttpCall = true;
        }

        if (!isHttpCall) return;

        // Check the first argument (the URL)
        const urlArg = node.arguments[0];
        if (!urlArg) return;

        // Safe: literal string URL — fetch('https://api.example.com')
        if (urlArg.type === AST_NODE_TYPES.Literal) return;

        // Safe: template literal without expressions — fetch(`https://api.example.com`)
        if (
          urlArg.type === AST_NODE_TYPES.TemplateLiteral &&
          urlArg.expressions.length === 0
        ) {
          return;
        }

        // The URL is dynamic (identifier, template with expressions, etc.)
        // Check if there is URL validation before this call
        if (hasValidationBefore(node)) {
          return;
        }

        // Check if the argument is a function parameter that looks like user input
        if (urlArg.type === AST_NODE_TYPES.Identifier) {
          // If the variable name doesn't suggest user input, skip
          // This reduces false positives on internal API calls
          if (!isUserInputParamName(urlArg.name)) {
            return;
          }
        }

        context.report({
          node,
          messageId: 'ssrfVulnerability',
        });
      },
    };
  },
});
