/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import {
  TSESLint,
  AST_NODE_TYPES,
  TSESTree,
  formatLLMMessage,
  MessageIcons,
  resolveModuleBinding,
  unwrapTypeSyntax,
  staticString,
} from '@interlace/eslint-devkit';
import { NoHardcodedCredentialsOptions } from '../../types';
import { PG_PROTOCOLS } from '../../constants';
import { fileUsesPostgres, PG_MODULES } from '../../utils';

const PG_MODULE_SET: ReadonlySet<string> = new Set(PG_MODULES);

/**
 * Is this `new` callee a PostgreSQL client constructor?
 *
 * The rule used to ask whether the callee was SPELLED `Pool` or `Client`, which
 * is two defects at once. It reported `new Client({ password: 'x' })` on a test
 * double imported from `../test/fake-transport` — no database within reach —
 * and it missed `new pg.Pool(...)`, the namespace spelling, because that callee
 * is a MemberExpression with no `.name` at all.
 *
 * `resolveModuleBinding` answers the question that matters: what did this
 * identifier import?
 */
function isPgClientConstructor(
  callee: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
): boolean {
  const binding = resolveModuleBinding(callee, scope);
  if (binding === undefined) return false;
  const parts = binding.module.split('/');
  const root = binding.module.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
  if (!PG_MODULE_SET.has(root)) return false;
  const [exported] = binding.path;
  return exported === undefined || exported === 'Pool' || exported === 'Client';
}

/**
 * The expression a value really holds, following a written-once local binding.
 *
 * Every real application declares its connection config above the constructor,
 * and hoisting a secret into a named constant reads as MORE careful than
 * inlining it. The rule read neither: it only looked at an object literal
 * written at the call site, with literal values written in place.
 */
function effectiveValue(
  node: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
  depth = 0,
): TSESTree.Node {
  if (depth > 4) return node;
  const bare = unwrapTypeSyntax(node);
  if (bare !== node) return effectiveValue(bare, scope, depth + 1);
  if (node.type !== AST_NODE_TYPES.Identifier) return node;

  for (let current: TSESLint.Scope.Scope | null = scope; current; current = current.upper) {
    const variable = current.set.get(node.name);
    if (variable === undefined) continue;
    if (variable.references.filter((ref) => ref.isWrite()).length !== 1) return node;
    const def = variable.defs.find((d) => d.type === 'Variable');
    const init = def === undefined ? null : (def.node as TSESTree.VariableDeclarator).init;
    return init == null ? node : effectiveValue(init, scope, depth + 1);
  }
  return node;
}

/** The name a property key denotes, including a computed string literal. */
function propertyKeyName(prop: TSESTree.Property): string | null {
  if (prop.key.type === AST_NODE_TYPES.Identifier && !prop.computed) return prop.key.name;
  const staticText1 = staticString(prop.key);
  if (staticText1 !== null) {
    return staticText1;
  }
  return null;
}

/** The named property of an object expression. */
function property(
  object: TSESTree.ObjectExpression,
  name: string,
): TSESTree.Property | undefined {
  return object.properties.find(
    (prop): prop is TSESTree.Property =>
      prop.type === AST_NODE_TYPES.Property && propertyKeyName(prop) === name,
  );
}

/** The string a node holds, when it folds to a plain string literal. */
function stringValue(node: TSESTree.Node, scope: TSESLint.Scope.Scope): string | null {
  const value = effectiveValue(node, scope);
  return staticString(value) !== null
    ? staticString(value)
    : null;
}

/**
 * Does this DSN actually carry a secret?
 *
 * The rule reported any string containing `postgres://`, which made
 * `'postgres://db.internal:5432/orders'` — a host and a database and nothing
 * else — a CRITICAL hardcoded-credential finding. There is no secret in it:
 * peer, IAM or certificate authentication supplies one at connect time. That
 * false positive fires on almost every repository's development defaults, and
 * it is the kind that gets a rule switched off.
 *
 * The credential is the PASSWORD in the userinfo, so that is what gets parsed
 * out. A username alone is not a secret.
 */
function dsnPassword(dsn: string): string | null {
  if (!PG_PROTOCOLS.some((protocol) => dsn.startsWith(protocol))) return null;
  let parsed: URL;
  try {
    parsed = new URL(dsn);
  } catch {
    // A DSN too malformed to parse discloses nothing this rule can name.
    return null;
  }
  return parsed.password === '' ? null : parsed.password;
}

export const noHardcodedCredentials: TSESLint.RuleModule<
  'noHardcodedCredentials',
  NoHardcodedCredentialsOptions
> = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Detect hardcoded credentials in pg Client or Pool initialization.',
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-postgresql-security/docs/rules/no-hardcoded-credentials.md',
      cwe: 'CWE-798',
      cvss: 9.8,
    },
    messages: {
      noHardcodedCredentials: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Hardcoded Credentials',
        description: 'Hardcoded credentials detected in database connection.',
        severity: 'CRITICAL',
        cwe: 'CWE-798',
        owasp: 'A07:2021',
        compliance: ['SOC2', 'PCI-DSS', 'ISO27001', 'NIST-CSF'],
        effort: 'low',
        fix: 'Use environment variables (process.env.DB_PASSWORD) instead of hardcoding secrets.',
        documentationLink: 'https://owasp.org/www-community/vulnerabilities/Use_of_hard-coded_password',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    // Every rule here is PostgreSQL-specific, and none of them knew it: over
    // 108,838 files, 94% of this plugin's findings were in files with no
    // PostgreSQL client at all. Registering no visitors is both the gate and
    // the cheap path — a file with no database in it does no work.
    if (!fileUsesPostgres(context.sourceCode.ast)) return {};

    return {
      NewExpression(node: TSESTree.NewExpression) {
        const scope = context.sourceCode.getScope(node);
        if (!isPgClientConstructor(node.callee, scope)) return;

        const [firstArgument] = node.arguments;
        if (firstArgument === undefined) return;

        const config = effectiveValue(firstArgument, scope);

        // `new Client('postgres://app:pw@host/db')` — the DSN passed bare.
        const staticText2 = staticString(config);
        if (staticText2 !== null) {
          if (dsnPassword(staticText2) !== null) {
            context.report({ node: firstArgument, messageId: 'noHardcodedCredentials' });
          }
          return;
        }

        if (config.type !== AST_NODE_TYPES.ObjectExpression) return;

        // `connectionString: 'postgres://app:pw@host/db'`
        const connectionString = property(config, 'connectionString');
        if (connectionString !== undefined) {
          const dsn = stringValue(connectionString.value, scope);
          if (dsn !== null && dsnPassword(dsn) !== null) {
            context.report({
              node: connectionString.value,
              messageId: 'noHardcodedCredentials',
            });
          }
        }

        // `password: 'p4ssw0rd'`
        //
        // An EMPTY password is deliberately not a finding: `password: ''` is how
        // a unix-socket or trust-authentication setup is written, and it
        // discloses nothing. The old rule reported any Literal at all, which
        // made `password: ''` and `password: null` CRITICAL findings.
        const password = property(config, 'password');
        if (password !== undefined) {
          const secret = stringValue(password.value, scope);
          if (secret !== null && secret !== '') {
            context.report({ node: password.value, messageId: 'noHardcodedCredentials' });
          }
        }
      },
    };
  },
};
