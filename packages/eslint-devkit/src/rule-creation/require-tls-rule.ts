import { RuleCreator } from './rule-creator';
/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Shared cleartext-database-connection detector (CWE-319).
 *
 * Every driver spells "connect without TLS" differently and every one of them
 * spells it in a *literal property of a config object*, which is why this is
 * the cheapest high-severity rule in the ORM family:
 *
 *   - `ssl: false`                                    — pg, knex, mysql2
 *   - `ssl: { rejectUnauthorized: false }`            — pg, mysql2, TypeORM
 *   - `dialectOptions: { ssl: { rejectUnauthorized } }` — Sequelize
 *   - `?sslmode=disable` in the connection URL         — libpq-style drivers
 *
 * The two failures are not the same finding and do not share a remediation, so
 * they are separate message ids:
 *
 *   - `tlsDisabled` — the connection is plaintext. Anyone on the path reads
 *     every query, every row, and the credentials used to open the session.
 *   - `certificateValidationDisabled` — the connection *is* encrypted, but the
 *     server is not authenticated, so it encrypts happily to an attacker who
 *     answered instead of the database. This is the one people leave in after
 *     "fixing" a self-signed-certificate error in staging.
 *
 * ## Why this is not in `node-security`
 *
 * `rejectUnauthorized: false` is a generic TLS mistake and `node-security`
 * would love to own it. It cannot: the detection gate here is a *database
 * connection config*, identified by driver import plus connection-shaped
 * sibling keys. A rule that reported every `rejectUnauthorized: false` in any
 * object would fire on `https.request`, `fetch` agents and test fixtures, and
 * would double-report with this one. The taxonomy contract puts a rule where
 * its detection gate lives, and this gate is the driver.
 *
 * ## Why the object is matched by shape rather than by call position
 *
 * Requiring the literal to sit inside `new Pool(...)` reads well and misses
 * the most common real shape:
 *
 *   const config = { host, user, ssl: false };   // <- the finding
 *   export const pool = new Pool(config);        // <- often another file
 *
 * So a config object qualifies when it carries a TLS-disabling key AND at
 * least one connection-identifying sibling (`host`, `database`, `port`, ...).
 * Both halves are required: the sibling alone is not a vulnerability, and the
 * TLS key alone is what `node-security` would over-report.
 */

import { AST_NODE_TYPES } from '../ast-node-types';
import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import { formatLLMMessage, MessageIcons } from '../messaging';
import { propertyKeyName } from './unscoped-mutation-rule';
import { createModuleEvidence } from './module-evidence';
import { isTestFilePath } from './rule-creator';
import { createOriginClassifier } from './driver-origin';
import {
  type ConfigShape,
  configShapeEvidence,
  passedToForeign,
  possibleValues,
} from './connection-config';
import { envOf, valueAt } from './value-follow';

/** Message ids every rule built by this factory reports. */
export type RequireTlsMessageIds =
  'tlsDisabled' | 'certificateValidationDisabled';

export interface RequireTlsRuleConfig {
  /**
   * The rule's own `meta.type` + `meta.docs`, spelled out by the caller.
   * Same reasoning as `createUnscopedMutationRule`: the metadata auditor
   * statically parses each rule's source file, so metadata hidden inside a
   * factory is invisible to it.
   */
  readonly meta: {
    readonly type: 'problem';
    readonly docs: {
      readonly description: string;
      readonly url: string;
      readonly cwe: string;
      /**
       * Secondary-mapping note. `cwe` holds one identifier, but this rule
       * reports two weaknesses — `tlsDisabled` is CWE-319 and
       * `certificateValidationDisabled` is CWE-295 — so the second one is
       * recorded here, where `scripts/docs-cwe-coverage.ts` reads it.
       */
      readonly cweJustification?: string;
      readonly cvss: number;
      readonly confidence: 'high' | 'medium' | 'low';
    };
  };
  /**
   * Modules whose import means this file talks to the driver, e.g.
   * `['mysql2', 'mysql']`. A file importing none of them is skipped entirely,
   * which is what keeps this rule out of `node-security`'s territory.
   */
  readonly modules: readonly string[];
  /**
   * Extra keys, on top of the shared defaults, that identify an object as a
   * connection config for this driver — Sequelize's `dialectOptions`,
   * TypeORM's `synchronize`, and so on.
   */
  readonly connectionKeys?: readonly string[];
  /**
   * URL schemes this driver accepts in a connection string, e.g.
   * `['mysql']`. A string literal starting with one of them is scanned for
   * `sslmode=disable` / `ssl=false`. Omit for drivers that take no URL.
   */
  readonly urlSchemes?: readonly string[];
  /**
   * The driver's config-file contracts — a knexfile's `{ client: 'pg',
   * connection }` — that mark a file with no driver import as the driver's.
   */
  readonly configShapes?: readonly ConfigShape[];
  /** Remediation line in the emitted message. */
  readonly fix: string;
  /** Reference link in the emitted message. */
  readonly documentationLink: string;
}

/**
 * Keys that mark an object as a database connection config.
 *
 * Deliberately excludes `ssl` itself — the point of the check is that a
 * TLS-disabling key needs a *connection-shaped neighbour* before it counts.
 */
const DEFAULT_CONNECTION_KEYS = [
  'host',
  'hostname',
  'port',
  'user',
  'username',
  'password',
  'database',
  'connectionString',
  'socketPath',
  'uri',
  'url',
  'connection',
  'pool',
  'schema',
] as const;

/** Keys whose falsy value turns TLS off outright. */
const TLS_OFF_KEYS = [
  'ssl',
  'secure',
  'tls',
  'encrypt',
  'useSSL',
  'requireSSL',
] as const;

/** Keys whose falsy value keeps TLS but stops authenticating the server. */
const VERIFY_OFF_KEYS = [
  'rejectUnauthorized',
  'verifyServerCertificate',
  'checkServerIdentity',
  'trustServerCertificate',
] as const;

/**
 * Is this property value the literal `false` (or another falsy literal)?
 *
 * Only a *readable* literal counts. `ssl: enableSsl` is a variable this rule
 * cannot resolve, and guessing there is how a security rule earns a
 * false-positive reputation — it stays silent instead.
 *
 * `trustServerCertificate` inverts the sense: it is dangerous when TRUE. Callers
 * pass `expect` to say which polarity they mean.
 */
export function isLiteralBoolean(
  value: TSESTree.Node,
  expect: boolean,
): boolean {
  if (value.type !== AST_NODE_TYPES.Literal) return false;
  if (typeof value.value !== 'boolean') {
    // `ssl: 0` / `ssl: null` disable it just as well as `ssl: false`, but only
    // in the "off" direction — there is no falsy value that means "on".
    return expect === false && !value.value;
  }
  return value.value === expect;
}

/** Does this object literal carry at least one connection-identifying key? */
export function looksLikeConnectionConfig(
  obj: TSESTree.ObjectExpression,
  connectionKeys: readonly string[],
): boolean {
  return obj.properties.some((prop) => {
    const name = propertyKeyName(prop);
    return name !== undefined && connectionKeys.includes(name);
  });
}

/**
 * A connection string that explicitly turns TLS off.
 *
 * Anchored on the scheme so a random sentence containing `sslmode=disable`
 * (a doc comment, an error message) is not a finding, and matched with a word
 * boundary so `sslmode=disabled-for-now` — not a real libpq value — does not
 * silently pass either.
 *
 * The fragment is cut off before the scan, because a URL fragment ends the
 * query string. It has to be cut on both sides of the finding:
 *
 *   - `?sslmode=disable#frag` — the fragment ends a real parameter, so this is
 *     a finding. Terminating on `&` alone made it a silent false negative.
 *   - `#?sslmode=disable` — the text sits *inside* the fragment, which no
 *     driver parses as a connection option, so this is not a finding.
 */
export function urlDisablesTls(
  value: string,
  schemes: readonly string[],
): boolean {
  if (!schemes.some((scheme) => value.startsWith(`${scheme}://`))) return false;
  const query = value.split('#')[0]!;
  return /[?&](?:sslmode=disable|ssl=(?:false|0))(?:&|$)/i.test(query);
}

/** Is `inner` inside (or the same node as) `outer`? */
export function within(inner: TSESTree.Node, outer: TSESTree.Node): boolean {
  return outer.range[0] <= inner.range[0] && inner.range[1] <= outer.range[1];
}

/**
 * Is this string literal actually being used as a connection string?
 *
 * The object path earns its low false-positive rate by requiring a
 * connection-shaped neighbour before a TLS key counts. The URL path needs the
 * same discipline: a `mysql://…?sslmode=disable` string is only a finding where
 * a driver would read it. Two positions qualify —
 *
 *   - a connection-named property: `{ connection: 'postgres://…' }`,
 *     `{ url: '…' }`, `{ uri: '…' }`
 *   - an argument to a call on a driver binding:
 *     `mysql.createConnection('mysql://…')`, `new Sequelize('postgres://…')`
 *
 * Deliberately NOT qualifying: a bare `const dsn = 'mysql://…'`. It is
 * indistinguishable from a fixture, a doc example, or an error-message
 * template, and reporting it is the exact false positive that makes a security
 * plugin the one users switch off. The cost is a false negative when the DSN is
 * built in one statement and passed in another.
 */
export function inConnectionPosition(
  // Widened from `Literal` because no-hardcoded-credentials also asks about
  // static template literals. Kept to that exact union rather than `Node`:
  // `parent.arguments.includes(node)` needs a CallExpressionArgument, which
  // `Node` is not.
  node: TSESTree.Literal | TSESTree.TemplateLiteral,
  connectionKeys: readonly string[],
  isDriverCallee: (callee: TSESTree.Node) => boolean,
): boolean {
  const parent = node.parent;
  if (!parent) return false;

  if (parent.type === AST_NODE_TYPES.Property && parent.value === node) {
    const name = propertyKeyName(parent);
    return name !== undefined && connectionKeys.includes(name);
  }

  if (
    parent.type === AST_NODE_TYPES.CallExpression ||
    parent.type === AST_NODE_TYPES.NewExpression
  ) {
    if (!parent.arguments.includes(node)) return false;
    return isDriverCallee(parent.callee);
  }

  return false;
}

/**
 * Build a CWE-319 rule for the given driver.
 *
 * Reports a config object only when a TLS key is explicitly disabled with a
 * readable literal AND the object reads as a connection config. An unreadable
 * value is a deliberate false negative.
 */
export function createRequireTlsRule(
  config: RequireTlsRuleConfig,
): TSESLint.RuleModule<RequireTlsMessageIds, []> {
  const connectionKeys = [
    ...DEFAULT_CONNECTION_KEYS,
    ...(config.connectionKeys ?? []),
  ];
  const urlSchemes = config.urlSchemes ?? [];
  const usesModule = createModuleEvidence({
    packages: config.modules,
    extraEvidence: configShapeEvidence(config.configShapes ?? []),
  });
  const originOf = createOriginClassifier(config.modules);

  return RuleCreator.withoutDocs<[], RequireTlsMessageIds>({
    meta: {
      // Shared detection, shared runtimes: oxlint only if every plugin's rule
      // from this factory passes its own suite there.
      interop: { runtimes: ['eslint', 'oxlint'] },
      type: config.meta.type,
      docs: { ...config.meta.docs },
      messages: {
        tlsDisabled: formatLLMMessage({
          icon: MessageIcons.SECURITY,
          issueName: 'Cleartext Database Connection',
          description:
            'TLS is explicitly disabled on this database connection. Queries, result rows and the credentials that open the session all cross the network in cleartext.',
          severity: 'HIGH',
          cwe: config.meta.docs.cwe,
          owasp: 'A02:2021',
          compliance: ['SOC2', 'PCI-DSS', 'HIPAA', 'NIST-CSF'],
          effort: 'low',
          fix: config.fix,
          documentationLink: config.documentationLink,
        }),
        certificateValidationDisabled: formatLLMMessage({
          icon: MessageIcons.SECURITY,
          issueName: 'Unverified Database TLS Peer',
          description:
            'Certificate validation is disabled on this database connection. The traffic is encrypted but the server is never authenticated, so it encrypts just as willingly to whoever answered in its place.',
          severity: 'HIGH',
          cwe: config.meta.docs.cwe,
          owasp: 'A02:2021',
          compliance: ['SOC2', 'PCI-DSS', 'HIPAA', 'NIST-CSF'],
          effort: 'medium',
          fix: 'Supply the server CA instead of switching verification off — `ssl: { ca: fs.readFileSync(caPath) }`. If the certificate is self-signed, add that CA to the trust store rather than trusting everything.',
          documentationLink: config.documentationLink,
        }),
      },
      schema: [],
    },
    defaultOptions: [],
    createOnce(context) {
      let env: ReturnType<typeof envOf>;
      let ownsFile: boolean;
      let reported: WeakSet<TSESTree.Node>;

      function isDriverCallee(callee: TSESTree.Node): boolean {
        return originOf(valueAt(callee, env)) === 'ours';
      }

      const report = (
        node: TSESTree.Node,
        messageId: RequireTlsMessageIds,
      ): void => {
        if (reported.has(node)) return;
        reported.add(node);
        context.report({ node, messageId });
      };

      /**
       * Judge one TLS-relevant property, through every value it can take.
       * A value written in another module is reported at this property.
       */
      const judgeProperty = (
        prop: TSESTree.Property,
        name: string,
        depth: number,
      ): void => {
        const tlsKey = TLS_OFF_KEYS.includes(
          name as (typeof TLS_OFF_KEYS)[number],
        );
        const verifyKey = VERIFY_OFF_KEYS.includes(
          name as (typeof VERIFY_OFF_KEYS)[number],
        );
        // `trustServerCertificate: true` is the inverted spelling.
        const inverted = name === 'trustServerCertificate';
        for (const value of possibleValues(valueAt(prop.value, env))) {
          // Written inline in this property, or followed to a binding?
          const inline = value.env === env && within(value.node, prop.value);
          if (tlsKey && isLiteralBoolean(value.node, false)) {
            report(prop, 'tlsDisabled');
            return;
          }
          if (verifyKey && isLiteralBoolean(value.node, inverted)) {
            report(prop, 'certificateValidationDisabled');
            return;
          }
          // A nested TLS / connection object: `ssl: { rejectUnauthorized }`,
          // `ssl: sslOptions`, `ssl: isProd ? { … } : false`.
          if (
            value.node.type === AST_NODE_TYPES.ObjectExpression &&
            (tlsKey || connectionKeys.includes(name))
          ) {
            // A TLS object written elsewhere (`ssl: sslOptions`) is reported
            // here, at the connection that uses it: on its own it is just an
            // options object, and another plugin's to judge.
            if (inline) scanTlsKeys(value.node, depth + 1);
            else if (disablesTls(value.node))
              report(prop, 'certificateValidationDisabled');
          }
        }
      };

      /** Does a (foreign-module) TLS object turn verification off? */
      const disablesTls = (obj: TSESTree.ObjectExpression): boolean =>
        obj.properties.some(
          (prop) =>
            prop.type === AST_NODE_TYPES.Property &&
            VERIFY_OFF_KEYS.includes(
              propertyKeyName(prop) as (typeof VERIFY_OFF_KEYS)[number],
            ) &&
            isLiteralBoolean(
              prop.value,
              propertyKeyName(prop) === 'trustServerCertificate',
            ),
        );

      /**
       * Walk an object that is either a connection config or a TLS
       * sub-object, reporting every key that turns TLS or verification off.
       */
      const scanTlsKeys = (obj: TSESTree.ObjectExpression, depth = 0): void => {
        if (depth > 4) return;
        for (const prop of obj.properties) {
          if (prop.type !== AST_NODE_TYPES.Property) continue;
          const name = propertyKeyName(prop);
          if (name === undefined) continue;
          judgeProperty(prop, name, depth);
        }
      };

      return {
        before() {
          // BENCHMARK-CRITERIA §B1: a test pointing at a local database with
          // TLS off is not the shipped connection.
          if (isTestFilePath(context.filename)) return false;
          env = envOf(context);
          ownsFile = false;
          /**
           * Properties already reported. The TLS sub-object is reached twice —
           * once while its parent config is scanned, and again when the
           * ObjectExpression visitor lands on the sub-object itself — so without
           * this a single `rejectUnauthorized: false` would report twice.
           */
          reported = new WeakSet<TSESTree.Node>();
          return true;
        },
        Program(program: TSESTree.Program) {
          ownsFile = usesModule(program);
        },

        ObjectExpression(node: TSESTree.ObjectExpression) {
          if (!ownsFile) return;
          if (!looksLikeConnectionConfig(node, connectionKeys)) return;
          // `new https.Agent({ host, rejectUnauthorized: false })` is an HTTPS
          // client, not this driver's connection.
          if (passedToForeign(node, originOf, env)) return;
          scanTlsKeys(node);
        },

        Literal(node: TSESTree.Literal) {
          if (!ownsFile) return;
          if (typeof node.value !== 'string') return;
          if (!urlDisablesTls(node.value, urlSchemes)) return;
          // Same discipline as the object path: a connection URL only counts
          // where a driver would actually read it. `inConnectionPosition` is
          // shared with no-hardcoded-credentials, so the two rules agree on
          // what "a connection string" means.
          if (!inConnectionPosition(node, connectionKeys, isDriverCallee))
            return;
          context.report({ node, messageId: 'tlsDisabled' });
        },
      };
    },
  });
}
