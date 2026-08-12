/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-client-controlled-authorization
 *
 * Detects an authorization decision taken on a value the client supplied:
 *
 *   if (req.body.role === 'admin') { … }
 *   if (req.query.isAdmin) { … }
 *   if (req.headers['x-user-role'] === 'owner') { … }
 *   const allowed = req.body.permissions.includes('billing:write');
 *
 * The check exists, so the code reads as authorized — it just trusts the
 * requester's word for who they are. That is CWE-863 (incorrect
 * authorization), not CWE-862 (no check at all): the fix is to read the
 * attribute from the server-side session/token, never from the request body,
 * query string, headers or cookies.
 *
 * CWE-863: Incorrect Authorization
 * OWASP A01:2021 – Broken Access Control
 *
 * ## Detection method: naming-heuristic (ships as `warn`)
 *
 * The structural half is exact: a member expression rooted at
 * `req.body|query|params|headers|cookies` used inside a comparison or a
 * branch test. The heuristic half is the property vocabulary (`role`,
 * `isAdmin`, `permissions`, `userId`, …) that makes it an *authorization*
 * decision rather than ordinary request handling — so the rule never carries
 * enforcement severity (scope audit invariant I3).
 *
 * @see https://cwe.mitre.org/data/definitions/863.html
 */

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { fileUsesExpress } from '../../utils/express-evidence';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'clientControlledAuthorization';

export interface Options {
  /** Extra property names treated as authorization attributes. */
  extraProperties?: string[];
}

type RuleOptions = [Options?];

/** Request containers a client fully controls. */
const CLIENT_CONTAINERS = new Set([
  'body',
  'query',
  'params',
  'headers',
  'cookies',
]);

/** Receivers that are an Express request. */
const REQUEST_RECEIVER = /^(req|request)$/i;

/** Property names that make a read an authorization attribute. */
const AUTHZ_PROPERTIES = new Set([
  'role',
  'roles',
  'admin',
  'isadmin',
  'is_admin',
  'superuser',
  'issuperuser',
  'permission',
  'permissions',
  'scope',
  'scopes',
  'privilege',
  'privileges',
  'usertype',
  'user_type',
  'accesslevel',
  'access_level',
  'acl',
  'claims',
  'grants',
  'userid',
  'user_id',
  'ownerid',
  'owner_id',
  'owner',
  'accountid',
  'account_id',
  'tenantid',
  'tenant_id',
  'orgid',
  'org_id',
]);

/** Header names that carry an identity a proxy — not the client — should set. */
const AUTHZ_HEADER =
  /^x-.*(role|admin|user|auth|permission|scope|tenant|account|owner)/i;

/** The final property name of a member expression, if it is statically known. */
function staticPropertyName(node: TSESTree.MemberExpression): string | null {
  if (!node.computed && node.property.type === AST_NODE_TYPES.Identifier) {
    return node.property.name;
  }
  if (
    node.computed &&
    node.property.type === AST_NODE_TYPES.Literal &&
    typeof node.property.value === 'string'
  ) {
    return node.property.value;
  }
  return null;
}

/** Is this member expression rooted at `req.<container>`? */
function clientContainerOf(node: TSESTree.MemberExpression): string | null {
  const { object } = node;
  if (object.type !== AST_NODE_TYPES.MemberExpression) return null;
  const container = staticPropertyName(object);
  if (!container || !CLIENT_CONTAINERS.has(container)) return null;

  const root = object.object;
  if (
    root.type === AST_NODE_TYPES.Identifier &&
    REQUEST_RECEIVER.test(root.name)
  ) {
    return container;
  }
  // ctx.req.body.role / this.request.query.role
  if (
    root.type === AST_NODE_TYPES.MemberExpression &&
    root.property.type === AST_NODE_TYPES.Identifier &&
    REQUEST_RECEIVER.test(root.property.name)
  ) {
    return container;
  }
  return null;
}

/**
 * Is this expression in a position where its value decides access?
 * Walks up at most a handful of levels: comparison, branch test, negation,
 * logical combination, or the receiver/argument of an `.includes()` check.
 */
function isAuthorizationDecision(node: TSESTree.Node): boolean {
  let current: TSESTree.Node = node;
  let parent = node.parent;

  for (let depth = 0; parent && depth < 4; depth += 1) {
    switch (parent.type) {
      case AST_NODE_TYPES.BinaryExpression:
        if (
          parent.operator === '===' ||
          parent.operator === '==' ||
          parent.operator === '!==' ||
          parent.operator === '!='
        ) {
          return true;
        }
        break;
      case AST_NODE_TYPES.IfStatement:
      case AST_NODE_TYPES.ConditionalExpression:
        if (parent.test === current) return true;
        break;
      case AST_NODE_TYPES.SwitchStatement:
        if (parent.discriminant === current) return true;
        break;
      case AST_NODE_TYPES.LogicalExpression:
        // `??` supplies a default, it does not decide access:
        // `const role = req.body.role ?? 'viewer'` is not a guard.
        if (parent.operator === '??') break;
        return true;
      case AST_NODE_TYPES.UnaryExpression:
        if (parent.operator === '!') return true;
        break;
      case AST_NODE_TYPES.CallExpression:
        if (
          parent.callee.type === AST_NODE_TYPES.MemberExpression &&
          parent.callee.property.type === AST_NODE_TYPES.Identifier &&
          (parent.callee.property.name === 'includes' ||
            parent.callee.property.name === 'some')
        ) {
          return true;
        }
        return false;
      default:
        break;
    }
    current = parent;
    parent = parent.parent;
  }
  return false;
}

export const noClientControlledAuthorization = createRule<
  RuleOptions,
  MessageIds
>({
  name: 'no-client-controlled-authorization',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-express-security/docs/rules/no-client-controlled-authorization.md',
      description:
        'Disallow authorization decisions taken on request-supplied role, permission or identity values',
      cwe: 'CWE-863',
      cvss: 8.1,
      confidence: 'medium',
    },
    messages: {
      clientControlledAuthorization: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Authorization Decided On Client Input (CWE-863)',
        cwe: 'CWE-863',
        cvss: 8.1,
        description:
          'The access decision reads {{expression}} — a value the caller sends. The check runs, and passes for anyone who sets the field.',
        severity: 'HIGH',
        fix: 'Read the attribute from the server-side session or verified token instead: req.user.{{property}} / req.auth.{{property}}.',
        documentationLink: 'https://cwe.mitre.org/data/definitions/863.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          extraProperties: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Extra property names treated as authorization attributes',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options]) {
    // Every rule here is Express-specific, and none of them knew it: over
    // 107,382 files, 75% of this plugin's findings were in files with no
    // Express import. Registering no visitors is both the gate and the cheap
    // path — a file with no Express in it does no work.
    if (!fileUsesExpress(context.sourceCode.ast)) return {};

    const { extraProperties } = options as Options;
    const extra = new Set(
      (extraProperties ?? []).map((name) => name.toLowerCase()),
    );

    function isAuthorizationAttribute(
      property: string,
      container: string,
    ): boolean {
      const normalized = property.toLowerCase();
      if (AUTHZ_PROPERTIES.has(normalized)) return true;
      if (extra.has(normalized)) return true;
      return container === 'headers' && AUTHZ_HEADER.test(property);
    }

    return {
      MemberExpression(node: TSESTree.MemberExpression) {
        const property = staticPropertyName(node);
        if (!property) return;

        const container = clientContainerOf(node);
        if (!container) return;
        if (!isAuthorizationAttribute(property, container)) return;
        if (!isAuthorizationDecision(node)) return;

        context.report({
          node,
          messageId: 'clientControlledAuthorization',
          data: {
            expression: context.sourceCode.getText(node),
            property,
          },
        });
      },
    };
  },
});
