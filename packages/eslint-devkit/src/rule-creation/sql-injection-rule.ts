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
import { propertyName } from '../ast/spellings';
import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import { formatLLMMessage, MessageIcons } from '../messaging';
import { createModuleEvidence } from './module-evidence';

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
   * Modules whose API these sinks belong to. **The rule stays silent in a file
   * that loads none of them** — by `import`, `require`, `await import()` or
   * `import x = require()`.
   *
   * Method names are not evidence of an SDK. `['raw']` is knex *and* drizzle;
   * `['query']` is typeorm *and* pg *and* mysql2; `['get','all','run']` is
   * better-sqlite3 *and* an Express router *and* `Promise.all`. Measured over
   * 73,364 files, that produced 1,142 lines where two or more plugins reported
   * the *same* CWE — 616 for postgres×typeorm, 503 for mysql×typeorm, 347 for
   * drizzle×knex, all from this one factory.
   *
   * Requiring the import makes the collision impossible by construction rather
   * than deduplicated after the fact, and it is *local* evidence: no project
   * scan, nothing to go stale, and a file that does not import the driver is
   * one this rule genuinely has nothing to say about.
   *
   * Matched against the specifier's package root, so `'mysql2/promise'`
   * matches `'mysql2'` and `'@prisma/client/edge'` matches `'@prisma/client'`.
   */
  readonly modules: readonly string[];
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

const FUNCTION_TYPES = new Set<string>([
  AST_NODE_TYPES.FunctionDeclaration,
  AST_NODE_TYPES.FunctionExpression,
  AST_NODE_TYPES.ArrowFunctionExpression,
]);

/** Nearest enclosing function of `node`, or `undefined` at module top level. */
function enclosingFunction(
  node: TSESTree.Node,
): TSESTree.FunctionLike | undefined {
  for (let n = node.parent; n; n = n.parent) {
    if (FUNCTION_TYPES.has(n.type)) return n as TSESTree.FunctionLike;
  }
  return undefined;
}

/**
 * The name a function is reached by at its call sites, or `undefined` when it
 * has none we can match on (IIFE, default export, callback argument).
 *
 * Covers the four ways a query helper is normally written: `function q()`,
 * `const q = (...) => …`, a class method, and an object-literal method.
 */
function callableName(fn: TSESTree.FunctionLike): string | undefined {
  if (fn.type === AST_NODE_TYPES.FunctionDeclaration && fn.id)
    return fn.id.name;
  // Every function reachable here is nested inside a Program, so `parent` is
  // always set — no guard, which would be an untestable branch.
  const parent = fn.parent;
  if (
    parent.type === AST_NODE_TYPES.VariableDeclarator &&
    parent.id.type === AST_NODE_TYPES.Identifier
  ) {
    return parent.id.name;
  }
  if (
    (parent.type === AST_NODE_TYPES.MethodDefinition ||
      parent.type === AST_NODE_TYPES.PropertyDefinition ||
      parent.type === AST_NODE_TYPES.Property) &&
    parent.key.type === AST_NODE_TYPES.Identifier
  ) {
    return parent.key.name;
  }
  return undefined;
}

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
function classify(
  node: TSESTree.Node,
  requireSqlKeywords: boolean,
): UnsafeKind | false {
  let kind: UnsafeKind | false = false;
  // Concatenation: "SELECT ... " + value
  if (node.type === AST_NODE_TYPES.BinaryExpression && node.operator === '+') {
    kind = 'concat';
  }
  // Interpolation: `SELECT ... ${value}`
  if (
    node.type === AST_NODE_TYPES.TemplateLiteral &&
    node.expressions.length > 0
  ) {
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
 * Detects four shapes: direct concatenation into a sink, direct
 * interpolation into a sink, a variable tainted by either (including via
 * `+=`) that is later passed to a sink, and either of those passed to a
 * same-file helper that forwards the argument into a sink.
 */
export function createSqlInjectionRule(
  config: SqlInjectionRuleConfig,
): TSESLint.RuleModule<SqlInjectionMessageIds, []> {
  const sinks = new Set(config.methods);

  /**
   * Whether the file loads one of this rule's own modules, in any of the forms
   * a driver is actually loaded in.
   *
   * This was once a `.some()` over `program.body` matching `ImportDeclaration`
   * alone, which recognised exactly one of them. `const mysql =
   * require('mysql2')` — the dominant form in Node server code — opened the
   * gate for nobody, so every CommonJS file in every one of the seven driver
   * plugins was silently unchecked. The shared probe handles `require`,
   * `await import()`, `import x = require()` and Deno specifiers, anywhere in
   * the file rather than only as a direct child of Program, and ignores a
   * `require` that a local binding has shadowed.
   */
  const usesModule = createModuleEvidence({ packages: config.modules });

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
          description:
            'Unsafe SQL query detected. Variable interpolation found.',
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
          description:
            'Unsafe SQL query construction detected (template literal).',
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
      // Same-file query helpers: name -> index of the parameter this file was
      // observed handing to a real sink. `pool.query(sql, params)` inside
      // `const q = (sql, params) => …` makes `q` a sink at argument 0.
      const wrappers = new Map<string, number>();
      // Every named callable defined in this file, and the subset of those
      // proven to forward a parameter into a sink. A name is only usable as a
      // wrapper when *every* definition of it is one: matching is by bare
      // name, so a file holding both `PgRepo.run` (wraps `pool.query`) and
      // `CacheRepo.run` (does not) cannot tell the two apart, and reporting
      // `new CacheRepo().run(...)` would be exactly the false positive this
      // rule is being fixed for. Ambiguous name -> no wrapper finding.
      const definitions = new Map<string, number>();
      // Keyed by function node so a body calling the sink twice counts once;
      // the value is the name, already resolved at detection.
      const wrapperFns = new Map<TSESTree.FunctionLike, string>();
      // Calls that would be findings *if* their callee turns out to be a
      // wrapper. Deferred to Program:exit because a helper may be declared
      // below its call site (hoisted `function`, or a class used top-down).
      const pending: {
        name: string;
        index: number;
        arg: TSESTree.Node;
        kind: UnsafeKind | undefined;
      }[] = [];

      /**
       * Whether this file imports the SDK these sinks belong to.
       *
       * Set once from the Program node — which ESLint visits before any of its
       * children — so every visitor below can read it. Gating inside `report`
       * rather than at each call site covers the deferred wrapper findings
       * flushed at `Program:exit` too.
       */
      let ownsFile = false;

      const report = (node: TSESTree.Node, kind: UnsafeKind): void => {
        if (!ownsFile) return;
        context.report({
          node,
          messageId:
            kind === 'template' ? 'unsafeTemplateLiteral' : 'noUnsafeQuery',
        });
      };

      return {
        Program(program: TSESTree.Program) {
          ownsFile = usesModule(program);
        },

        // Count every named callable so Program:exit can tell a name with one
        // meaning from a name shared by a wrapper and a non-wrapper.
        'FunctionDeclaration, FunctionExpression, ArrowFunctionExpression'(
          node: TSESTree.FunctionLike,
        ) {
          const name = callableName(node);
          if (name !== undefined)
            definitions.set(name, (definitions.get(name) ?? 0) + 1);
        },

        // const query = "SELECT ..." + userId;
        // const query = `SELECT ...${email}`;
        VariableDeclarator(node: TSESTree.VariableDeclarator) {
          if (node.id.type === AST_NODE_TYPES.Identifier && node.init) {
            const kind = classify(node.init, config.requireSqlKeywords);
            if (kind) tainted.set(node.id.name, kind);
            if (SQL_KEYWORDS.test(staticText(node.init)))
              sqlish.add(node.id.name);
          }
        },

        // query += ` AND name = '${name}'`;
        AssignmentExpression(node: TSESTree.AssignmentExpression) {
          if (
            node.operator === '+=' &&
            node.left.type === AST_NODE_TYPES.Identifier
          ) {
            // Skip the keyword gate when the target was already seeded with
            // SQL — the fragment alone rarely contains a keyword.
            const gate =
              config.requireSqlKeywords && !sqlish.has(node.left.name);
            const kind = classify(node.right, gate);
            if (kind) tainted.set(node.left.name, kind);
            // A variable can acquire its SQL-ness here rather than at its
            // declaration (`let sql = ''; sql += 'SELECT …${id}'`). Without
            // this, the wrapper path's `sqlish` guard dropped that variable
            // while the direct-sink path still reported it — the same code
            // flagged at `pool.query(sql)` and silent at `q(sql)`.
            if (SQL_KEYWORDS.test(staticText(node.right)))
              sqlish.add(node.left.name);
          }
        },

        CallExpression(node: TSESTree.CallExpression) {
          // The name this call is written with: `db.query(…)` and
          // `db['query'](…)` both -> `query`, `q(…)` -> `q`. A method chosen at
          // RUNTIME (`db[verb](…)`) names nothing and stays out of reach, as
          // does an immediately invoked expression.
          const isMember = node.callee.type === AST_NODE_TYPES.MemberExpression;
          const calleeName = isMember
            ? (propertyName(node.callee as TSESTree.MemberExpression) ??
              undefined)
            : node.callee.type === AST_NODE_TYPES.Identifier
              ? node.callee.name
              : undefined;
          if (calleeName === undefined) return;

          // A driver sink is always a *method* call. A bare `query(…)` is some
          // local function that happens to share the name, and stays a mere
          // wrapper candidate — matching it as a sink would report every
          // project with its own free-standing `query()` helper.
          if (!isMember || !sinks.has(calleeName)) {
            // Not a driver method. Bank it in case the callee turns out to be
            // a local wrapper — the keyword gate is forced on here regardless
            // of `requireSqlKeywords`, because "this identifier reaches a
            // sink" is weaker evidence than a literal driver call, and an
            // ungated instance would otherwise start reporting
            // `log(`hello ${name}`)` the moment the file happened to define a
            // `log` helper over `pool.query`.
            for (const [index, arg] of node.arguments.entries()) {
              if (arg.type === AST_NODE_TYPES.SpreadElement) continue;
              const kind = classify(arg, true);
              if (kind) pending.push({ name: calleeName, index, arg, kind });
              else if (arg.type === AST_NODE_TYPES.Identifier)
                pending.push({ name: calleeName, index, arg, kind: undefined });
            }
            return;
          }

          const queryArg = node.arguments[0];
          if (!queryArg) return;

          // A sink fed straight from a parameter is the wrapper shape:
          // `(sql, params) => pool.query(sql, params)`. Record which argument
          // position callers must treat as the query.
          if (queryArg.type === AST_NODE_TYPES.Identifier) {
            const fn = enclosingFunction(node);
            const index =
              fn?.params.findIndex(
                (p) =>
                  p.type === AST_NODE_TYPES.Identifier &&
                  p.name === queryArg.name,
              ) ?? -1;
            const name = fn && index >= 0 ? callableName(fn) : undefined;
            if (name !== undefined && fn) {
              wrappers.set(name, index);
              wrapperFns.set(fn, name);
            }
          }

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

        'Program:exit'() {
          // How many definitions of each name were proven to be wrappers.
          const proven = new Map<string, number>();
          for (const name of wrapperFns.values())
            proven.set(name, (proven.get(name) ?? 0) + 1);

          for (const { name, index, arg, kind } of pending) {
            if (wrappers.get(name) !== index) continue;
            // Every definition of this name must be a wrapper, or we cannot
            // tell which one a call site meant.
            if (definitions.get(name) !== proven.get(name)) continue;
            if (kind) {
              report(arg, kind);
              continue;
            }
            // Tainted variable handed to the wrapper. `sqlish` keeps the
            // forced keyword gate honest for the identifier path too.
            const varName = (arg as TSESTree.Identifier).name;
            const taint = tainted.get(varName);
            if (taint && sqlish.has(varName)) report(arg, taint);
          }
        },
      };
    },
  };
}
