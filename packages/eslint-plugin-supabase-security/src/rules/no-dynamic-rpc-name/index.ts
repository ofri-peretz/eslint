/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Call `.rpc()` with a literal function name
 * @description `supabase.rpc(name)` executes a Postgres function by name over
 * PostgREST. When that name is computed, the caller chooses which database
 * function runs — and Supabase projects routinely expose privileged helpers
 * (`delete_user`, `grant_admin`) alongside the intended one.
 * Reads the call, not the dataflow: a name held in a variable reports even when a
 * closed allowlist produced it. That is a known cost of staying AST-structural —
 * the alternative is inferring provenance — and it is written into the fix text
 * and the rule doc rather than left for a user to discover.
 *
 * @see https://supabase.com/docs/reference/javascript/rpc
 */

import {
  TSESTree,
  createRule,
  formatLLMMessage,
  MessageIcons,
  propertyName,
} from '@interlace/eslint-devkit';

import { fileUsesSupabase } from '../../utils/supabase-evidence';

type MessageIds = 'dynamicRpcName';

/**
 * A template literal with no `${}` is a literal: `` `get_user` `` is exactly as
 * fixed as `'get_user'`, so it is not a finding.
 */
function isFixedString(node: TSESTree.Node): boolean {
  if (node.type === 'Literal') return typeof node.value === 'string';
  if (node.type === 'TemplateLiteral') return node.expressions.length === 0;
  return false;
}

export const noDynamicRpcName = createRule<[], MessageIds>({
  name: 'no-dynamic-rpc-name',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-supabase-security/docs/rules/no-dynamic-rpc-name.md',
      description: 'Call `.rpc()` with a literal function name',
      cwe: 'CWE-913',
      cvss: 8.1,
    },
    messages: {
      dynamicRpcName: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Supabase RPC Called With a Computed Function Name',
        cwe: 'CWE-913',
        owasp: 'A03:2021',
        cvss: 8.1,
        description:
          '`.rpc()` receives a computed name, so the caller decides which Postgres function executes rather than the code doing so',
        severity: 'HIGH',
        compliance: ['SOC2', 'ISO27001'],
        fix: 'Name the function at the call: `if (kind === "profile") return db.rpc("get_user_profile", args);`. A name held in a variable still reports even when an allowlist produced it — this rule reads the call, not where the value came from. For a reviewed allowlist, disable the line with the reason.',
        documentationLink: 'https://supabase.com/docs/reference/javascript/rpc',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    if (!fileUsesSupabase(context.sourceCode.ast)) return {};

    return {
      CallExpression(node): void {
        const { callee } = node;
        if (callee.type !== 'MemberExpression') return;
        if (propertyName(callee) !== 'rpc') return;

        const [name] = node.arguments;
        if (name === undefined) return;
        // A spread is unreadable from here, not evidence of a computed name.
        if (name.type === 'SpreadElement') return;
        if (isFixedString(name)) return;

        context.report({ node: name, messageId: 'dynamicRpcName' });
      },
    };
  },
});
