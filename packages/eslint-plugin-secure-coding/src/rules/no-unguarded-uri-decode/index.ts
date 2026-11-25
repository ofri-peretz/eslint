/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-unguarded-uri-decode
 * Detects `decodeURIComponent` / `decodeURI` on request or browser-location
 * input outside a `try` block that catches.
 * CWE-248: Uncaught Exception
 *
 * Both functions throw `URIError: URI malformed` on a `%` that does not start
 * a valid escape (`p%ss`, `%E0%A4%A`, a bare `%`). On input a client sends,
 * that is a 500 on demand or, outside a framework's error boundary, a dead
 * process. Intent: docs/intents/a-uri-decode-on-request-input-is-a-crash.
 *
 * ## What is reported
 *
 * - A call to the global `decodeURIComponent` or `decodeURI` whose argument
 *   reads request or location input, when no enclosing `try` with a `catch`
 *   in the same function surrounds it. Sources, by structure:
 *   - `req` / `request` / `ctx` and its `.url`, `.originalUrl`, `.path`,
 *     `.baseUrl`, `.params`, `.query`, `.headers`, `.cookies` (and
 *     `ctx.request.*`); exact names, not substrings.
 *   - the global `location` (also `window.location`, `document.location`),
 *     `document.URL`, `document.cookie`, `document.referrer`.
 *   - a variable in scope whose initializer (or destructuring source) is one
 *     of the above.
 * - A literal argument that does not decode: `decodeURIComponent('%E0%A4%A')`
 *   throws on every run.
 *
 * ## What is not reported
 *
 * - A literal that decodes, and any argument with no request or location
 *   input in it (a configured URL from `process.env` throws at startup, where
 *   the throw is the error report; see the intent's constraints).
 * - `url.searchParams.get(k)` and `URLSearchParams`: already decoded.
 * - A shadowed `decodeURIComponent` (a local function or import).
 * - A `try` in an outer function does not guard a callback defined inside it:
 *   the callback runs later, outside that `try`.
 *
 * @see https://cwe.mitre.org/data/definitions/248.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
  propertyName,
  staticString,
} from '@interlace/eslint-devkit';

type MessageIds = 'unguardedDecode' | 'malformedLiteral';

type RuleOptions = [];

/**
 * @protocol-constant The two ECMAScript globals that throw URIError on a malformed escape; a fixed language surface
 */
const DECODERS: ReadonlySet<string> = new Set([
  'decodeURIComponent',
  'decodeURI',
]);

/**
 * The conventional names of an inbound request object in Node HTTP handlers
 * (Express, Fastify, Koa's `ctx`). Exact membership, never a substring.
 *
 * @protocol-constant Request parameter names fixed by the frameworks' documented handler signatures
 */
const REQUEST_ROOTS: ReadonlySet<string> = new Set(['req', 'request', 'ctx']);

/**
 * Request properties that carry raw, client-sent text.
 *
 * @protocol-constant Property names of Node/Express/Koa request objects that hold client-supplied URL, header or cookie text
 */
const REQUEST_INPUTS: ReadonlySet<string> = new Set([
  'url',
  'originalUrl',
  'path',
  'baseUrl',
  'params',
  'query',
  'headers',
  'cookies',
  'querystring',
  'search',
  'hash',
]);

/**
 * `document` properties that carry page-URL or cookie text.
 *
 * @protocol-constant DOM Document properties holding the page URL, referrer and cookie string
 */
const DOCUMENT_INPUTS: ReadonlySet<string> = new Set([
  'URL',
  'documentURI',
  'cookie',
  'referrer',
  'location',
]);

/**
 * String methods whose result keeps the receiver's escapes as they were, so a
 * malformed `%` in the input survives into the decode.
 *
 * @protocol-constant String.prototype and Array.prototype method names that copy text through unchanged; a fixed language surface
 */
const TEXT_PRESERVING_METHODS: ReadonlySet<string> = new Set([
  'split',
  'slice',
  'substring',
  'substr',
  'replace',
  'replaceAll',
  'trim',
  'trimStart',
  'trimEnd',
  'toLowerCase',
  'toUpperCase',
  'at',
  'concat',
  'join',
  'pop',
  'shift',
]);

/**
 * Express/Koa request methods that return a raw header or parameter.
 *
 * @protocol-constant Request getter method names documented by Express (`req.get`, `req.header`, `req.param`) and Koa (`ctx.get`)
 */
const REQUEST_GETTERS: ReadonlySet<string> = new Set([
  'get',
  'header',
  'param',
]);

/**
 * Does this literal fail to decode? Decided by running the decoder itself.
 * decodeURI and decodeURIComponent share the spec's Decode operation and throw
 * on the same inputs (they differ only in which escapes they leave encoded),
 * so one call answers for both.
 */
function failsToDecode(text: string): boolean {
  try {
    decodeURIComponent(text);
    return false;
  } catch {
    return true;
  }
}

/** A string literal or an expression-free template, as its text. */
function literalText(node: TSESTree.Node): string | undefined {
  return staticString(node) ?? undefined;
}

/** The leftmost object of a member chain, and the property right after it. */
function chainRoot(node: TSESTree.MemberExpression): {
  root: TSESTree.Node;
  first: string | null;
  second: string | null;
} {
  const names: (string | null)[] = [];
  let current: TSESTree.Node = node;
  while (current.type === AST_NODE_TYPES.MemberExpression) {
    names.unshift(propertyName(current));
    current = current.object;
  }
  return { root: current, first: names[0] ?? null, second: names[1] ?? null };
}

export const noUnguardedUriDecode = createRule<RuleOptions, MessageIds>({
  name: 'no-unguarded-uri-decode',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-unguarded-uri-decode.md',
      description:
        'Disallow decodeURIComponent/decodeURI on request input outside a try/catch',
      cwe: 'CWE-248',
      cvss: 5.3,
    },
    messages: {
      unguardedDecode: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unguarded URI decode',
        cwe: 'CWE-248',
        cvss: 5.3,
        description:
          '{{decoder}} throws URIError on a malformed escape such as "p%ss", and this argument is request or location input. Any client can send one and turn this call into a 500 or, outside an error boundary, a crash.',
        severity: 'MEDIUM',
        fix: 'Wrap the call in try/catch and answer 400, or fall back to the raw value.',
        documentationLink: 'https://cwe.mitre.org/data/definitions/248.html',
      }),
      malformedLiteral: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Malformed URI literal',
        cwe: 'CWE-248',
        cvss: 5.3,
        description:
          '{{decoder}} throws URIError on this literal every time it runs: it holds a "%" that does not start a valid escape.',
        severity: 'MEDIUM',
        fix: 'Fix the escape (a literal "%" is written "%25"), or remove the decode.',
        documentationLink: 'https://cwe.mitre.org/data/definitions/248.html',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    /** The variable an identifier resolves to, or null for an undeclared global. */
    function resolve(
      node: TSESTree.Identifier,
    ): TSESLint.Scope.Variable | null {
      let scope: TSESLint.Scope.Scope | null =
        context.sourceCode.getScope(node);
      while (scope) {
        const variable = scope.set.get(node.name);
        if (variable) return variable;
        scope = scope.upper;
      }
      return null;
    }

    /** Is this identifier the platform global (declared nowhere in the file)? */
    function isGlobal(node: TSESTree.Identifier): boolean {
      const variable = resolve(node);
      return variable === null || variable.defs.length === 0;
    }

    /** `location`, `window.location` or `document.location`, unshadowed. */
    function isLocation(node: TSESTree.Node): boolean {
      if (node.type === AST_NODE_TYPES.Identifier) {
        return node.name === 'location' && isGlobal(node);
      }
      return (
        node.type === AST_NODE_TYPES.MemberExpression &&
        propertyName(node) === 'location' &&
        node.object.type === AST_NODE_TYPES.Identifier &&
        (node.object.name === 'window' || node.object.name === 'document') &&
        isGlobal(node.object)
      );
    }

    /** A member chain that reads request or location input. */
    function isSourceMember(node: TSESTree.MemberExpression): boolean {
      // `location.hash`, `window.location.pathname`
      let object: TSESTree.Node = node;
      while (object.type === AST_NODE_TYPES.MemberExpression) {
        if (isLocation(object.object)) return true;
        object = object.object;
      }
      const { root, first, second } = chainRoot(node);
      if (root.type !== AST_NODE_TYPES.Identifier) return false;
      if (root.name === 'document' && isGlobal(root)) {
        return first !== null && DOCUMENT_INPUTS.has(first);
      }
      if (!REQUEST_ROOTS.has(root.name) || isGlobal(root)) return false;
      // Koa: `ctx.request.url`, `ctx.req.url`
      if (root.name === 'ctx' && (first === 'request' || first === 'req')) {
        return REQUEST_INPUTS.has(second ?? '');
      }
      return REQUEST_INPUTS.has(first ?? '');
    }

    /**
     * Does this expression carry request or location input? Follows member
     * chains, method calls on them (`req.url.split('?')[0]`), `||`/`??`/`?:`,
     * concatenation and templates, and one variable hop to an initializer.
     */
    function carriesInput(
      node: TSESTree.Node,
      seen: Set<TSESTree.Node> = new Set(),
    ): boolean {
      if (seen.has(node)) return false;
      seen.add(node);
      switch (node.type) {
        case AST_NODE_TYPES.MemberExpression:
          // `url.searchParams` values come out of the parser already decoded.
          if (propertyName(node) === 'searchParams') return false;
          return isSourceMember(node) || carriesInput(node.object, seen);
        case AST_NODE_TYPES.CallExpression: {
          if (node.callee.type !== AST_NODE_TYPES.MemberExpression) {
            return false;
          }
          const method = propertyName(node.callee) ?? '';
          const receiver = node.callee.object;
          // `req.get('x-forwarded-path')`, `ctx.get(name)`
          if (
            REQUEST_GETTERS.has(method) &&
            receiver.type === AST_NODE_TYPES.Identifier &&
            REQUEST_ROOTS.has(receiver.name) &&
            !isGlobal(receiver)
          ) {
            return true;
          }
          return (
            TEXT_PRESERVING_METHODS.has(method) && carriesInput(receiver, seen)
          );
        }
        case AST_NODE_TYPES.NewExpression:
          // `new URL(req.url, base).pathname` keeps the raw escapes.
          return (
            node.callee.type === AST_NODE_TYPES.Identifier &&
            node.callee.name === 'URL' &&
            isGlobal(node.callee) &&
            node.arguments[0] !== undefined &&
            carriesInput(node.arguments[0], seen)
          );
        case AST_NODE_TYPES.ChainExpression:
        case AST_NODE_TYPES.TSNonNullExpression:
        case AST_NODE_TYPES.TSAsExpression:
          return carriesInput(node.expression, seen);
        case AST_NODE_TYPES.LogicalExpression:
        case AST_NODE_TYPES.BinaryExpression:
          return (
            carriesInput(node.left, seen) || carriesInput(node.right, seen)
          );
        case AST_NODE_TYPES.ConditionalExpression:
          return (
            carriesInput(node.consequent, seen) ||
            carriesInput(node.alternate, seen)
          );
        case AST_NODE_TYPES.TemplateLiteral:
          return node.expressions.some((e) => carriesInput(e, seen));
        case AST_NODE_TYPES.Identifier: {
          if (isLocation(node)) return true;
          const def = resolve(node)?.defs[0];
          if (
            def?.type === 'Variable' &&
            def.node.type === AST_NODE_TYPES.VariableDeclarator &&
            def.node.init
          ) {
            return carriesInput(def.node.init, seen);
          }
          return false;
        }
        default:
          return false;
      }
    }

    /** Inside a `try { … } catch` block of its own function? */
    function isGuarded(node: TSESTree.Node): boolean {
      let child: TSESTree.Node = node;
      let parent = node.parent;
      while (parent) {
        if (
          parent.type === AST_NODE_TYPES.FunctionDeclaration ||
          parent.type === AST_NODE_TYPES.FunctionExpression ||
          parent.type === AST_NODE_TYPES.ArrowFunctionExpression
        ) {
          return false;
        }
        if (
          parent.type === AST_NODE_TYPES.TryStatement &&
          parent.block === child &&
          parent.handler !== null
        ) {
          return true;
        }
        child = parent;
        parent = parent.parent;
      }
      return false;
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;
        if (
          callee.type !== AST_NODE_TYPES.Identifier ||
          !DECODERS.has(callee.name) ||
          !isGlobal(callee)
        ) {
          return;
        }
        const [argument] = node.arguments;
        if (!argument || argument.type === AST_NODE_TYPES.SpreadElement) {
          return;
        }
        const decoder = callee.name;
        const text = literalText(argument);
        if (text !== undefined) {
          if (failsToDecode(text)) {
            context.report({
              node,
              messageId: 'malformedLiteral',
              data: { decoder },
            });
          }
          return;
        }
        if (isGuarded(node) || !carriesInput(argument)) return;
        context.report({
          node,
          messageId: 'unguardedDecode',
          data: { decoder },
        });
      },
    };
  },
});
