/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Shared raw-SQL-injection detector (CWE-89).
 *
 * The AST work — string concatenation or an interpolated template literal
 * reaching a raw-SQL sink — is identical for every driver. What differs is
 * the sink list and the remediation copy (`$1, $2` for Postgres, `?` for
 * mysql2, `replacements` for Sequelize), so those are the parameters.
 *
 * This exists because the detection first shipped inside `eslint-plugin-pg`,
 * where it works fine on `sequelize.query()` — but nobody on Sequelize,
 * SQLite or MySQL installs the Postgres plugin, so textbook injections in
 * those stacks went unreported. Each driver plugin now instantiates this
 * factory, which keeps one implementation and one finding per line.
 *
 * The rule must stay in a driver-scoped plugin: it keys on driver method
 * names, not language primitives, so it does not belong in the code-agnostic
 * plugins (`secure-coding`, `node-security`, `browser-security`).
 */

import { AST_NODE_TYPES, TSESLint, TSESTree } from '@typescript-eslint/utils';
import { formatLLMMessage, MessageIcons } from '../messaging';

/** Message ids every rule built by this factory reports. */
export type SqlInjectionMessageIds = 'noUnsafeQuery' | 'unsafeTemplateLiteral';

export interface SqlInjectionRuleConfig {
  /** Method names treated as raw-SQL sinks, e.g. `['query']` or `['query', 'raw', 'execute']`. */
  readonly methods: readonly string[];
  /**
   * Require SQL keywords in the *static* part of the string before reporting.
   * Precision guard for broad sink lists (`.raw()`, `.execute()` are not
   * SQL-only names). `false` keeps the historical pg behaviour: any
   * interpolation into a sink is a finding.
   */
  readonly requireSqlKeywords: boolean;
  /** `meta.docs.description`. */
  readonly description: string;
  /** `meta.docs.url`. */
  readonly url: string;
  /** Remediation line in the emitted message. */
  readonly fix: string;
  /** Reference link in the emitted message. */
  readonly documentationLink: string;
}

const SQL_KEYWORDS =
  /\b(?:select|insert|update|delete|drop|alter|truncate|union|from|where|values|set)\b/i;

type UnsafeKind = 'concat' | 'template';

/** Literal text of a string expression, ignoring interpolated/concatenated values. */
function staticText(node: TSESTree.Node): string {
  if (node.type === AST_NODE_TYPES.TemplateLiteral) {
    return node.quasis.map((q) => q.value.raw).join(' ');
  }
  if (node.type === AST_NODE_TYPES.BinaryExpression) {
    return `${staticText(node.left)} ${staticText(node.right)}`;
  }
  if (node.type === AST_NODE_TYPES.Literal && typeof node.value === 'string') {
    return node.value;
  }
  return '';
}

/** Classify an expression as unsafe SQL construction, or `false` if it is not. */
function classify(node: TSESTree.Node, requireSqlKeywords: boolean): UnsafeKind | false {
  let kind: UnsafeKind | false = false;
  // Concatenation: "SELECT ... " + value
  if (node.type === AST_NODE_TYPES.BinaryExpression && node.operator === '+') {
    kind = 'concat';
  }
  // Interpolation: `SELECT ... ${value}`
  if (node.type === AST_NODE_TYPES.TemplateLiteral && node.expressions.length > 0) {
    kind = 'template';
  }
  if (kind === false) return false;
  if (requireSqlKeywords && !SQL_KEYWORDS.test(staticText(node))) return false;
  return kind;
}

/**
 * Build a CWE-89 rule for the given sinks and remediation copy.
 *
 * Detects three shapes: direct concatenation into a sink, direct
 * interpolation into a sink, and a variable tainted by either (including via
 * `+=`) that is later passed to a sink.
 */
export function createSqlInjectionRule(
  config: SqlInjectionRuleConfig,
): TSESLint.RuleModule<SqlInjectionMessageIds, []> {
  const sinks = new Set(config.methods);

  return {
    meta: {
      type: 'problem',
      docs: {
        description: config.description,
        url: config.url,
        // CWE / CVSS surface in @interlace/eslint-formatter (devkit augments
        // RuleMetaDataDocs) and are locked against the emitted message by
        // security-cvss-docs-consistency.lock.test.ts.
        cwe: 'CWE-89',
        cvss: 9.8,
        confidence: 'high',
      },
      messages: {
        noUnsafeQuery: formatLLMMessage({
          icon: MessageIcons.SECURITY,
          issueName: 'SQL Injection Risk',
          description: 'Unsafe SQL query detected. Variable interpolation found.',
          severity: 'CRITICAL',
          cwe: 'CWE-89',
          owasp: 'A03:2021',
          compliance: ['SOC2', 'PCI-DSS', 'NIST-CSF'],
          effort: 'high',
          fix: config.fix,
          documentationLink: config.documentationLink,
        }),
        unsafeTemplateLiteral: formatLLMMessage({
          icon: MessageIcons.SECURITY,
          issueName: 'SQL Injection Risk',
          description: 'Unsafe SQL query construction detected (template literal).',
          severity: 'CRITICAL',
          fix: config.fix,
          documentationLink: config.documentationLink,
        }),
      },
      schema: [],
    },
    defaultOptions: [],
    create(context) {
      const tainted = new Map<string, UnsafeKind>();
      // Variables seeded with SQL-looking text. A dynamic-query builder puts
      // the keywords in the seed (`let sql = 'SELECT * FROM t WHERE 1=1'`)
      // and the injection in the appended fragment (`sql += ` AND n =
      // ${n}``), which carries no keyword of its own.
      const sqlish = new Set<string>();

      const report = (node: TSESTree.Node, kind: UnsafeKind): void => {
        context.report({
          node,
          messageId: kind === 'template' ? 'unsafeTemplateLiteral' : 'noUnsafeQuery',
        });
      };

      return {
        // const query = "SELECT ..." + userId;
        // const query = `SELECT ...${email}`;
        VariableDeclarator(node: TSESTree.VariableDeclarator) {
          if (node.id.type === AST_NODE_TYPES.Identifier && node.init) {
            const kind = classify(node.init, config.requireSqlKeywords);
            if (kind) tainted.set(node.id.name, kind);
            if (SQL_KEYWORDS.test(staticText(node.init))) sqlish.add(node.id.name);
          }
        },

        // query += ` AND name = '${name}'`;
        AssignmentExpression(node: TSESTree.AssignmentExpression) {
          if (node.operator === '+=' && node.left.type === AST_NODE_TYPES.Identifier) {
            // Skip the keyword gate when the target was already seeded with
            // SQL — the fragment alone rarely contains a keyword.
            const gate = config.requireSqlKeywords && !sqlish.has(node.left.name);
            const kind = classify(node.right, gate);
            if (kind) tainted.set(node.left.name, kind);
          }
        },

        CallExpression(node: TSESTree.CallExpression) {
          if (
            node.callee.type !== AST_NODE_TYPES.MemberExpression ||
            node.callee.property.type !== AST_NODE_TYPES.Identifier ||
            !sinks.has(node.callee.property.name)
          ) {
            return;
          }

          const queryArg = node.arguments[0];
          if (!queryArg) return;

          const direct = classify(queryArg, config.requireSqlKeywords);
          if (direct) {
            report(queryArg, direct);
            return;
          }

          if (queryArg.type === AST_NODE_TYPES.Identifier) {
            const taint = tainted.get(queryArg.name);
            if (taint) report(queryArg, taint);
          }
        },
      };
    },
  };
}
