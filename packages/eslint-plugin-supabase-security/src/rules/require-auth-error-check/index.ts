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

    return {
      VariableDeclarator(node): void {
        if (node.id.type !== 'ObjectPattern') return;
        if (node.init === null) return;

        /*
         * `await x.auth.getUser()` and the bare call both land here. A `.then()`
         * chain does not, and deliberately: the result there is not destructured
         * at the declarator, so there is nothing to read the omission from.
         */
        const call =
          node.init.type === 'AwaitExpression' ? node.init.argument : node.init;
        if (call.type !== 'CallExpression') return;

        const method = isSupabaseAuthCall(call.callee as TSESTree.Expression);
        if (method === undefined) return;
        if (bindsError(node.id)) return;

        context.report({
          node: node.id,
          messageId: 'missingErrorCheck',
          data: { method },
        });
      },
    };
  },
});
