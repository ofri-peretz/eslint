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

// AST_NODE_TYPES must come from the local shim, not upstream. It is an enum —
// a *runtime value* — and `@typescript-eslint/utils` is an optional peer that npm
// does not install, so importing it here made every published plugin throw
// "Cannot find module '@typescript-eslint/utils'" on a clean install. Types are
// erased at compile time and stay safe to import from upstream.
import { AST_NODE_TYPES } from '../ast-node-types';
import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import { formatLLMMessage, MessageIcons } from '../messaging';

/** Message ids every rule built by this factory reports. */
export type SqlInjectionMessageIds = 'noUnsafeQuery' | 'unsafeTemplateLiteral';

export interface SqlInjectionRuleConfig {
  /**
   * The rule's own `meta.type` + `meta.docs`, spelled out by the caller.
   *
   * Deliberately NOT derived inside this factory: `scripts/audit-rule-meta-completeness.ts`
   * reads rule metadata by *statically parsing the rule's source file*, so
   * metadata hidden in here is invisible to it — a factory-built rule scores
   * 0% and fails the strict gate. Keeping it at the call site also puts each
   * driver's CWE/CVSS where a reader expects to find it.
   */
  readonly meta: {
    readonly type: 'problem';
    readonly docs: {
      readonly description: string;
      readonly url: string;
      readonly cwe: string;
      readonly cvss: number;
      readonly confidence: 'high' | 'medium' | 'low';
    };
  };
  /** Method names treated as raw-SQL sinks, e.g. `['query']` or `['query', 'raw', 'execute']`. */
  readonly methods: readonly string[];
  /**
   * Require SQL keywords in the *static* part of the string before reporting.
   * Precision guard for broad sink lists (`.raw()`, `.execute()` are not
   * SQL-only names). `false` keeps the historical pg behaviour: any
   * interpolation into a sink is a finding.
   */
  readonly requireSqlKeywords: boolean;
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
  // `+` is also numeric addition. Without at least one string literal in the
  // expression there is no evidence this builds SQL at all, and an ungated
  // instance would report `db.query(1 + offset)`. Templates are exempt: a
  // template literal is always a string.
  if (kind === 'concat' && staticText(node).trim() === '') return false;
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
      type: config.meta.type,
      // CWE / CVSS surface in @interlace/eslint-formatter (devkit augments
      // RuleMetaDataDocs) and are locked against the emitted message by
      // security-cvss-docs-consistency.lock.test.ts.
      docs: { ...config.meta.docs },
      messages: {
        noUnsafeQuery: formatLLMMessage({
          icon: MessageIcons.SECURITY,
          issueName: 'SQL Injection Risk',
          description: 'Unsafe SQL query detected. Variable interpolation found.',
          severity: 'CRITICAL',
          // Same source as meta.docs.cwe, so the emitted CVSS can never drift
          // from the documented one (security-cvss-docs-consistency.lock).
          cwe: config.meta.docs.cwe,
          owasp: 'A03:2021',
          compliance: ['SOC2', 'PCI-DSS', 'NIST-CSF'],
          effort: 'high',
          fix: config.fix,
          documentationLink: config.documentationLink,
        }),
        // Same finding as noUnsafeQuery, reached through an interpolated
        // template instead of concatenation, so it carries the same standards
        // metadata from the same source. It previously carried none: the
        // template path — the idiomatic way to write this bug — emitted no
        // CWE-89, no OWASP and no compliance tags, so anything grouping
        // findings by CWE (SARIF, dashboards, our own corpus scoring) counted
        // only the concat half of the rule.
        unsafeTemplateLiteral: formatLLMMessage({
          icon: MessageIcons.SECURITY,
          issueName: 'SQL Injection Risk',
          description: 'Unsafe SQL query construction detected (template literal).',
          severity: 'CRITICAL',
          cwe: config.meta.docs.cwe,
          owasp: 'A03:2021',
          compliance: ['SOC2', 'PCI-DSS', 'NIST-CSF'],
          effort: 'high',
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
