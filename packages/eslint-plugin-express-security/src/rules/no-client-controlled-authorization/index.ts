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
  propertyName,
  resolveModuleBinding,
  staticString,
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
    REQUEST_RECEIVER.test(propertyName(root) as string)
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
/** Express's header accessors: `req.get(name)` and its alias `req.header(name)`. */
const HEADER_ACCESSORS = new Set(['get', 'header']);

/**
 * The header name a `req.get('x-user-role')` / `req.header(...)` call reads,
 * or null. These read the same client-set header `req.headers[...]` does.
 */
function headerAccessorName(node: TSESTree.CallExpression): string | null {
  const { callee } = node;
  if (callee.type !== AST_NODE_TYPES.MemberExpression) return null;
  const method = propertyName(callee);
  if (method === null || !HEADER_ACCESSORS.has(method)) return null;
  const receiver = callee.object;
  const isRequest =
    (receiver.type === AST_NODE_TYPES.Identifier &&
      REQUEST_RECEIVER.test(receiver.name)) ||
    (receiver.type === AST_NODE_TYPES.MemberExpression &&
      REQUEST_RECEIVER.test(propertyName(receiver) as string));
  if (!isRequest || node.arguments.length !== 1) return null;
  return staticString(node.arguments[0]);
}

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
          (propertyName(parent.callee) === 'includes' ||
            propertyName(parent.callee) === 'some')
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

/** The slots a verifier stores the authenticated principal in (`req.user = user`). */
const PRINCIPAL_SLOTS = new Set(['user', 'auth']);

export const noClientControlledAuthorization = createRule<
  RuleOptions,
  MessageIds
>({
  name: 'no-client-controlled-authorization',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
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
  createOnce(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    currentOptions,
  ) {
    let extra: Set<string>;
    /**
     * Request binding -> bindings stored as its authenticated principal.
     *
     * `req.user = user`, where `user` is a PARAMETER of the callback
     * `passport.authenticate('jwt', cb)` invokes, is the server telling the request
     * who the caller is: a client cannot choose a callback's arguments. A
     * comparison of a client-supplied id against that principal's own id
     * (`req.params.userId !== user.id`) is the "self or holder of the right"
     * check, not a decision on a value the client controls.
     */
    let principals: Map<TSESLint.Scope.Variable, Set<TSESLint.Scope.Variable>>;
    let pending: (() => void)[];

    function variableOf(
      identifier: TSESTree.Identifier,
    ): TSESLint.Scope.Variable | undefined {
      for (
        let scope: TSESLint.Scope.Scope | null =
          context.sourceCode.getScope(identifier);
        scope;
        scope = scope.upper
      ) {
        const variable = scope.set.get(identifier.name);
        if (variable) return variable;
      }
      return undefined;
    }

    /**
     * `(err, user, info)`: passport hands the authenticated user as the SECOND
     * argument; `info` is strategy metadata that may be built from request
     * data, and `err` is not a principal at all.
     */
    function isUserParameter(variable: TSESLint.Scope.Variable): boolean {
      const definition = variable.defs[0];
      const parameters = (definition.node as TSESTree.FunctionLike).params;
      return parameters[1] === definition.name;
    }

    /** `passport.authenticate(...)`, with `passport` resolved to the module. */
    function isPassportAuthenticate(call: TSESTree.Node | undefined): boolean {
      if (call?.type !== AST_NODE_TYPES.CallExpression) return false;
      const callee = call.callee;
      if (
        callee.type !== AST_NODE_TYPES.MemberExpression ||
        propertyName(callee) !== 'authenticate'
      ) {
        return false;
      }
      return (
        resolveModuleBinding(callee.object, context.sourceCode.getScope(call))
          ?.module === 'passport'
      );
    }

    /**
     * Is `fn` the callback `passport.authenticate(strategy, options, fn)`
     * calls with the verified user — passed directly, or the function a local
     * factory returns and the factory's call is what gets passed
     * (`verifyCallback(req, ...)`)?
     *
     * A parameter of an arbitrary function proves nothing: `check(req, req.body)`
     * hands the client's own object in as `user`.
     */
    function isVerifierCallback(fn: TSESTree.Node): boolean {
      // A function whose parent is the call can only be an argument of it:
      // the callee of `passport.authenticate(...)` is a member expression.
      if (isPassportAuthenticate(fn.parent)) return true;
      // The factory: `(req) => (err, user) => {...}` or `function f() { return (err, user) => {...}; }`.
      let factory: TSESTree.Node | undefined;
      if (
        fn.parent?.type === AST_NODE_TYPES.ArrowFunctionExpression &&
        fn.parent.body === fn
      ) {
        factory = fn.parent;
      } else if (fn.parent?.type === AST_NODE_TYPES.ReturnStatement) {
        factory = fn.parent.parent;
        while (
          factory &&
          factory.type !== AST_NODE_TYPES.FunctionDeclaration &&
          factory.type !== AST_NODE_TYPES.FunctionExpression &&
          factory.type !== AST_NODE_TYPES.ArrowFunctionExpression
        ) {
          factory = factory.parent;
        }
      }
      if (factory === undefined) return false;
      const holder =
        factory.type === AST_NODE_TYPES.FunctionDeclaration
          ? factory
          : factory.parent?.type === AST_NODE_TYPES.VariableDeclarator
            ? factory.parent
            : undefined;
      if (holder === undefined) return false;
      const name =
        holder.type === AST_NODE_TYPES.FunctionDeclaration
          ? holder.id?.name
          : holder.id.type === AST_NODE_TYPES.Identifier
            ? holder.id.name
            : undefined;
      const variable = context.sourceCode
        .getDeclaredVariables(holder)
        .find((candidate) => candidate.name === name);
      return (
        variable?.references.some((reference) => {
          const call = reference.identifier.parent;
          return (
            call?.type === AST_NODE_TYPES.CallExpression &&
            call.callee === reference.identifier &&
            isPassportAuthenticate(call.parent)
          );
        }) ?? false
      );
    }

    /**
     * Is a property reached THROUGH `variable` written (`user.id = ...`,
     * `user.profile.id = ...`, `user.n++`, `delete user.role`)? The member
     * chain is followed to its outermost link, so a nested write counts.
     * `slots`, when given, limits the chains considered to those whose first
     * property is one of them: for the request binding only `req.user...` /
     * `req.auth...` reaches the principal.
     */
    function hasWriteThrough(
      variable: TSESLint.Scope.Variable,
      slots?: ReadonlySet<string>,
    ): boolean {
      return variable.references.some((reference) => {
        let chain: TSESTree.Node = reference.identifier;
        let firstLink: TSESTree.MemberExpression | null = null;
        let depth = 0;
        while (
          chain.parent?.type === AST_NODE_TYPES.MemberExpression &&
          chain.parent.object === chain
        ) {
          chain = chain.parent;
          depth += 1;
          firstLink ??= chain as TSESTree.MemberExpression;
        }
        if (depth === 0) {
          // `const alias = user`: a write through the alias is not followed,
          // so an object that escapes to another binding is not trusted.
          return slots === undefined && aliased(reference.identifier);
        }
        if (slots !== undefined) {
          // `req.user = user` is the STORE, not a mutation of what it stores:
          // only a write BELOW the slot (`req.user.id = ...`) reaches the
          // object. A key that does not resolve (`req[slot].id`) may be a
          // principal slot, so it counts.
          if (depth < 2) return false;
          const first = staticPropertyName(firstLink!);
          if (first !== null && !slots.has(first)) return false;
        }
        return isWriteTarget(chain);
      });
    }

    /** Is `identifier` the whole value bound to another name? */
    function aliased(identifier: TSESTree.Node): boolean {
      const use = identifier.parent;
      return (
        (use?.type === AST_NODE_TYPES.VariableDeclarator &&
          use.init === identifier) ||
        (use?.type === AST_NODE_TYPES.AssignmentExpression &&
          use.right === identifier &&
          use.left.type !== AST_NODE_TYPES.MemberExpression)
      );
    }

    /**
     * Is `node` written: assigned, updated, deleted, or a target inside a
     * destructuring assignment (`({ userId: user.id } = req.body)`)? A read
     * in a computed key or a default value is not a target.
     */
    function isWriteTarget(node: TSESTree.Node): boolean {
      let target: TSESTree.Node = node;
      for (;;) {
        const parent: TSESTree.Node | undefined = target.parent;
        if (
          parent?.type === AST_NODE_TYPES.Property &&
          parent.value === target &&
          parent.parent?.type === AST_NODE_TYPES.ObjectPattern
        ) {
          target = parent.parent;
        } else if (
          parent?.type === AST_NODE_TYPES.ArrayPattern ||
          parent?.type === AST_NODE_TYPES.ObjectPattern ||
          parent?.type === AST_NODE_TYPES.RestElement ||
          (parent?.type === AST_NODE_TYPES.AssignmentPattern &&
            parent.left === target)
        ) {
          target = parent;
        } else {
          break;
        }
      }
      const use = target.parent;
      return (
        (use?.type === AST_NODE_TYPES.AssignmentExpression &&
          use.left === target) ||
        ((use?.type === AST_NODE_TYPES.ForOfStatement ||
          use?.type === AST_NODE_TYPES.ForInStatement) &&
          use.left === target) ||
        use?.type === AST_NODE_TYPES.UpdateExpression ||
        (use?.type === AST_NODE_TYPES.UnaryExpression &&
          use.operator === 'delete')
      );
    }

    function rootIdentifier(node: TSESTree.Node): TSESTree.Identifier | null {
      let current: TSESTree.Node = node;
      while (current.type === AST_NODE_TYPES.MemberExpression) {
        current = current.object;
      }
      return current.type === AST_NODE_TYPES.Identifier ? current : null;
    }

    /**
     * Is `member` compared for equality against the authenticated principal
     * of the request it was read from?
     */
    function comparedToPrincipal(member: TSESTree.MemberExpression): boolean {
      const comparison = member.parent;
      if (
        comparison?.type !== AST_NODE_TYPES.BinaryExpression ||
        !['===', '!==', '==', '!='].includes(comparison.operator)
      ) {
        return false;
      }
      const other =
        comparison.left === member ? comparison.right : comparison.left;
      if (other.type !== AST_NODE_TYPES.MemberExpression) return false;
      const requestRoot = rootIdentifier(member);
      const otherRoot = rootIdentifier(other);
      if (requestRoot === null || otherRoot === null) return false;
      const request = variableOf(requestRoot);
      const principal = variableOf(otherRoot);
      if (request === undefined || principal === undefined) return false;
      return principals.get(request)?.has(principal) ?? false;
    }

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
      before() {
        const [options] = currentOptions();
        // Every rule here is Express-specific, and none of them knew it: over
        // 107,382 files, 75% of this plugin's findings were in files with no
        // Express import. Registering no visitors is both the gate and the cheap
        // path — a file with no Express in it does no work.
        if (!fileUsesExpress(context.sourceCode.ast)) return false;

        const { extraProperties } = options as Options;
        extra = new Set(
          (extraProperties ?? []).map((name) => name.toLowerCase()),
        );
        principals = new Map();
        pending = [];
        return true;
      },
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        if (
          node.operator !== '=' ||
          node.left.type !== AST_NODE_TYPES.MemberExpression ||
          node.left.object.type !== AST_NODE_TYPES.Identifier ||
          node.right.type !== AST_NODE_TYPES.Identifier
        ) {
          return;
        }
        const slot = staticPropertyName(node.left);
        if (slot === null || !PRINCIPAL_SLOTS.has(slot)) return;
        const request = variableOf(node.left.object);
        const value = variableOf(node.right);
        // Only a parameter of a passport verifier callback that is never
        // reassigned and has no property written: a `const user =
        // req.body.user` is the client's word, a parameter of any other
        // function can be handed the client's object, and a rewritten
        // parameter or `user.id = req.body.id` may hold anything.
        if (
          request === undefined ||
          value === undefined ||
          value.defs[0]?.type !== 'Parameter' ||
          value.references.some((reference) => reference.isWrite()) ||
          hasWriteThrough(value) ||
          hasWriteThrough(request, PRINCIPAL_SLOTS) ||
          !isUserParameter(value) ||
          !isVerifierCallback(value.defs[0].node)
        ) {
          return;
        }
        const stored = principals.get(request) ?? new Set();
        stored.add(value);
        principals.set(request, stored);
      },
      'Program:exit'() {
        for (const report of pending) report();
      },
      CallExpression(node: TSESTree.CallExpression) {
        const header = headerAccessorName(node);
        if (header === null) return;
        if (!isAuthorizationAttribute(header, 'headers')) return;
        if (!isAuthorizationDecision(node)) return;

        context.report({
          node,
          messageId: 'clientControlledAuthorization',
          data: {
            expression: context.sourceCode.getText(node),
            property: header,
          },
        });
      },
      MemberExpression(node: TSESTree.MemberExpression) {
        const property = staticPropertyName(node);
        if (!property) return;

        const container = clientContainerOf(node);
        if (!container) return;
        if (!isAuthorizationAttribute(property, container)) return;
        if (!isAuthorizationDecision(node)) return;

        // Decided at the end of the file: the `req.user = user` that makes
        // the other side a principal may sit after the comparison.
        pending.push(() => {
          if (comparedToPrincipal(node)) return;
          context.report({
            node,
            messageId: 'clientControlledAuthorization',
            data: {
              expression: context.sourceCode.getText(node),
              property,
            },
          });
        });
      },
    };
  },
});
