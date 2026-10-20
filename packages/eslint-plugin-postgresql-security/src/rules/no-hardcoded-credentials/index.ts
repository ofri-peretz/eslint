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
  createModuleEvidence,
  isTestFilePath,
} from '@interlace/eslint-devkit';
import { NoHardcodedCredentialsOptions } from '../../types';
import { PG_PROTOCOLS } from '../../constants';
import { usesPostgres } from '../../utils';
import { connectionConfigArguments } from '../../utils/connection-config';
import { envOf, follow, type Value } from '../../utils/cross-file';

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

/** A file that imports TypeORM, directly or through its NestJS module. */
const fileUsesTypeorm = createModuleEvidence({
  packages: ['typeorm', '@nestjs/typeorm'],
});

/** TypeORM's `type` values for the drivers that take a `postgres://` URL. */
const TYPEORM_PG_TYPES: ReadonlySet<string> = new Set([
  'postgres',
  'aurora-postgres',
  'cockroachdb',
]);

/** Keys of TypeORM's ormconfig contract, which a pg config never carries. */
const TYPEORM_CONFIG_KEYS: ReadonlySet<string> = new Set([
  'entities',
  'synchronize',
  'migrations',
  'subscribers',
  'migrationsRun',
]);

/**
 * Is this DSN a property of a TypeORM DataSource options object —
 * `new DataSource({ type: 'postgres', url })`, `TypeOrmModule.forRoot({…})`,
 * an ormconfig default export?
 *
 * `typeorm-security/no-hardcoded-credentials` owns TypeORM configs and
 * reports the same literal, so a project with both plugins got two CRITICAL
 * findings on one string. The object is recognised the way that rule
 * recognises it: TypeORM's `type` discriminator with a postgres-family driver,
 * in a file that imports TypeORM or in an object carrying TypeORM's own config
 * keys. A pg `Pool` config has no `type`, so nothing of this plugin's is lost.
 */
function inTypeormOptions(
  node: TSESTree.Literal | TSESTree.TemplateLiteral,
  usesTypeorm: boolean,
): boolean {
  if (node.parent.type !== AST_NODE_TYPES.Property) return false;
  // A string literal's Property is an object literal's: in a destructuring
  // pattern the value would be a pattern, not the literal.
  const options = node.parent.parent as TSESTree.ObjectExpression;
  // `Set#has(null)` is false, so a `type` that is absent or not static — and a
  // key that is not nameable — simply does not match.
  const driver = staticString(property(options, 'type')?.value) as string;
  return (
    TYPEORM_PG_TYPES.has(driver) &&
    (usesTypeorm ||
      options.properties.some(
        (prop) =>
          prop.type === AST_NODE_TYPES.Property &&
          TYPEORM_CONFIG_KEYS.has(propertyKeyName(prop) as string),
      ))
  );
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
    if (!usesPostgres(context)) return {};
    // A test pointing at a throwaway database is not a committed production
    // secret (BENCHMARK-CRITERIA B1) — the policy every credentials rule built
    // on the devkit factory already follows. The file-wide DSN sweep below made
    // this matter: `parse('postgres://u:secret@db.example.test/app')` in a spec
    // is a fixture; the corpus had dozens across teable, bookorbit, immich and
    // nhost.
    if (isTestFilePath(context.filename)) return {};

    /**
     * String literals already judged as the DSN of a config site — so the
     * file-wide DSN sweep below does not report the same literal twice.
     */
    const consumed = new Set<TSESTree.Node>();
    /** Every literal in the file that spells a DSN, judged at `Program:exit`. */
    const dsnLiterals: (TSESTree.Literal | TSESTree.TemplateLiteral)[] = [];

    const env = envOf(context);

    /** The string a value folds to, recording the literal it came from. */
    const stringValue = (start: Value): string | null => {
      const value = follow(start);
      const text = staticString(value.node);
      if (text !== null) consumed.add(value.node);
      return text;
    };

    /** Report in this file — at the node itself, or where a foreign config entered. */
    const report = (value: Value, fallback: TSESTree.Node): void => {
      context.report({
        node: value.env.module === null ? value.node : fallback,
        messageId: 'noHardcodedCredentials',
      });
    };

    const checkConfig = (argument: TSESTree.Node, scope: TSESLint.Scope.Scope): void => {
      const start: Value = { node: argument, scope, env };
      // `new Client('postgres://app:pw@host/db')` — the DSN passed bare.
      const bare = stringValue(start);
      if (bare !== null) {
        if (parseDsnWithPassword(bare) !== null) {
          context.report({ node: argument, messageId: 'noHardcodedCredentials' });
        }
        return;
      }

      const config = follow(start);
      if (config.node.type !== AST_NODE_TYPES.ObjectExpression) return;
      const at = (node: TSESTree.Node): Value => ({ node, scope: config.env.scopeOf(node), env: config.env });

      // `connectionString: 'postgres://app:pw@host/db'`
      const connectionString = property(config.node, 'connectionString');
      if (connectionString !== undefined) {
        const dsn = stringValue(at(connectionString.value));
        if (dsn !== null && parseDsnWithPassword(dsn) !== null) {
          report(at(connectionString.value), argument);
        }
      }

      // `password: 'p4ssw0rd'`
      //
      // An EMPTY password is deliberately not a finding: `password: ''` is how
      // a unix-socket or trust-authentication setup is written, and it
      // discloses nothing. The old rule reported any Literal at all, which
      // made `password: ''` and `password: null` CRITICAL findings.
      const password = property(config.node, 'password');
      if (password !== undefined) {
        const secret = stringValue(at(password.value));
        if (secret !== null && secret !== '') {
          report(at(password.value), argument);
        }
      }
    };

    const checkCall = (node: TSESTree.NewExpression | TSESTree.CallExpression): void => {
      const scope = context.sourceCode.getScope(node);
      for (const argument of connectionConfigArguments(node, scope)) checkConfig(argument, scope);
    };

    const collectDsn = (node: TSESTree.Literal | TSESTree.TemplateLiteral): void => {
      // `<input placeholder="postgresql://user:password@host:5432/db" />` is
      // UI text showing the format, never a connection a driver reads.
      const attribute =
        node.parent?.type === AST_NODE_TYPES.JSXExpressionContainer ? node.parent.parent : node.parent;
      if (attribute?.type === AST_NODE_TYPES.JSXAttribute) return;
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
      'Program:exit'(program: TSESTree.Program) {
        const usesTypeorm = fileUsesTypeorm(program);
        for (const node of dsnLiterals) {
          if (consumed.has(node) || inTypeormOptions(node, usesTypeorm)) continue;
          const parsed = parseDsnWithPassword(staticString(node) as string);
          if (parsed === null || LOOPBACK_HOSTS.has(parsed.hostname)) continue;
          context.report({ node, messageId: 'noHardcodedCredentials' });
        }
      },
    };
  },
};
