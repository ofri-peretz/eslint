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
  TSESLint,
  TSESTree,
  createModuleListMatcher,
  createRule,
  followConst,
  formatLLMMessage,
  isCredentialShaped,
  MessageIcons,
  propertyName,
  readObjectProperty,
  resolveObjectLiteral,
  resolveSdkExport,
  sdkExportName,
} from '@interlace/eslint-devkit';

import {
  fileUsesSupabase,
  SUPABASE_SCOPE,
} from '../../utils/supabase-evidence';

type MessageIds =
  | 'publicPrefix'
  | 'inClientComponent'
  | 'inBrowserClient'
  | 'hardcodedServiceRole';

type SourceCode = Readonly<TSESLint.SourceCode>;

/** SvelteKit's public environment modules — everything they export reaches the client. */
const SVELTEKIT_STATIC_PUBLIC = '$env/static/public';
const SVELTEKIT_DYNAMIC_PUBLIC = '$env/dynamic/public';

/** Does a binding come from a `@supabase/*` package? */
const ownsSupabase = createModuleListMatcher([SUPABASE_SCOPE]);

/** Does a binding come from SvelteKit's dynamic public environment? */
const ownsDynamicPublicEnv = (specifier: string): boolean =>
  specifier === SVELTEKIT_DYNAMIC_PUBLIC;

/**
 * Factories whose client only ever runs in the browser: `@supabase/ssr`'s
 * `createBrowserClient` and the auth-helpers generation before it. A key they
 * receive ships in the bundle whether or not the file says `'use client'`.
 * Matched on the export the callee resolves to, not the local name.
 */
const BROWSER_FACTORIES = new Set([
  'createBrowserClient',
  'createBrowserSupabaseClient',
  'createClientComponentClient',
  'createPagesBrowserClient',
]);

/**
 * The name a module exports a binding under — for `$env/static/public` that
 * is the environment variable itself, whatever the import renames it to.
 */
function exportedName(specifier: TSESTree.ImportSpecifier): string {
  return specifier.imported.type === 'Identifier'
    ? specifier.imported.name
    : String(specifier.imported.value);
}

/** The claims a Supabase JWT carries in its payload, if the string is one. */
function jwtRole(value: string): { role?: unknown; iss?: unknown } | undefined {
  const parts = value.split('.');
  if (parts.length !== 3 || !parts[0]!.startsWith('eyJ')) return undefined;
  try {
    // `atob`, not `Buffer`: the plugin also runs in the browser playground.
    const json = atob(parts[1]!.replace(/-/g, '+').replace(/_/g, '/'));
    const payload: unknown = JSON.parse(json);
    return typeof payload === 'object' && payload !== null
      ? (payload as { role?: unknown; iss?: unknown })
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Is this string a working service-role key?
 *
 * Read off the value itself: a legacy key is a JWT whose payload says
 * `"role":"service_role"`, and a current one is an `sb_secret_` key. Excluded
 * are the local-development keys every `supabase start` prints (issuer
 * `supabase-demo`, public by design) and stand-ins that are not key-shaped
 * (`sb_secret_xyz`).
 */
export function isServiceRoleKey(value: string): boolean {
  if (value.startsWith('sb_secret_')) return isCredentialShaped(value);
  const payload = jwtRole(value);
  return payload?.role === 'service_role' && payload.iss !== 'supabase-demo';
}

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
      inBrowserClient: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Supabase service_role Key Given to a Browser Client',
        cwe: 'CWE-798',
        owasp: 'A02:2021',
        cvss: 9.8,
        description:
          "`{{factory}}` builds a client that runs in the browser, and it receives `{{name}}` — service_role bypasses Row Level Security entirely, and a browser client's key ships to every visitor",
        severity: 'CRITICAL',
        compliance: ['SOC2', 'PCI-DSS', 'ISO27001', 'GDPR'],
        fix: 'Give the browser client the anon (publishable) key; keep service_role in a server-only module',
        documentationLink: 'https://supabase.com/docs/guides/api/api-keys',
      }),
      hardcodedServiceRole: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Supabase service_role Key Hardcoded',
        cwe: 'CWE-798',
        owasp: 'A02:2021',
        cvss: 9.8,
        description:
          'This string is a service_role key (a JWT whose role claim is service_role, or an sb_secret_ key) — committed, it is readable by anyone with the repository and by every bundle that includes this module, and it bypasses Row Level Security entirely',
        severity: 'CRITICAL',
        compliance: ['SOC2', 'PCI-DSS', 'ISO27001', 'GDPR'],
        fix: 'Rotate the key in the Supabase dashboard, then read it from an unprefixed server-only environment variable',
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
    const sourceCode: SourceCode = context.sourceCode;

    /*
     * A literal service-role key is reported wherever it sits, server-only
     * module or not: it is committed either way.
     */
    const literalVisitor = {
      Literal(node: TSESTree.Literal): void {
        if (typeof node.value === 'string' && isServiceRoleKey(node.value)) {
          context.report({ node, messageId: 'hardcodedServiceRole' });
        }
      },
    };

    /*
     * A module that imports `server-only` cannot be reached from the client — the
     * bundler fails the build instead. Reading service_role there is the correct
     * thing to do, so the rule abstains rather than reporting the one file that
     * has already done it right.
     */
    if (importsServerOnly(program)) return literalVisitor;

    const isClientComponent = hasUseClientDirective(program);

    /**
     * SvelteKit: `env.PUBLIC_…` on the `env` from `$env/dynamic/public` — the
     * module only exposes `PUBLIC_` variables, and only to be read client-side.
     */
    function dynamicPublicEnvName(
      node: TSESTree.MemberExpression,
    ): string | undefined {
      const binding = resolveSdkExport(node, sourceCode, ownsDynamicPublicEnv);
      return binding !== undefined && binding.path.length === 2
        ? sdkExportName(binding)
        : undefined;
    }

    /**
     * The service-role variable an argument reads, directly or through a const
     * — or, for the auth-helpers factories that take an options object, under
     * its `supabaseKey`.
     */
    function serviceRoleRead(node: TSESTree.Node): string | undefined {
      const options = resolveObjectLiteral(node, sourceCode);
      if (options !== undefined) {
        const read = readObjectProperty(options, 'supabaseKey', sourceCode);
        return read.kind === 'value' ? serviceRoleRead(read.node) : undefined;
      }
      const value = followConst(node, sourceCode);
      if (value.type !== 'MemberExpression') return undefined;
      const name = envVarName(value);
      return name !== undefined && SERVICE_ROLE.test(name) ? name : undefined;
    }

    return {
      ...literalVisitor,

      MemberExpression(node): void {
        const name = envVarName(node) ?? dynamicPublicEnvName(node);
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

      /*
       * SvelteKit: `import { PUBLIC_…SERVICE_ROLE… } from '$env/static/public'`
       * — the import itself is the publication. The imported (exported) name is
       * the variable's name in the environment, whatever it is renamed to here.
       */
      ImportDeclaration(node): void {
        if (node.source.value !== SVELTEKIT_STATIC_PUBLIC) return;
        for (const specifier of node.specifiers) {
          if (specifier.type !== 'ImportSpecifier') continue;
          const variable = exportedName(specifier);
          if (!SERVICE_ROLE.test(variable)) continue;
          context.report({
            node: specifier,
            messageId: 'publicPrefix',
            data: { name: variable, prefix: 'PUBLIC_' },
          });
        }
      },

      /*
       * `createBrowserClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY)` — no
       * prefix and no directive, but the factory only builds browser clients.
       */
      CallExpression(node): void {
        const binding = resolveSdkExport(node.callee, sourceCode, ownsSupabase);
        if (binding === undefined) return;
        const factory = sdkExportName(binding);
        if (!BROWSER_FACTORIES.has(factory)) return;
        for (const argument of node.arguments) {
          // Only the unprefixed / no-directive case is new; the others report
          // at the read itself.
          const name = serviceRoleRead(argument);
          if (name === undefined) continue;
          if (PUBLIC_PREFIXES.some((p) => name.startsWith(p))) continue;
          if (isClientComponent) continue;
          context.report({
            node: argument,
            messageId: 'inBrowserClient',
            data: { factory, name },
          });
        }
      },
    };
  },
});
