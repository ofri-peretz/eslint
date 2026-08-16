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
} from '@interlace/eslint-devkit';
import { NoInsecureSslOptions } from '../../types';
import { fileUsesPostgres, PG_MODULES } from '../../utils';

const PG_MODULE_SET: ReadonlySet<string> = new Set(PG_MODULES);

/**
 * Is this `new` callee a PostgreSQL client constructor?
 *
 * The rule used to ask whether the callee was SPELLED `Pool` or `Client`, which
 * is two defects at once. It reported `new Pool(...)` from `generic-pool` — a
 * worker pool with no TLS and no database, whose `ssl` key means nothing — and
 * it missed `new pg.Pool(...)`, the namespace spelling, because that callee is
 * a MemberExpression with no `.name` at all.
 *
 * `resolveModuleBinding` answers the question that actually matters: what did
 * this identifier import? A `Pool` from `pg` is one; a `Pool` from anywhere
 * else is not, however it is spelled.
 */
function isPgClientConstructor(
  callee: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
): boolean {
  const binding = resolveModuleBinding(callee, scope);
  if (binding === undefined) return false;
  // Compared on the package ROOT, so `pg/lib/client` and `@vercel/postgres/edge`
  // count as their package.
  const parts = binding.module.split('/');
  const root = binding.module.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
  if (!PG_MODULE_SET.has(root)) return false;
  // `import { Pool } from 'pg'`            -> path ['Pool']
  // `import pg from 'pg'; new pg.Pool()`   -> path ['Pool'] via the member walk
  // `const Pool = require('pg-pool')`      -> path [], the module IS the ctor
  const [exported] = binding.path;
  return exported === undefined || exported === 'Pool' || exported === 'Client';
}

/**
 * The expression a value really holds, following a written-once local binding.
 *
 * Every real application builds its connection config one binding away from the
 * constructor — `const config = {...}; new Pool(config)` — and the rule read
 * only a config object written inline at the call site. Six of the seven
 * vulnerable fixtures in this rule's corpus were missed for that one reason.
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

/**
 * The name a property key denotes, or `null` when it cannot be known statically.
 *
 * A COMPUTED key whose expression is a plain string literal names exactly the
 * same property as the bare spelling: `{ ['ssl']: … }` is `{ ssl: … }`. The
 * rule skipped computed keys entirely, so writing the brackets turned the
 * finding off — an evasion that costs an attacker two characters.
 */
function propertyKeyName(prop: TSESTree.Property): string | null {
  if (prop.key.type === AST_NODE_TYPES.Identifier && !prop.computed) {
    return prop.key.name;
  }
  if (prop.key.type === AST_NODE_TYPES.Literal && typeof prop.key.value === 'string') {
    return prop.key.value;
  }
  return null;
}

/** The named property of an object expression, if it is written plainly. */
function property(
  object: TSESTree.ObjectExpression,
  name: string,
): TSESTree.Property | undefined {
  return object.properties.find(
    (prop): prop is TSESTree.Property =>
      prop.type === AST_NODE_TYPES.Property && propertyKeyName(prop) === name,
  );
}

/**
 * Does this expression disable certificate verification?
 *
 * Two things the literal test missed:
 *
 * `rejectUnauthorized: false` was matched as a bare literal, so hoisting the
 * value into a named constant — which reads as MORE careful, not less — turned
 * the finding off. The certificate is unchecked either way.
 *
 * And Node COERCES the option rather than comparing it to `false`. Measured on
 * this Node build, `new TLSSocket(sock, { rejectUnauthorized: 0 })` yields
 * `_rejectUnauthorized === false` exactly as `false` does, so every falsy
 * literal disables verification. `undefined` is deliberately not one of them:
 * an absent option takes `tls.connect`'s default, which is to verify.
 */
function disablesVerification(node: TSESTree.Node, scope: TSESLint.Scope.Scope): boolean {
  const value = effectiveValue(node, scope);
  if (value.type !== AST_NODE_TYPES.Literal) return false;
  // `null` is a Literal with value `null`; `undefined` is an Identifier and
  // never reaches here.
  return value.value === false || value.value === 0 || value.value === '' || value.value === null;
}

/**
 * A DSN that encrypts without authenticating.
 *
 * `sslmode=no-verify` is libpq's spelling of `rejectUnauthorized: false`, and it
 * is the one that survives review, because it looks like configuration rather
 * than code. Matched on the parsed parameter, not by searching the string for a
 * word.
 */
function dsnSkipsVerification(dsn: string): boolean {
  const separator = dsn.indexOf('?');
  if (separator === -1) return false;
  const sslmode = new URLSearchParams(dsn.slice(separator + 1)).get('sslmode');
  return sslmode !== null && sslmode.toLowerCase() === 'no-verify';
}

export const noInsecureSsl: TSESLint.RuleModule<
  'noInsecureSsl',
  NoInsecureSslOptions
> = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent the use of insecure SSL configurations (rejectUnauthorized: false).',
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-postgresql-security/docs/rules/no-insecure-ssl.md',
      cwe: 'CWE-319',
      cvss: 7.5,
    },
    messages: {
      noInsecureSsl: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Insecure SSL',
        description: 'Insecure SSL configuration detected (rejectUnauthorized: false).',
        severity: 'HIGH',
        cwe: 'CWE-319',
        owasp: 'A05:2021',
        compliance: ['SOC2', 'PCI-DSS', 'HIPAA', 'GDPR'],
        effort: 'low',
        fix: 'Set "rejectUnauthorized: true" or use a valid CA bundle. Do not disable SSL verification in production.',
        documentationLink: 'https://node-postgres.com/features/ssl',
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

        // `new Client('postgres://…?sslmode=no-verify')` — the DSN passed bare.
        if (config.type === AST_NODE_TYPES.Literal && typeof config.value === 'string') {
          if (dsnSkipsVerification(config.value)) {
            context.report({ node: firstArgument, messageId: 'noInsecureSsl' });
          }
          return;
        }

        if (config.type !== AST_NODE_TYPES.ObjectExpression) return;

        // `connectionString: 'postgres://…?sslmode=no-verify'`
        const connectionString = property(config, 'connectionString');
        if (connectionString !== undefined) {
          const dsn = effectiveValue(connectionString.value, scope);
          if (
            dsn.type === AST_NODE_TYPES.Literal &&
            typeof dsn.value === 'string' &&
            dsnSkipsVerification(dsn.value)
          ) {
            context.report({ node: connectionString.value, messageId: 'noInsecureSsl' });
            return;
          }
        }

        const ssl = property(config, 'ssl');
        if (ssl === undefined) return;

        const sslValue = effectiveValue(ssl.value, scope);
        if (sslValue.type !== AST_NODE_TYPES.ObjectExpression) return;

        const rejectUnauthorized = property(sslValue, 'rejectUnauthorized');
        if (rejectUnauthorized === undefined) return;

        if (disablesVerification(rejectUnauthorized.value, scope)) {
          context.report({ node: rejectUnauthorized, messageId: 'noInsecureSsl' });
        }
      },
    };
  },
};
