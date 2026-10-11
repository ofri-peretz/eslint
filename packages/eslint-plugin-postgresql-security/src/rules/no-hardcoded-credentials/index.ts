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
import { NoHardcodedCredentialsOptions } from '../../types';
import { PG_PROTOCOLS } from '../../constants';
import { fileUsesPostgres } from '../../utils';
import { connectionConfigArguments, effectiveValue } from '../../utils/connection-config';

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
function parseDsnWithPassword(dsn: string): URL | null {
  if (!PG_PROTOCOLS.some((protocol) => dsn.startsWith(protocol))) return null;
  let parsed: URL;
  try {
    parsed = new URL(dsn);
  } catch {
    // A DSN too malformed to parse discloses nothing this rule can name.
    return null;
  }
  return parsed.password === '' ? null : parsed;
}

/** Hosts that only ever reach the developer's own machine. */
const LOOPBACK_HOSTS: ReadonlySet<string> = new Set(['localhost', '127.0.0.1', '[::1]']);

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

    /**
     * String literals already judged as the DSN of a config site — so the
     * file-wide DSN sweep below does not report the same literal twice.
     */
    const consumed = new Set<TSESTree.Node>();
    /** Every literal in the file that spells a DSN, judged at `Program:exit`. */
    const dsnLiterals: TSESTree.Node[] = [];

    /** The string a node folds to, recording the literal it came from. */
    const stringValue = (node: TSESTree.Node, scope: TSESLint.Scope.Scope): string | null => {
      const value = effectiveValue(node, scope);
      const text = staticString(value);
      if (text !== null) consumed.add(value);
      return text;
    };

    const checkConfig = (argument: TSESTree.Node, scope: TSESLint.Scope.Scope): void => {
      // `new Client('postgres://app:pw@host/db')` — the DSN passed bare.
      const bare = stringValue(argument, scope);
      if (bare !== null) {
        if (parseDsnWithPassword(bare) !== null) {
          context.report({ node: argument, messageId: 'noHardcodedCredentials' });
        }
        return;
      }

      const config = effectiveValue(argument, scope);
      if (config.type !== AST_NODE_TYPES.ObjectExpression) return;

      // `connectionString: 'postgres://app:pw@host/db'`
      const connectionString = property(config, 'connectionString');
      if (connectionString !== undefined) {
        const dsn = stringValue(connectionString.value, scope);
        if (dsn !== null && parseDsnWithPassword(dsn) !== null) {
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
    };

    const checkCall = (node: TSESTree.NewExpression | TSESTree.CallExpression): void => {
      const scope = context.sourceCode.getScope(node);
      for (const argument of connectionConfigArguments(node, scope)) checkConfig(argument, scope);
    };

    const collectDsn = (node: TSESTree.Literal | TSESTree.TemplateLiteral): void => {
      const text = staticString(node);
      if (text !== null && PG_PROTOCOLS.some((protocol) => text.startsWith(protocol))) {
        dsnLiterals.push(node);
      }
    };

    return {
      // pg `new Pool/Client`, postgres.js `postgres(…)`, pg-promise `pgp(…)`.
      NewExpression: checkCall,
      CallExpression: checkCall,

      Literal: collectDsn,
      TemplateLiteral: collectDsn,

      /**
       * A DSN with a password ANYWHERE in the file. The module gate opens on a
       * bare DSN precisely so a config module that holds one — and imports no
       * driver — is linted; yet only constructor arguments were ever read, so
       * `export const DATABASE_URL = 'postgres://admin:…@db.prod/app'` was never
       * reported. Loopback hosts are skipped: that is a local container's
       * throwaway default, not a deployed secret.
       */
      'Program:exit'() {
        for (const node of dsnLiterals) {
          if (consumed.has(node)) continue;
          const parsed = parseDsnWithPassword(staticString(node) as string);
          if (parsed === null || LOOPBACK_HOSTS.has(parsed.hostname)) continue;
          context.report({ node, messageId: 'noHardcodedCredentials' });
        }
      },
    };
  },
};
