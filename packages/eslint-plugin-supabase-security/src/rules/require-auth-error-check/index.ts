/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Read `error` from a Supabase auth result
 * @description `supabase.auth.getUser()` resolves rather than throws when the
 * token is missing, expired or forged: it returns `{ data: { user: null }, error }`.
 * Code that destructures only `data` therefore reads an authentication *failure*
 * as an anonymous success, and any `if (user)` guard downstream is comparing
 * against a value the failure path also produces.
 * @see https://supabase.com/docs/reference/javascript/auth-getuser
 */

import {
  TSESLint,
  TSESTree,
  createRule,
  formatLLMMessage,
  MessageIcons,
  objectKeyName,
  propertyName,
} from '@interlace/eslint-devkit';

import { fileUsesSupabase } from '../../utils/supabase-evidence';

type MessageIds = 'missingErrorCheck';

/**
 * The auth calls whose failure is a returned `error` rather than a throw, and
 * whose result decides whether a request is authenticated.
 */
const AUTH_METHODS = new Set([
  'getUser',
  'getSession',
  'getClaims',
  'refreshSession',
  'exchangeCodeForSession',
]);

/** `x.auth.getUser()` — the `.auth` segment is what makes this Supabase's auth and not a router's. */
function isSupabaseAuthCall(callee: TSESTree.Expression): string | undefined {
  if (callee.type !== 'MemberExpression') return undefined;
  const method = propertyName(callee);
  if (method === null || !AUTH_METHODS.has(method)) return undefined;

  const owner = callee.object;
  if (owner.type !== 'MemberExpression') return undefined;
  if (propertyName(owner) !== 'auth') return undefined;
  return method;
}

/**
 * Whether an object pattern binds `error` — by name, by rename, or via a rest
 * element.
 *
 * A **computed** key counts as bound, which is the abstention rather than a
 * miss: `const k = 'error'; const { [k]: e } = …` does bind it, and this node
 * cannot tell that from `[somethingElse]`. Reporting would flag correct code, so
 * the rule stays silent — the same reading the sibling plugins give a spread.
 */
function bindsError(pattern: TSESTree.ObjectPattern): boolean {
  return pattern.properties.some((property) => {
    if (property.type === 'RestElement') return true;
    const key = objectKeyName(property);
    return key === null || key === 'error';
  });
}

/**
 * The fields of `data` that say who is authenticated. On failure each is
 * `null` while `data` itself is still an object — which is what makes testing
 * `data` (always truthy) the bypass and testing these the fail-closed check.
 * They are the SDK's response keys, not variable names.
 */
const IDENTITY_FIELDS = new Set(['user', 'session', 'claims']);

/** Statements whose `test` decides a branch. */
const TEST_OWNERS = new Set([
  'IfStatement',
  'ConditionalExpression',
  'WhileStatement',
  'DoWhileStatement',
  'ForStatement',
]);

/**
 * Is this identity read checked before it is trusted?
 *
 * Walks up through the expression it sits in — `!user`, `user?.id`,
 * `user && …`, `session.user.id === owner` — and answers yes when that
 * expression is a branch test, a short-circuit operand, or an optional chain.
 * Each of those takes the "no identity" path on failure: fail-closed.
 */
function isGuarded(node: TSESTree.Node): boolean {
  let current: TSESTree.Node = node;
  // Every node on the way up has a parent: the walk stops at the first one
  // that is not part of the expression, and `Program` never is.
  for (let parent = current.parent!; ; parent = parent.parent!) {
    if (parent.type === 'LogicalExpression') return true;
    // `x !== undefined` / `x === undefined` is passed by the `null` a failure
    // yields, so it is no guard; `!= null`, `=== null` and `!= undefined` are.
    if (
      parent.type === 'BinaryExpression' &&
      comparesStrictlyWithUndefined(parent)
    ) {
      return false;
    }
    if (parent.type === 'MemberExpression' && parent.optional) return true;
    if (TEST_OWNERS.has(parent.type)) {
      return (parent as { test?: TSESTree.Node | null }).test === current;
    }
    if (
      parent.type !== 'MemberExpression' &&
      parent.type !== 'ChainExpression' &&
      parent.type !== 'UnaryExpression' &&
      parent.type !== 'BinaryExpression' &&
      parent.type !== 'TSNonNullExpression'
    ) {
      return false;
    }
    current = parent;
  }
}

/** `a === undefined` / `undefined !== a`, or the same with `void 0`. */
function comparesStrictlyWithUndefined(
  node: TSESTree.BinaryExpression,
): boolean {
  if (node.operator !== '===' && node.operator !== '!==') return false;
  const isUndefined = (side: TSESTree.Node) =>
    (side.type === 'Identifier' && side.name === 'undefined') ||
    (side.type === 'UnaryExpression' && side.operator === 'void');
  return isUndefined(node.left) || isUndefined(node.right);
}

/**
 * Does the value leave this function's hands — returned, passed on, stored?
 * The caller then makes the decision, and this node cannot see it.
 */
function escapes(node: TSESTree.Node): boolean {
  let current = node;
  // `data?.user` is wrapped in a ChainExpression; `user as User` in a cast.
  while (
    current.parent?.type === 'ChainExpression' ||
    current.parent?.type === 'TSAsExpression' ||
    current.parent?.type === 'TSNonNullExpression'
  ) {
    current = current.parent;
  }
  const parent = current.parent;
  switch (parent?.type) {
    case 'ReturnStatement':
    case 'ArrowFunctionExpression':
    case 'CallExpression':
    case 'NewExpression':
    case 'Property':
    case 'ArrayExpression':
    case 'SpreadElement':
    case 'JSXExpressionContainer':
    case 'VariableDeclarator':
    case 'AssignmentExpression':
    case 'AwaitExpression':
      return true;
    default:
      return false;
  }
}

/**
 * Is the auth result handled fail-closed even without its `error`?
 *
 * `const { data: { user } } = await supabase.auth.getUser(); if (!user) …` is
 * Supabase's own documented pattern, and it is safe: a failure yields
 * `user === null` and the guard denies. The rule stays silent when any
 * identity field is guarded or handed on. What it still reports is the result
 * trusted without either — `if (data) …` (always truthy, the bypass),
 * `user!.id` with no check, or a result never read at all.
 */
function isFailClosed(
  pattern: TSESTree.ObjectPattern,
  variables: readonly TSESLint.Scope.Variable[],
): boolean {
  // Every identifier a pattern binds is one of the declared variables.
  const variableFor = (id: TSESTree.Node) =>
    variables.find((variable) => variable.defs[0]?.name === id)!;

  // No rest element here: `bindsError` already abstained on one.
  for (const property of pattern.properties as TSESTree.Property[]) {
    if (objectKeyName(property) !== 'data') continue;
    const value =
      property.value.type === 'AssignmentPattern'
        ? property.value.left
        : property.value;

    // `data: { user }` — the identity is bound directly.
    if (value.type === 'ObjectPattern') {
      for (const field of value.properties) {
        if (field.type !== 'Property') continue;
        const key = objectKeyName(field);
        if (key === null || !IDENTITY_FIELDS.has(key)) continue;
        const bound =
          field.value.type === 'AssignmentPattern'
            ? field.value.left
            : field.value;
        const variable = variableFor(bound);
        if (
          readsOf(variable).some(
            (identifier) => isGuarded(identifier) || escapes(identifier),
          )
        ) {
          return true;
        }
      }
      continue;
    }

    // `data` bound whole — `data.user` read in a check, or `data` handed on.
    for (const identifier of readsOf(variableFor(value))) {
      const parent = identifier.parent;
      const field =
        parent?.type === 'MemberExpression' && parent.object === identifier
          ? propertyName(parent)
          : null;
      if (field !== null && IDENTITY_FIELDS.has(field)) {
        if (isGuarded(parent!) || escapes(parent!)) return true;
      } else if (escapes(identifier)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Where a binding is read. The declaration itself is a write reference whose
 * identifier sits inside the pattern, and must not count as a use.
 */
function readsOf(variable: TSESLint.Scope.Variable): TSESTree.Identifier[] {
  return variable.references
    .filter((ref) => ref.isRead())
    .map((ref) => ref.identifier as TSESTree.Identifier);
}

/** `await x` or `x` — the call either way. */
function unwrapAwait(node: TSESTree.Node): TSESTree.Node {
  return node.type === 'AwaitExpression' ? node.argument : node;
}

export const requireAuthErrorCheck = createRule<[], MessageIds>({
  name: 'require-auth-error-check',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-supabase-security/docs/rules/require-auth-error-check.md',
      description: 'Read `error` from a Supabase auth result',
      cwe: 'CWE-287',
      cvss: 7.5,
    },
    messages: {
      missingErrorCheck: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Supabase Auth Result Destructured Without Its Error',
        cwe: 'CWE-287',
        owasp: 'A07:2021',
        cvss: 7.5,
        description:
          '`{{method}}()` reports a missing, expired or forged token by returning `error`, not by throwing — destructuring only `data` reads that failure as an anonymous success',
        severity: 'HIGH',
        compliance: ['SOC2', 'ISO27001', 'HIPAA'],
        fix: 'Take the error and act on it: const { data, error } = await supabase.auth.{{method}}(); if (error) throw error;',
        documentationLink:
          'https://supabase.com/docs/reference/javascript/auth-getuser',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    if (!fileUsesSupabase(context.sourceCode.ast)) return {};
    const sourceCode = context.sourceCode;

    /** The auth method a call invokes, if it is one this rule covers. */
    const authMethodOf = (node: TSESTree.Node): string | undefined => {
      const call = unwrapAwait(node);
      return call.type === 'CallExpression'
        ? isSupabaseAuthCall(call.callee as TSESTree.Expression)
        : undefined;
    };

    function check(
      pattern: TSESTree.ObjectPattern,
      owner: TSESTree.Node,
      method: string,
    ): void {
      if (bindsError(pattern)) return;
      if (isFailClosed(pattern, sourceCode.getDeclaredVariables(owner))) return;
      context.report({
        node: pattern,
        messageId: 'missingErrorCheck',
        data: { method },
      });
    }

    return {
      VariableDeclarator(node): void {
        if (node.id.type !== 'ObjectPattern') return;
        if (node.init === null) return;
        const method = authMethodOf(node.init);
        if (method !== undefined) check(node.id, node, method);
      },

      /*
       * `supabase.auth.getUser().then(({ data }) => …)` — the same result,
       * destructured in the callback's parameter instead of a declarator.
       */
      CallExpression(node): void {
        const { callee } = node;
        if (callee.type !== 'MemberExpression') return;
        if (propertyName(callee) !== 'then') return;
        const method = authMethodOf(callee.object);
        if (method === undefined) return;
        const [onFulfilled] = node.arguments;
        if (
          onFulfilled?.type !== 'ArrowFunctionExpression' &&
          onFulfilled?.type !== 'FunctionExpression'
        )
          return;
        const [param] = onFulfilled.params;
        if (param?.type === 'ObjectPattern') check(param, onFulfilled, method);
      },
    };
  },
});
