/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Keep the Supabase service_role key out of client code
 * @description `service_role` bypasses Row Level Security completely. A build
 * that puts it in the browser bundle hands every visitor unrestricted read and
 * write on the whole database, and the line that does it looks like every other
 * `createClient` call — which is why code review does not catch it.
 * @see https://supabase.com/docs/guides/api/api-keys
 */

import {
  TSESTree,
  createRule,
  formatLLMMessage,
  MessageIcons,
  propertyName,
} from '@interlace/eslint-devkit';

import { fileUsesSupabase } from '../../utils/supabase-evidence';

type MessageIds = 'publicPrefix' | 'inClientComponent';

/**
 * The name says what the key is. Supabase's own docs, dashboard and CLI all call
 * it `SUPABASE_SERVICE_ROLE_KEY`, and the part that matters is `SERVICE_ROLE`:
 * teams shorten the prefix (`SB_`, `PUBLIC_`) but not the middle.
 *
 * Matched on the **property name read off `process.env`**, never on a variable
 * name. Rename every identifier in the file to `foo` and this still fires, which
 * is the test a rule in this repo has to pass.
 */
const SERVICE_ROLE = /SERVICE_ROLE/i;

/** Prefixes whose whole purpose is "inline this into the browser bundle". */
const PUBLIC_PREFIXES = [
  'NEXT_PUBLIC_',
  'VITE_',
  'PUBLIC_',
  'REACT_APP_',
  'GATSBY_',
  'NUXT_PUBLIC_',
  'EXPO_PUBLIC_',
] as const;

/** The import that marks a module as server-only; a build fails if the client reaches it. */
const SERVER_ONLY = new Set(['server-only', 'next/server']);

/**
 * `process.env.X`, `process.env['X']`, and the `import.meta.env.X` spelling Vite
 * and SvelteKit use. Returns the environment variable's name, or undefined when
 * the node is not an environment read at all.
 */
function envVarName(node: TSESTree.MemberExpression): string | undefined {
  const owner = node.object;
  if (owner.type !== 'MemberExpression') return undefined;
  if (propertyName(owner) !== 'env') return undefined;

  const root = owner.object;
  const rootIsProcess =
    (root.type === 'Identifier' && root.name === 'process') ||
    root.type === 'MetaProperty';
  if (!rootIsProcess) return undefined;

  // `propertyName` resolves `.X`, `['X']` and `` [`X`] `` alike — three spellings
  // of the same property, and a rule that reads only the first has a blind spot
  // an attacker does not share.
  return propertyName(node) ?? undefined;
}

/** `'use client'` as the first statement, the way React and Next.js require it. */
function hasUseClientDirective(program: TSESTree.Program): boolean {
  for (const statement of program.body) {
    if (statement.type !== 'ExpressionStatement') break;
    const { expression } = statement;
    if (expression.type !== 'Literal' || typeof expression.value !== 'string')
      break;
    if (expression.value === 'use client') return true;
  }
  return false;
}

function importsServerOnly(program: TSESTree.Program): boolean {
  return program.body.some(
    (statement) =>
      statement.type === 'ImportDeclaration' &&
      typeof statement.source.value === 'string' &&
      SERVER_ONLY.has(statement.source.value),
  );
}

export const noServiceRoleKeyInClient = createRule<[], MessageIds>({
  name: 'no-service-role-key-in-client',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-supabase-security/docs/rules/no-service-role-key-in-client.md',
      description: 'Keep the Supabase service_role key out of client code',
      cwe: 'CWE-798',
      cvss: 9.8,
    },
    messages: {
      publicPrefix: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Supabase service_role Key Behind a Public Env Prefix',
        cwe: 'CWE-798',
        owasp: 'A02:2021',
        cvss: 9.8,
        description:
          '`{{name}}` carries the service_role key under a `{{prefix}}` prefix, which exists to inline the value into the browser bundle — service_role bypasses Row Level Security, so this publishes unrestricted read and write on the whole database',
        severity: 'CRITICAL',
        compliance: ['SOC2', 'PCI-DSS', 'ISO27001', 'GDPR'],
        fix: 'Read the service_role key from an unprefixed server-only variable (`SUPABASE_SERVICE_ROLE_KEY`) and use the anon key in the browser, which RLS is designed to constrain',
        documentationLink: 'https://supabase.com/docs/guides/api/api-keys',
      }),
      inClientComponent: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Supabase service_role Key Read in a Client Component',
        cwe: 'CWE-798',
        owasp: 'A02:2021',
        cvss: 9.8,
        description:
          'This module is a client component (`"use client"`) and reads `{{name}}`; service_role bypasses Row Level Security entirely, and anything a client component reads ships to the browser',
        severity: 'CRITICAL',
        compliance: ['SOC2', 'PCI-DSS', 'ISO27001', 'GDPR'],
        fix: 'Move the service_role client into a server module — a Server Action, a route handler, or a file importing `server-only` — and give the component the anon key',
        documentationLink: 'https://supabase.com/docs/guides/api/api-keys',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const program = context.sourceCode.ast;
    if (!fileUsesSupabase(program)) return {};

    /*
     * A module that imports `server-only` cannot be reached from the client — the
     * bundler fails the build instead. Reading service_role there is the correct
     * thing to do, so the rule abstains rather than reporting the one file that
     * has already done it right.
     */
    if (importsServerOnly(program)) return {};

    const isClientComponent = hasUseClientDirective(program);

    return {
      MemberExpression(node): void {
        const name = envVarName(node);
        if (name === undefined || !SERVICE_ROLE.test(name)) return;

        const prefix = PUBLIC_PREFIXES.find((candidate) =>
          name.startsWith(candidate),
        );
        if (prefix !== undefined) {
          context.report({
            node,
            messageId: 'publicPrefix',
            data: { name, prefix },
          });
          return;
        }
        if (isClientComponent) {
          context.report({
            node,
            messageId: 'inClientComponent',
            data: { name },
          });
        }
      },
    };
  },
});
