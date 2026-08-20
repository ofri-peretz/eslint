/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Prevent overly permissive CORS configuration
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/942.html
 */

import { AST_NODE_TYPES, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { resolveInitializer } from '../../utils/resolve-binding';

/** The header that grants an origin read access. Exact, case-insensitive. */
const ALLOW_ORIGIN = 'access-control-allow-origin';

/**
 * Methods that set a response header. Closed API surface: Node's `setHeader`,
 * Express's `set`/`header`.
 *
 * The rule recognised ONLY `setHeader`, so `res.header('Access-Control-Allow-
 * Origin', '*')` — the Express alias, and the spelling most Express codebases
 * actually use — shipped a wildcard past a rule whose entire job is that
 * header.
 *
 * @protocol-constant These are not English words standing in for evidence —
 * they are the complete set of response-header setters in
 * `http.ServerResponse` and Express's `Response`, i.e. a call signature. The
 * header NAME is checked separately, so this list can only ever select which
 * API is being called. Letting a consumer shorten it would switch the rule off
 * for `res.header(…)` while it still claimed to cover CORS; letting them
 * lengthen it buys nothing, because a method that is not one of these does not
 * set a response header.
 */
const HEADER_METHODS: ReadonlySet<string> = new Set([
  'setHeader',
  'header',
  'set',
]);

/**
 * The string an expression is KNOWN to be, folded through scope.
 *
 * A "temporary" `const ALLOWED_ORIGIN = '*'` is how the wildcard survives into
 * production, and reading only inline literals meant the rule saw the honest
 * spelling and missed the one that got deployed.
 */
function foldToString(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
  depth = 0,
): string | null {
  if (depth > 4) return null;
  if (node.type === AST_NODE_TYPES.Literal) {
    return typeof node.value === 'string' ? node.value : null;
  }
  if (node.type === AST_NODE_TYPES.Identifier) {
    const init = resolveInitializer(node, sourceCode);
    return init === undefined ? null : foldToString(init, sourceCode, depth + 1);
  }
  return null;
}

/** The object literal an expression is known to be, resolved through scope. */
function foldToObject(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
  depth = 0,
): TSESTree.ObjectExpression | null {
  if (depth > 4) return null;
  if (node.type === AST_NODE_TYPES.ObjectExpression) return node;
  if (node.type === AST_NODE_TYPES.Identifier) {
    const init = resolveInitializer(node, sourceCode);
    return init === undefined ? null : foldToObject(init, sourceCode, depth + 1);
  }
  return null;
}

/** The name a non-computed property key spells, quoted or bare. */
function keyName(property: TSESTree.Property): string | null {
  if (property.computed) return null;
  if (property.key.type === AST_NODE_TYPES.Identifier) return property.key.name;
  if (
    property.key.type === AST_NODE_TYPES.Literal &&
    typeof property.key.value === 'string'
  ) {
    return property.key.value;
  }
  return null;
}

/**
 * Does this expression read the REQUEST's Origin header directly?
 *
 * Reflecting the request origin is strictly worse than `'*'`, not milder: a
 * browser refuses to send credentials to a literal wildcard and sends them
 * happily to an origin the server echoed back. So `res.setHeader('Access-
 * Control-Allow-Origin', req.headers.origin)` disables the same-origin policy
 * for every attacker page at once.
 *
 * Only a DIRECT read counts. A conditional — `ALLOWED.has(o) ? o : 'null'` —
 * is an allowlist, and a rule that cannot tell the two apart reports the fix.
 */
function readsRequestOrigin(node: TSESTree.Node): boolean {
  if (node.type !== AST_NODE_TYPES.MemberExpression) return false;

  // A non-computed member's property is always an Identifier.
  const property = node.property;
  const name = node.computed
    ? property.type === AST_NODE_TYPES.Literal &&
      typeof property.value === 'string'
      ? property.value
      : null
    : (property as TSESTree.Identifier).name;
  if (name?.toLowerCase() !== 'origin') return false;

  // `<something>.headers.origin` — the receiver must be a `headers` bag.
  const receiver = node.object;
  return (
    receiver.type === AST_NODE_TYPES.MemberExpression &&
    !receiver.computed &&
    receiver.property.type === AST_NODE_TYPES.Identifier &&
    receiver.property.name === 'headers'
  );
}

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const noPermissiveCors = createRule<RuleOptions, MessageIds>({
  name: 'no-permissive-cors',
  meta: {
    type: 'problem',
    deprecated: true,
    replacedBy: ['@see eslint-plugin-express-security/no-permissive-cors'],
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/no-permissive-cors.md',
      description: 'Prevent overly permissive CORS configuration',
      cwe: 'CWE-942',
      cvss: 7.5,
      confidence: 'high',
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'violation Detected',
        cwe: 'CWE-942',
        description: 'Prevent overly permissive CORS configuration detected - this is a security risk',
        severity: 'HIGH',
        fix: 'Review and apply secure practices',
        documentationLink: 'https://cwe.mitre.org/data/definitions/942.html',
      })
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    function report(node: TSESTree.Node) {
      context.report({
        node,
        messageId: 'violationDetected',
      });
    }
    
    const sourceCode = context.sourceCode;

    return {
      /**
       * A header block written as DATA — a `ResponseInit`, a Next.js config
       * entry. Same wire result, no call to trigger on.
       *
       * Only a property KEY counts, or the `key` of a `{ key, value }` pair.
       * An audit table that lists `{ header: 'Access-Control-Allow-Origin',
       * rule: 'never *' }` documents the policy; it does not set it.
       */
      Property(node: TSESTree.Property) {
        const name = keyName(node);

        // `{ 'Access-Control-Allow-Origin': '*' }`
        if (
          name?.toLowerCase() === ALLOW_ORIGIN &&
          foldToString(node.value, sourceCode) === '*'
        ) {
          report(node);
          return;
        }

        // `{ key: 'Access-Control-Allow-Origin', value: '*' }`
        if (
          name !== 'key' ||
          foldToString(node.value, sourceCode)?.toLowerCase() !== ALLOW_ORIGIN
        ) {
          return;
        }
        // A Property's parent is an ObjectExpression or an ObjectPattern, and
        // both carry `properties`.
        const entry = node.parent as
          | TSESTree.ObjectExpression
          | TSESTree.ObjectPattern;
        const valueProperty = entry.properties.find(
          (p): p is TSESTree.Property =>
            p.type === AST_NODE_TYPES.Property && keyName(p) === 'value',
        );
        if (
          valueProperty !== undefined &&
          foldToString(valueProperty.value, sourceCode) === '*'
        ) {
          report(entry);
        }
      },

      CallExpression(node: TSESTree.CallExpression) {
        // res.setHeader / res.header / res.set — all three are the same header.
        if (
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          !node.callee.computed &&
          node.callee.property.type === AST_NODE_TYPES.Identifier &&
          HEADER_METHODS.has(node.callee.property.name) &&
          node.arguments[0] !== undefined &&
          foldToString(node.arguments[0], sourceCode)?.toLowerCase() ===
            ALLOW_ORIGIN &&
          node.arguments[1] !== undefined
        ) {
          const value = node.arguments[1];
          if (
            foldToString(value, sourceCode) === '*' ||
            readsRequestOrigin(value)
          ) {
            report(node);
          }
        }

        // Check cors({ origin: '*' }), including `cors(CORS_CONFIG)` — a
        // multi-environment setup keeps the options in a constant, and reading
        // only the inline object saw the honest spelling and missed the one
        // that shipped.
        const corsOptions =
          node.callee.type === AST_NODE_TYPES.Identifier &&
          node.callee.name === 'cors' &&
          node.arguments[0] !== undefined
            ? foldToObject(node.arguments[0], sourceCode)
            : null;
        if (corsOptions !== null) {
          const originProp = corsOptions.properties.find(
            (p): p is TSESTree.Property =>
              p.type === AST_NODE_TYPES.Property &&
              p.key.type === AST_NODE_TYPES.Identifier &&
              p.key.name === 'origin'
          );
          // `'*'` and `true` are both "every origin". In the `cors` package
          // `true` REFLECTS the request's Origin header, which is strictly
          // worse than `'*'`: browsers refuse to send credentials to a literal
          // `*`, but they will send them to a reflected origin. Only `'*'` was
          // caught.
          if (
            originProp &&
            originProp.value.type === AST_NODE_TYPES.Literal &&
            (originProp.value.value === '*' || originProp.value.value === true)
          ) {
            report(node);
          }
        }
      },
    };
  },
});
