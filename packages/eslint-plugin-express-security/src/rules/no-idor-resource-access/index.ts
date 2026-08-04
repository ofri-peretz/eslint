/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-idor-resource-access
 *
 * Detects a resource fetched by an identifier taken straight from the
 * request, inside a handler that never mentions the authenticated principal:
 *
 *   app.get('/invoices/:id', (req, res) =>
 *     Invoice.findById(req.params.id).then((doc) => res.json(doc)));
 *
 * Change the id in the URL, read someone else's invoice. This is CWE-639 —
 * authorization bypass through a user-controlled key (IDOR). The fix is to
 * scope the query to the principal (`{ _id: req.params.id, owner:
 * req.user.id }`) or to check ownership on the loaded document.
 *
 * CWE-639: Authorization Bypass Through User-Controlled Key
 * OWASP A01:2021 – Broken Access Control
 *
 * ## Detection method: naming-heuristic (ships as `warn`)
 *
 * Structural half: a lookup call (`findById`, `findOne`, `findByPk`,
 * `findUnique`, …) whose key argument is a member expression rooted at
 * `req.params` / `req.query` / `req.body`, inside a function that takes a
 * `req` parameter. Heuristic half: "the handler never reads the principal"
 * stands in for "there is no ownership check", so the rule never carries
 * enforcement severity (scope audit invariant I3).
 *
 * The rule cannot see an ownership check performed in a helper function —
 * a documented false positive; suppress it with the `lookupMethods` option or
 * an inline disable.
 *
 * @see https://cwe.mitre.org/data/definitions/639.html
 */

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';
import { isClientRequestMember, readsPrincipal, walk } from '../../utils';

type MessageIds = 'unscopedResourceLookup';

export interface Options {
  /** Lookup methods considered a single-resource fetch by key. */
  lookupMethods?: string[];
}

type RuleOptions = [Options?];

const DEFAULT_LOOKUP_METHODS = [
  'findById',
  'findByPk',
  'findOne',
  'findUnique',
  'findFirst',
  'findByIdAndUpdate',
  'findByIdAndDelete',
  'findByIdAndRemove',
  'getById',
  'deleteOne',
  'deleteById',
  'updateOne',
  'replaceOne',
];

/** Parameter names that make a function an Express handler. */
const REQUEST_PARAM = /^(req|request)$/i;

function isHandlerFunction(
  node: TSESTree.Node,
): node is
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression
  | TSESTree.ArrowFunctionExpression {
  if (
    node.type !== AST_NODE_TYPES.FunctionDeclaration &&
    node.type !== AST_NODE_TYPES.FunctionExpression &&
    node.type !== AST_NODE_TYPES.ArrowFunctionExpression
  ) {
    return false;
  }
  return node.params.some(
    (param) =>
      param.type === AST_NODE_TYPES.Identifier && REQUEST_PARAM.test(param.name),
  );
}

/** Does this argument carry a request-supplied key? */
function isRequestKeyArgument(arg: TSESTree.Node): boolean {
  if (isClientRequestMember(arg)) return true;
  // { _id: req.params.id } / { where: { id: req.params.id } }
  if (arg.type === AST_NODE_TYPES.ObjectExpression) {
    let found = false;
    walk(arg, (child) => {
      if (found) return;
      if (isClientRequestMember(child)) found = true;
    });
    return found;
  }
  return false;
}

export const noIdorResourceAccess = createRule<RuleOptions, MessageIds>({
  name: 'no-idor-resource-access',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-express-security/docs/rules/no-idor-resource-access.md',
      description:
        'Disallow fetching a resource by a request-supplied key in a handler with no principal in scope',
      cwe: 'CWE-639',
      cvss: 7.5,
      confidence: 'medium',
    },
    messages: {
      unscopedResourceLookup: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Resource Fetched By Client-Supplied Key (CWE-639)',
        cwe: 'CWE-639',
        cvss: 7.5,
        description:
          '{{method}}() is keyed on {{key}} and nothing in this handler ties the lookup to the caller. Incrementing the id in the URL returns another tenant’s record.',
        severity: 'HIGH',
        fix: "Scope the query to the principal — {{method}}({ _id: {{key}}, owner: req.user.id }) — or verify ownership on the loaded document before responding.",
        documentationLink: 'https://cwe.mitre.org/data/definitions/639.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          lookupMethods: {
            type: 'array',
            items: { type: 'string' },
            description: 'Lookup methods treated as a fetch-by-key',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options]) {
    const { lookupMethods } = options as Options;
    const lookups = new Set(lookupMethods ?? DEFAULT_LOOKUP_METHODS);

    /** Nearest enclosing handler function, if any. */
    function enclosingHandler(node: TSESTree.Node): TSESTree.Node | null {
      let current: TSESTree.Node | undefined = node.parent;
      while (current) {
        if (isHandlerFunction(current)) return current;
        current = current.parent;
      }
      return null;
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;
        if (callee.type !== AST_NODE_TYPES.MemberExpression) return;
        if (callee.property.type !== AST_NODE_TYPES.Identifier) return;
        if (callee.computed) return;
        const method = callee.property.name;
        if (!lookups.has(method)) return;

        const keyArg = node.arguments.find((arg) => isRequestKeyArgument(arg));
        if (!keyArg) return;

        const handler = enclosingHandler(node);
        if (!handler) return;
        if (readsPrincipal(handler)) return;

        context.report({
          node,
          messageId: 'unscopedResourceLookup',
          data: {
            method,
            key: context.sourceCode.getText(keyArg),
          },
        });
      },
    };
  },
});
