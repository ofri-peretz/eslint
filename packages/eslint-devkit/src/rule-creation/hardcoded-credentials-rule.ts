/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Shared hardcoded-database-credential detector (CWE-798).
 *
 * A password in source is a password in git history, in every fork, in every
 * CI log that echoes the file, and in the container image. Rotating it means
 * rewriting history, so in practice it never gets rotated.
 *
 * The detection is the same for every driver — a credential key with a literal
 * value inside a connection config, or a `scheme://user:pass@host` URL in a
 * connection position — so only the driver gate and the remediation copy differ.
 *
 * ## Two precision rules this factory enforces that a naive version does not
 *
 * `eslint-plugin-postgresql-security` shipped this detection first, and it
 * reports two shapes that are not findings:
 *
 *   - **Any `postgres://…` literal**, whether or not it carries credentials.
 *     `new Client('postgres://localhost:5432/app')` has no secret in it.
 *   - **Any `connectionString` literal**, on the same reasoning.
 *
 * Both fire on connection strings that are safe to commit, which is the
 * false-positive class that gets a security plugin switched off. Here a URL is
 * a finding only when it actually embeds a password, and a credential key is a
 * finding only when its value is a non-empty string literal.
 */

// AST_NODE_TYPES must come from the local shim, not upstream — it is an enum,
// so a *runtime value*, and `@typescript-eslint/utils` is an optional peer npm
// does not install. See sql-injection-rule.ts for the full note.
import { AST_NODE_TYPES } from '../ast-node-types';
import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import { formatLLMMessage, MessageIcons } from '../messaging';
import { driverBindings, propertyKeyName } from './unscoped-mutation-rule';
import { looksLikeConnectionConfig, inConnectionPosition } from './require-tls-rule';

/**
 * Two ids because the fixes differ in shape.
 *
 * A `password` property is replaced in place with `process.env.…`. A URL has
 * to be rebuilt, or — better — split so the secret never sits in the string.
 */
export type HardcodedCredentialsMessageIds = 'hardcodedPassword' | 'credentialsInUrl';

export interface HardcodedCredentialsRuleConfig {
  /**
   * The rule's own `meta.type` + `meta.docs`, spelled out by the caller.
   *
   * Deliberately not derived in here: `scripts/audit-rule-meta-completeness.ts`
   * statically parses each rule's source, so metadata hidden inside a factory
   * is invisible to it.
   */
  readonly meta: {
    readonly type: 'problem';
    readonly docs: {
      readonly description: string;
      readonly url: string;
      readonly cwe: string;
      readonly cweJustification?: string;
      readonly cvss: number;
      readonly confidence: 'high' | 'medium' | 'low';
    };
  };
  /** Driver modules — the plugin-scope gate. */
  readonly modules: readonly string[];
  /** Extra keys that mark an object as this driver's connection config. */
  readonly connectionKeys?: readonly string[];
  /** URL schemes this driver accepts, e.g. `['postgres', 'postgresql']`. */
  readonly urlSchemes: readonly string[];
  /** Remediation for a literal credential property. */
  readonly fix: string;
  /** Remediation for a credential embedded in a URL. */
  readonly urlFix: string;
  readonly documentationLink: string;
}

/**
 * Keys whose literal value is a secret.
 *
 * `user` / `username` are deliberately absent. A committed username is poor
 * practice but it is not a credential, and reporting it doubles the noise for
 * no change in exploitability.
 */
const CREDENTIAL_KEYS = ['password', 'pass', 'pwd', 'secret', 'passwd', 'auth'] as const;

/**
 * Connection-shape hints.
 *
 * Deliberately narrower than the `require-tls` list, which includes `password`,
 * `user` and `username`. Here those cannot count as evidence: the credential
 * *is* the finding, so letting it also prove "this is a connection config"
 * makes the rule circular. `{ password, confirm }` is a signup form and
 * `{ user, password }` is a login form — both would report, and reporting the
 * login form of every app that also uses a database is precisely the noise that
 * gets a security plugin switched off.
 *
 * A real connection names somewhere to connect to.
 */
const DEFAULT_CONNECTION_KEYS = [
  'host',
  'hostname',
  'port',
  'database',
  'connectionString',
  'socketPath',
  'uri',
  'url',
  'connection',
  'pool',
  'schema',
] as const;

/**
 * Does this URL embed a password?
 *
 * Requires the `user:pass@` form specifically. `postgres://localhost:5432/app`
 * and `postgres://app@host/db` carry no secret and are safe to commit — the
 * whole point of this helper is that they do not report.
 */
export function urlEmbedsCredentials(value: string, schemes: readonly string[]): boolean {
  const match = /^([a-z][a-z0-9+.-]*):\/\/([^/@\s]*:[^/@\s]+)@/i.exec(value);
  if (match === null) return false;
  return schemes.some((scheme) => scheme.toLowerCase() === match[1]!.toLowerCase());
}

/**
 * A non-empty string literal — the only value shape that is a real secret.
 *
 * `process.env.DB_PASSWORD` is the fix. A template literal with an
 * interpolation is a runtime value. An empty string is a driver-specific
 * "no password" sentinel, common in local trust-auth setups, and reporting it
 * teaches people the rule cries wolf.
 */
export function isLiteralSecret(node: TSESTree.Node): boolean {
  return (
    node.type === AST_NODE_TYPES.Literal &&
    typeof node.value === 'string' &&
    node.value.length > 0
  );
}

/** Build a CWE-798 rule for one driver's connection surface. */
export function createHardcodedCredentialsRule(
  config: HardcodedCredentialsRuleConfig,
): TSESLint.RuleModule<HardcodedCredentialsMessageIds, []> {
  const connectionKeys = [...DEFAULT_CONNECTION_KEYS, ...(config.connectionKeys ?? [])];

  return {
    meta: {
      type: config.meta.type,
      docs: { ...config.meta.docs },
      messages: {
        hardcodedPassword: formatLLMMessage({
          icon: MessageIcons.SECURITY,
          issueName: 'Hardcoded Credentials',
          description:
            'A database password is written as a literal. It is in git history, every fork, and the built image — rotating it means rewriting history, so it never gets rotated.',
          severity: 'CRITICAL',
          // Same source as meta.docs.cwe so the emitted CVSS can never drift
          // from the documented one (security-cvss-docs-consistency.lock).
          cwe: config.meta.docs.cwe,
          owasp: 'A07:2021',
          compliance: ['SOC2', 'PCI-DSS', 'ISO27001', 'NIST-CSF'],
          effort: 'low',
          fix: config.fix,
          documentationLink: config.documentationLink,
        }),
        credentialsInUrl: formatLLMMessage({
          icon: MessageIcons.SECURITY,
          issueName: 'Hardcoded Credentials',
          description:
            'A connection URL embeds a password in its userinfo section, so the secret is committed with the string.',
          severity: 'CRITICAL',
          cwe: config.meta.docs.cwe,
          owasp: 'A07:2021',
          compliance: ['SOC2', 'PCI-DSS', 'ISO27001', 'NIST-CSF'],
          effort: 'low',
          fix: config.urlFix,
          documentationLink: config.documentationLink,
        }),
      },
      schema: [],
    },
    defaultOptions: [],
    create(context) {
      let bindings = new Set<string>();
      /**
       * A nested config is reachable twice — the visitor reaches every
       * ObjectExpression, and a qualifying parent recurses into it — so
       * `{ connection: { password: 'x' } }` would otherwise report twice for
       * one mistake.
       */
      let reported = new WeakSet<TSESTree.Node>();

      const report = (
        node: TSESTree.Node,
        messageId: HardcodedCredentialsMessageIds,
      ): void => {
        if (reported.has(node)) return;
        reported.add(node);
        context.report({ node, messageId });
      };

      /** Scan one already-qualified object for credential keys. */
      const scanConfig = (obj: TSESTree.ObjectExpression): void => {
        for (const prop of obj.properties) {
          if (prop.type !== AST_NODE_TYPES.Property) continue;
          const name = propertyKeyName(prop);
          if (name === undefined) continue;

          if (CREDENTIAL_KEYS.includes(name.toLowerCase() as (typeof CREDENTIAL_KEYS)[number])) {
            if (isLiteralSecret(prop.value)) report(prop.value, 'hardcodedPassword');
            continue;
          }
          // A URL sitting on a connection key carries its own check, because
          // the credential is inside the string rather than beside it.
          if (
            prop.value.type === AST_NODE_TYPES.Literal &&
            typeof prop.value.value === 'string' &&
            urlEmbedsCredentials(prop.value.value, config.urlSchemes)
          ) {
            report(prop.value, 'credentialsInUrl');
            continue;
          }
          // Nested driver config: `{ connection: { … } }`, `{ replication: { … } }`.
          if (prop.value.type === AST_NODE_TYPES.ObjectExpression) {
            scanConfig(prop.value);
          }
        }
      };

      return {
        Program(program: TSESTree.Program) {
          bindings = driverBindings(program, config.modules);
          reported = new WeakSet<TSESTree.Node>();
        },

        ObjectExpression(node: TSESTree.ObjectExpression) {
          if (bindings.size === 0) return;
          if (!looksLikeConnectionConfig(node, connectionKeys)) return;
          scanConfig(node);
        },

        Literal(node: TSESTree.Literal) {
          if (bindings.size === 0) return;
          if (typeof node.value !== 'string') return;
          if (!urlEmbedsCredentials(node.value, config.urlSchemes)) return;
          // Same discipline as require-tls: a bare `const dsn = '…'` is
          // indistinguishable from a fixture or a doc example. The string has
          // to be somewhere a driver would read it.
          if (!inConnectionPosition(node, connectionKeys, bindings)) return;
          report(node, 'credentialsInUrl');
        },
      };
    },
  };
}
