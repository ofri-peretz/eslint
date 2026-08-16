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
  unwrapTypeSyntax,
} from '@interlace/eslint-devkit';
import { bindingInit } from '../../utils/provenance';

type MessageIds = 'ssrfVulnerability';

export interface Options {
  /** Ignore in test files. Default: true */
  allowInTests?: boolean;

  /**
   * Report a URL argument that is a bare user-input-*named* identifier whose
   * value cannot be traced to a request. Default: `false`.
   *
   * `true` restores the naming heuristic this rule shipped with. Measured on an
   * 8-repo corpus it produced 16 findings and no SSRF — see the note on
   * {@link carriesUntrustedUrl}.
   */
  reportUnresolvedUrls?: boolean;
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
// `needle.get(url)` is covered here; the `needle('get', url)` verb-first form
// is not — the URL sits in argument 1, and this rule only reads argument 0.
const HTTP_CLIENT_OBJECTS = new Set([
  'axios', 'got', 'superagent', 'request', 'http', 'https', 'undici', 'needle',
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

// Object roots whose members carry attacker-controlled data in the common
// server frameworks: Express `req`/`request`, Koa `ctx`, Lambda `event`.
const REQUEST_ROOT_NAMES = new Set(['req', 'request', 'ctx', 'event']);

// Keys of a Node `http.request(options)` object that actually name a URL.
// `host`/`hostname`/`path`/`port` are deliberately absent: a helper that
// parameterises them is ordinary internal plumbing, not evidence of user flow.
const URL_OPTION_KEYS = new Set(['url', 'href', 'uri']);

/**
 * True when the expression reads off a request object — `req.query.url`,
 * `ctx.request.body.target`, `event.queryStringParameters.u`. Everything
 * hanging off a request is untrusted, so the root name is the whole test.
 */
function isRequestSourced(node: TSESTree.Node): boolean {
  let current: TSESTree.Node = node;
  while (current.type === AST_NODE_TYPES.MemberExpression) {
    current = current.object;
  }
  return (
    current !== node &&
    current.type === AST_NODE_TYPES.Identifier &&
    REQUEST_ROOT_NAMES.has(current.name.toLowerCase())
  );
}

/**
 * Does the URL argument carry untrusted data into the request?
 *
 * The rule reports on evidence of flow, never on the mere presence of a
 * dynamic argument. Two shapes qualify:
 *
 *   1. Any part of the expression reads from a request object —
 *      `fetch(req.query.url)`, `https.request({ host: req.query.h })`, or an
 *      identifier whose single binding traces back to one.
 *   2. A template literal URL interpolates either of the above —
 *      `fetch(\`https://\${req.params.host}/x\`)`.
 *
 * Everything else is not evidence. In particular an options object whose
 * fields are plain locals — `https.request({ host, path, method: 'GET' })`,
 * benchmarks/corpus/CWE-444/safe/request-default-parser.js — used to be
 * reported unconditionally because a non-Identifier argument bypassed the
 * name gate entirely.
 *
 * A THIRD shape used to qualify: a bare user-input-*named* identifier —
 * `fetch(url)` reported because the parameter is called `url`. That was the
 * rule's entire remaining output on the 8-repo corpus: 16 of 16 findings, every
 * one of them an HTTP wrapper whose URL parameter is, unavoidably, named `url`.
 *
 * A name in URL position is not evidence of anything. Every HTTP client ever
 * written has `function get(url)` in it, so the heuristic fires on the *shape
 * of an HTTP library* rather than on a flow from an attacker. It is retained
 * behind `reportUnresolvedUrls` for projects that want the prompt.
 *
 * What replaces it is a hop through the binding: `const target = req.body.url;
 * fetch(target)` is now reported *because the value comes from the request*,
 * which the old name check caught only by coincidence and missed entirely when
 * the local was called something else.
 */
function makeCarriesUntrustedUrl(
  sourceCode: TSESLint.SourceCode,
  reportUnresolvedUrls: boolean,
): (node: TSESTree.Node) => boolean {
  const carries = (node: TSESTree.Node, depth: number): boolean => {
    if (depth > 6) return false;

    // `fetch(req.query.url as string)` — the cast is erased at compile time and
    // reads exactly what `req.query.url` reads. Without this the switch falls
    // through to `default: return false`, and since Express types
    // `req.query.url` as `string | string[] | ParsedQs | undefined`, the cast is
    // MANDATORY for a TypeScript handler to compile. The rule was therefore
    // silent on TypeScript Express code — the shape most of its audience writes.
    const bare = unwrapTypeSyntax(node);
    if (bare !== node) return carries(bare, depth + 1);

    switch (node.type) {
      case AST_NODE_TYPES.Identifier: {
        const init = bindingInit(sourceCode, node);
        if (init !== undefined) return carries(init, depth + 1);
        return reportUnresolvedUrls && isUserInputParamName(node.name);
      }

      case AST_NODE_TYPES.MemberExpression:
        // `req.query.url` directly, or a chain whose ROOT is a local that was
        // itself read off the request (`const raw = req.body; raw.callbackUrl`).
        return isRequestSourced(node) || carries(node.object, depth + 1);

      case AST_NODE_TYPES.TemplateLiteral:
        return node.expressions.some((expression) => carries(expression, depth + 1));

      // `new URL(userUrl)` / `String(req.query.url)` — inspect the arguments.
      case AST_NODE_TYPES.CallExpression:
      case AST_NODE_TYPES.NewExpression:
        return node.arguments.some((argument) => carries(argument, depth + 1));

      // `'https://host' + userPath`
      case AST_NODE_TYPES.BinaryExpression:
        return (
          carries(node.left as TSESTree.Node, depth + 1) || carries(node.right, depth + 1)
        );

      // `http.request({ url: x, host: y })` — only URL-naming keys count by
      // name; every other key still counts if its value is request-sourced.
      case AST_NODE_TYPES.ObjectExpression:
        return node.properties.some(property => {
          if (property.type !== AST_NODE_TYPES.Property) return false;
          const value = property.value as TSESTree.Node;
          if (isRequestSourced(value)) return true;
          const key =
            property.key.type === AST_NODE_TYPES.Identifier
              ? property.key.name
              : property.key.type === AST_NODE_TYPES.Literal
                ? String(property.key.value)
                : '';
          return URL_OPTION_KEYS.has(key.toLowerCase()) && carries(value, depth + 1);
        });

      default:
        return false;
    }
  };
  return (node: TSESTree.Node) => carries(node, 0);
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
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/no-ssrf.md',
      description:
        'Flags HTTP calls whose URL argument is a user-input-named identifier or reads off a request object — a heuristic prompt for code review, not a proof of SSRF',
      cwe: 'CWE-918',
      cvss: 9.1,
    },
    messages: {
      ssrfVulnerability: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Possible SSRF — heuristic (CWE-918)',
        cwe: 'CWE-918',
        description:
          'HTTP call whose URL argument name suggests user input. This is a naming heuristic, not data-flow analysis — review whether the URL could originate from an untrusted source at runtime.',
        severity: 'LOW',
        fix: 'If the URL comes from user input, validate it against an allowlist of permitted hosts before making the request.',
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
          reportUnresolvedUrls: {
            type: 'boolean',
            default: false,
            description:
              'Report a URL argument that is a user-input-named identifier with no traceable request source. Restores the pre-inversion naming heuristic.',
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
    const { allowInTests = true, reportUnresolvedUrls = false }: Options = options || {};
    const carriesUntrustedUrl = makeCarriesUntrustedUrl(
      context.sourceCode,
      reportUnresolvedUrls,
    );

    const filename = context.filename;
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

        // Static URLs — fetch('https://api.example.com'), fetch(`https://…`) —
        // carry nothing untrusted and fall out at the evidence gate below.

        // Check if there is URL validation before this call
        if (hasValidationBefore(node)) {
          return;
        }

        // Require evidence that untrusted data reaches the URL. Applies to
        // every argument shape — an options object or a template literal used
        // to bypass this gate entirely and report unconditionally.
        if (!carriesUntrustedUrl(urlArg as TSESTree.Node)) {
          return;
        }

        context.report({
          node,
          messageId: 'ssrfVulnerability',
        });
      },
    };
  },
});
