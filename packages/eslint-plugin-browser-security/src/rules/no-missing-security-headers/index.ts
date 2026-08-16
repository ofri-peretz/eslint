/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-missing-security-headers
 * Detects missing security headers in HTTP responses
 * CWE-693: Protection Mechanism Failure
 * 
 * @see https://cwe.mitre.org/data/definitions/693.html
 * @see https://owasp.org/www-project-secure-headers/
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds =
  | 'missingSecurityHeader';

export interface Options {
  /** Required security headers. Default: ['Content-Security-Policy', 'X-Frame-Options', 'X-Content-Type-Options'] */
  requiredHeaders?: string[];
  
  /** Ignore in test files. Default: true */
  ignoreInTests?: boolean;
}

type RuleOptions = [Options?];

const DEFAULT_REQUIRED_HEADERS = [
  'Content-Security-Policy',
  'X-Frame-Options',
  'X-Content-Type-Options',
];

/**
 * Headers whose presence says nothing about serving a document — transport, caching and
 * redirect concerns. A scope that sets ONLY these is not rendering markup.
 */
const NON_DOCUMENT_HEADERS = new Set([
  'Set-Cookie',
  'Cache-Control',
  'Location',
  'Content-Disposition',
  'ETag',
  'Last-Modified',
  'Expires',
  'Vary',
]);

/**
 * Response headers this rule can recognise by name.
 *
 * Needed because `set` is in the trigger list and `set` is one of the most
 * common method names in JavaScript. Before this existed the rule reported
 *
 * ```js
 * featureFlags.set('newCheckout', true);   // "Missing security headers:
 *                                          //  Content-Security-Policy, …"
 * ```
 *
 * at CVSS 7.5, on a feature-flag map. `setHeader` and `header` are distinctive
 * enough to stand alone — `setHeader` is Node's ServerResponse API and
 * `header` is Express's — but `set` needs a second piece of evidence, and the
 * only one available at the call site is the header it names. Exact membership
 * against a closed list, never a substring test.
 */
const KNOWN_RESPONSE_HEADERS: ReadonlySet<string> = new Set(
  [
    // Security
    'Content-Security-Policy',
    'Content-Security-Policy-Report-Only',
    'X-Frame-Options',
    'X-Content-Type-Options',
    'X-XSS-Protection',
    'Strict-Transport-Security',
    'Referrer-Policy',
    'Permissions-Policy',
    'Feature-Policy',
    'Cross-Origin-Opener-Policy',
    'Cross-Origin-Embedder-Policy',
    'Cross-Origin-Resource-Policy',
    'X-Permitted-Cross-Domain-Policies',
    'X-DNS-Prefetch-Control',
    'X-Download-Options',
    'Origin-Agent-Cluster',
    'Report-To',
    'Reporting-Endpoints',
    'Clear-Site-Data',
    // CORS
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Credentials',
    'Access-Control-Allow-Methods',
    'Access-Control-Allow-Headers',
    'Access-Control-Expose-Headers',
    'Access-Control-Max-Age',
    'Timing-Allow-Origin',
    // Entity / transport / caching
    'Content-Type',
    'Content-Length',
    'Content-Encoding',
    'Content-Language',
    'Content-Disposition',
    'Content-Range',
    'Cache-Control',
    'Pragma',
    'Expires',
    'ETag',
    'Last-Modified',
    'Age',
    'Vary',
    'Location',
    'Set-Cookie',
    'Server',
    'Retry-After',
    'Link',
    'Accept-Ranges',
    'Transfer-Encoding',
    'WWW-Authenticate',
  ].map((h) => h.toLowerCase()),
);

/** Methods that name an HTTP header on sight, with no further evidence needed. */
const UNAMBIGUOUS_HEADER_METHODS: ReadonlySet<string> = new Set([
  'setHeader',
  'header',
]);

/**
 * Extract header name from setHeader call
 */
function extractHeaderName(node: TSESTree.CallExpression): string | null {
  if (node.arguments.length > 0 && node.arguments[0].type === 'Literal') {
    return String(node.arguments[0].value);
  }
  return null;
}

/**
 * Is this call setting an HTTP response header?
 *
 * `requiredHeaders` joins the closed list so a project that configures a
 * header we have never heard of still gets `res.set('X-Whatever', …)`
 * recognised for it.
 */
function isHeaderSet(
  node: TSESTree.CallExpression,
  requiredHeaders: readonly string[],
): boolean {
  if (
    node.callee.type !== 'MemberExpression' ||
    node.callee.computed ||
    node.callee.property.type !== 'Identifier'
  ) {
    return false;
  }
  const method = node.callee.property.name;
  if (UNAMBIGUOUS_HEADER_METHODS.has(method)) return true;
  if (method !== 'set') return false;

  const name = extractHeaderName(node)?.toLowerCase();
  if (name === undefined) return false;
  return (
    KNOWN_RESPONSE_HEADERS.has(name) ||
    requiredHeaders.some((h) => h.toLowerCase() === name)
  );
}

/**
 * Check if all security headers are set in the current scope
 */
function checkFunctionForSecurityHeaders(
  node: TSESTree.CallExpression,
  requiredHeaders: string[],
  context: TSESLint.RuleContext<MessageIds, RuleOptions>
): string[] {
  const setHeaders = new Set<string>();

  // Find the function that contains this setHeader call
  let current: TSESTree.Node | null = node;
  let scopeNode: TSESTree.Node | null = null;

  while (current) {
    if (current.type === 'FunctionDeclaration' ||
        current.type === 'FunctionExpression' ||
        current.type === 'ArrowFunctionExpression') {
      scopeNode = current;
      break;
    }
    current = (current as TSESTree.Node & { parent?: TSESTree.Node }).parent ?? null;
  }

  // If no function found, use the program scope (for test cases)
  if (!scopeNode) {
    scopeNode = context.sourceCode.ast;
  }

  // Collect all setHeader calls in this scope
  function collectHeaders(astNode: TSESTree.Node): void {
    if (astNode.type === 'CallExpression' && isHeaderSet(astNode, requiredHeaders)) {
      const headerName = extractHeaderName(astNode);
      if (headerName) {
        setHeaders.add(headerName);
      }
    }

    // Recursively check children - only traverse standard AST properties
    if (astNode.type === 'Program' && astNode.body) {
      astNode.body.forEach(collectHeaders);
    } else if ((astNode.type === 'FunctionDeclaration' ||
                astNode.type === 'FunctionExpression' ||
                astNode.type === 'ArrowFunctionExpression') && astNode.body) {
      collectHeaders(astNode.body);
    } else if (astNode.type === 'BlockStatement' && astNode.body) {
      astNode.body.forEach(collectHeaders);
    } else if (astNode.type === 'ExpressionStatement' && astNode.expression) {
      collectHeaders(astNode.expression);
    }
  }

  // scopeNode is always set: either the enclosing function or (fallback
  // above) the Program node itself.
  collectHeaders(scopeNode);

  // CSP / X-Frame-Options / X-Content-Type-Options protect a RENDERED DOCUMENT. If the only
  // headers this scope touches are transport/caching concerns, there is no document to frame
  // or inject into and demanding them is noise — the rule fired on a plain
  // `res.setHeader('Set-Cookie', ...)` helper that renders nothing.
  //
  // Deliberately narrow: an EARLIER attempt required proof of a `res.send`/`render` call in
  // scope, which broke 9 tests. A RuleTester snippet sets a header without sending anything
  // because the snippet is truncated, not because the handler serves no document — absence
  // of a send call is not evidence of absence of a document.
  if (setHeaders.size > 0 && [...setHeaders].every((h) => NON_DOCUMENT_HEADERS.has(h))) {
    return [];
  }

  // Return missing headers
  return requiredHeaders.filter(header => !setHeaders.has(header));
}


export const noMissingSecurityHeaders = createRule<RuleOptions, MessageIds>({
  name: 'no-missing-security-headers',
  meta: {
    type: 'problem',
    deprecated: true,
    replacedBy: ['@see eslint-plugin-express-security/require-helmet'],
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/no-missing-security-headers.md',
      description: 'Detects missing security headers in HTTP responses',
      cwe: 'CWE-693',
      cvss: 7.5,
    },
    messages: {
      missingSecurityHeader: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing security headers',
        cwe: 'CWE-693',
        description: 'Missing security headers: {{headers}}',
        severity: 'HIGH',
        fix: 'Set security headers: Content-Security-Policy, X-Frame-Options, X-Content-Type-Options',
        documentationLink: 'https://owasp.org/www-project-secure-headers/',
      }),

    },
    schema: [
      {
        type: 'object',
        properties: {
          requiredHeaders: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_REQUIRED_HEADERS, description: 'Security headers a response must set'
          },
          ignoreInTests: {
            type: 'boolean',
            default: true,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      requiredHeaders: DEFAULT_REQUIRED_HEADERS,
      ignoreInTests: true,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const {
requiredHeaders = DEFAULT_REQUIRED_HEADERS,
      ignoreInTests = true,
    
}: Options = options || {};

    const filename = context.filename;
    const isTestFile = ignoreInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (isTestFile) {
      return {};
    }

    const reportedScopes = new Set<string>();

    /**
     * Get a unique key for the current scope
     */
    function getScopeKey(node: TSESTree.CallExpression): string {
      // Find the function that contains this call
      let current: TSESTree.Node | null = node;
      while (current) {
        if (current.type === 'FunctionDeclaration' ||
            current.type === 'FunctionExpression' ||
            current.type === 'ArrowFunctionExpression') {
          return `${current.range?.[0]}-${current.range?.[1]}`;
        }
        current = (current as TSESTree.Node & { parent?: TSESTree.Node }).parent ?? null;
      }
      // If no function found, use program scope
      return 'program';
    }

    /**
     * Check for response header setting
     */
    function checkCallExpression(node: TSESTree.CallExpression) {
      // res.setHeader / res.header always; res.set only when it names a header
      // — see isHeaderSet.
      if (!isHeaderSet(node, requiredHeaders)) {
        return;
      }

      const scopeKey = getScopeKey(node);

      // Only check once per scope
      if (reportedScopes.has(scopeKey)) {
        return;
      }

      const missing = checkFunctionForSecurityHeaders(node, requiredHeaders, context);

      // Mark as checked either way
      reportedScopes.add(scopeKey);

      if (missing.length > 0) {
        context.report({
          node,
          messageId: 'missingSecurityHeader',
          data: {
            headers: missing.join(', '),
          },
        });
      }
    }

    return {
      CallExpression: checkCallExpression,
    };
  },
});

