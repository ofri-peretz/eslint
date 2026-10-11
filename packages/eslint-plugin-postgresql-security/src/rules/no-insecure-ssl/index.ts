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
  staticString,
} from '@interlace/eslint-devkit';
import { NoInsecureSslOptions } from '../../types';
import { usesPostgres } from '../../utils';
import {
  connectionConfigArguments,
  typedConnectionConfig,
} from '../../utils/connection-config';
import { envOf, follow, type Value } from '../../utils/cross-file';

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
  const staticText1 = staticString(prop.key);
  if (staticText1 !== null) {
    return staticText1;
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
function disablesVerification(start: Value): boolean {
  const value = follow(start).node;
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
    if (!usesPostgres(context)) return {};

    /**
     * One finding per insecure property, however many routes reach it — a
     * typed `const config: PoolConfig` that is ALSO passed to `new Pool(config)`
     * is one defect, not two.
     */
    const env = envOf(context);
    const reported = new Set<TSESTree.Node>();
    const report = (node: TSESTree.Node): void => {
      if (reported.has(node)) return;
      reported.add(node);
      context.report({ node, messageId: 'noInsecureSsl' });
    };

    /**
     * Every object an `ssl` value can evaluate to. `isProd ? { rejectUnauthorized:
     * false } : false` — the Heroku snippet — disables verification in exactly
     * the environment that matters, and the rule read only a bare object.
     */
    const sslBranches = (start: Value): Value[] => {
      const value = follow(start);
      const at = (node: TSESTree.Node): Value => ({ node, scope: value.env.scopeOf(node), env: value.env });
      if (value.node.type === AST_NODE_TYPES.ConditionalExpression) {
        return [...sslBranches(at(value.node.consequent)), ...sslBranches(at(value.node.alternate))];
      }
      if (value.node.type === AST_NODE_TYPES.LogicalExpression) {
        return [...sslBranches(at(value.node.left)), ...sslBranches(at(value.node.right))];
      }
      return [value];
    };

    /**
     * Report `node` when it sits in this file; otherwise report `fallback`, the
     * place in this file that led to a config written in another module or in
     * a JSON file.
     */
    const reportAt = (value: Value, fallback: TSESTree.Node): void => {
      report(value.env.module === null ? value.node : fallback);
    };

    const checkConfig = (argument: TSESTree.Node, scope: TSESLint.Scope.Scope): void => {
      const config = follow({ node: argument, scope, env });
      const at = (node: TSESTree.Node): Value => ({ node, scope: config.env.scopeOf(node), env: config.env });

      // `new Client('postgres://…?sslmode=no-verify')` — the DSN passed bare.
      const dsnText = staticString(config.node);
      if (dsnText !== null) {
        if (dsnSkipsVerification(dsnText)) report(argument);
        return;
      }

      if (config.node.type !== AST_NODE_TYPES.ObjectExpression) return;

      // `connectionString: 'postgres://…?sslmode=no-verify'`
      const connectionString = property(config.node, 'connectionString');
      if (connectionString !== undefined) {
        const dsn = follow(at(connectionString.value)).node;
        if (
          dsn.type === AST_NODE_TYPES.Literal &&
          typeof dsn.value === 'string' &&
          dsnSkipsVerification(dsn.value)
        ) {
          reportAt(at(connectionString.value), argument);
          return;
        }
      }

      const ssl = property(config.node, 'ssl');
      if (ssl === undefined) return;

      for (const branch of sslBranches(at(ssl.value))) {
        if (branch.node.type !== AST_NODE_TYPES.ObjectExpression) continue;
        const rejectUnauthorized = property(branch.node, 'rejectUnauthorized');
        if (
          rejectUnauthorized !== undefined &&
          disablesVerification({ node: rejectUnauthorized.value, scope: branch.env.scopeOf(rejectUnauthorized.value), env: branch.env })
        ) {
          reportAt({ node: rejectUnauthorized, scope: branch.scope, env: branch.env }, argument);
        }
      }
    };

    const checkCall = (node: TSESTree.NewExpression | TSESTree.CallExpression): void => {
      const scope = context.sourceCode.getScope(node);
      for (const argument of connectionConfigArguments(node, scope)) checkConfig(argument, scope);
    };

    return {
      NewExpression: checkCall,
      // postgres.js `postgres(url, opts)` and pg-promise `pgp(opts)`.
      CallExpression: checkCall,
      // `export const config: PoolConfig = { … }` — consumed in another file.
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        const scope = context.sourceCode.getScope(node);
        const config = typedConnectionConfig(node, scope);
        if (config !== null) checkConfig(config, scope);
      },
    };
  },
};
