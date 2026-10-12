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
 *
 * ## What is reported (2026-10 FP/FN review)
 *
 * An interpolated or concatenated value is reported only when the file cannot
 * prove it safe — see `sql-safety.ts`. `${TABLE}` bound to a literal, a `?`
 * placeholder list, a ternary between two keywords and the driver's own
 * escapers are no longer findings; a parameter, request data or an unknown
 * call still is.
 *
 * A receiver is classified by where it is written (`driver-origin.ts`), never
 * by its name: a receiver provably from ANOTHER library (`/re/.exec`,
 * `child_process.exec`, a GraphQL client's `query`) is never a sink, and the
 * SQL-keyword gate is waived for a receiver proven to be the driver itself.
 */

// AST_NODE_TYPES must come from the local shim, not upstream. It is an enum —
// a *runtime value* — and `@typescript-eslint/utils` is an optional peer that npm
// does not install, so importing it here made every published plugin throw
// "Cannot find module '@typescript-eslint/utils'" on a clean install. Types are
// erased at compile time and stay safe to import from upstream.
import { AST_NODE_TYPES } from '../ast-node-types';
import { objectKeyName, propertyName } from '../ast/spellings';
import { unwrapTypeSyntax } from '../ast/type-syntax';
import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import { formatLLMMessage, MessageIcons } from '../messaging';
import { createModuleEvidence } from './module-evidence';
import { isTestFilePath } from './rule-creator';
import { createOriginClassifier, isFunctionNode } from './driver-origin';
import { isRequestPayload } from './request-source';
import { createSqlSafety, sqlStaticText } from './sql-safety';
import {
  type SqlHole,
  isQuoted,
  isRequestDerived,
  isValuePosition,
  sqlHoles,
} from './sql-position';
import {
  type Env,
  envOf,
  follow,
  importSpecifierOf,
  lookup,
  returnedValues,
  valueAt,
} from './value-follow';

/** Message ids every rule built by this factory reports. */
export type SqlInjectionMessageIds = 'noUnsafeQuery' | 'unsafeTemplateLiteral';

/** A raw-SQL fragment sink: a method whose argument at `arg` is SQL text. */
export interface SqlFragmentSink {
  /** Method name, e.g. `whereRaw`. */
  readonly name: string;
  /** Argument index holding the SQL text. Default `0`. */
  readonly arg?: number;
  /**
   * Only on a receiver PROVEN to come from the plugin's modules. For a name
   * other libraries also use (`raw`), so a same-named method of an unrelated
   * object is never a sink.
   */
  readonly requireDriverReceiver?: boolean;
}

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
  /**
   * Method names that execute a whole SQL STATEMENT passed as argument 0,
   * e.g. `['query']` or `['prepare', 'exec']`. Subject to the keyword gate
   * when `requireSqlKeywords` is set and the receiver is not proven to be the
   * driver.
   */
  readonly methods: readonly string[];
  /**
   * Methods that take a raw SQL FRAGMENT — `whereRaw`, `orderByRaw`,
   * `Sequelize.literal`, `sql.raw` — never keyword-gated: a fragment carries
   * no statement verb.
   */
  readonly fragmentMethods?: readonly (string | SqlFragmentSink)[];
  /**
   * Functions imported from the plugin's modules whose argument 0 is a raw
   * SQL fragment — objection's `raw('…')`.
   */
  readonly fragmentFunctions?: readonly string[];
  /**
   * Functions imported from the plugin's modules that take a callback
   * returning a raw SQL fragment, whose first parameter is the column alias
   * the driver substitutes — TypeORM's `Raw((alias) => \`${alias} > 1\`)`.
   */
  readonly aliasCallbacks?: readonly string[];
  /**
   * Methods whose result is a prepared statement or a query builder, whose
   * own methods take bound VALUES — better-sqlite3's `db.prepare(sql)` then
   * `.get(id)`, Drizzle's `db.insert(t)` then `.values(row)`. Request data
   * handed to one of those is a parameter, not SQL text.
   */
  readonly statementFactories?: readonly string[];
  /**
   * Properties of a query-options object that hold the statement text —
   * mysql2's `query({ sql, values })`.
   */
  readonly sqlTextProperties?: readonly string[];
  /**
   * Driver functions whose result is escaped SQL text (`escape`, `escapeId`,
   * `format`). A member call of that name on a receiver not provably from
   * another library, or a binding imported under that name from the modules.
   */
  readonly escapers?: readonly string[];
  /**
   * Standalone escaping libraries for this driver whose `escapers` count too —
   * `sqlstring`, the escaper mysql and mysql2 are built on.
   */
  readonly escaperModules?: readonly string[];
  /**
   * Members of the driver whose result is a parameterised fragment rather
   * than text (`Prisma.join`, `sql.identifier`, `knex.ref`).
   */
  readonly fragmentFactories?: readonly string[];
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
   * One exception keeps that partition: a sink the code-agnostic
   * `secure-coding/no-sql-injection` does not own (anything but `query` /
   * `execute`) also reports in a file that reaches the driver only through a
   * RELATIVE import, when its receiver is read from disk and proven to be the
   * driver's — `import prisma from './lib/prisma'; prisma.$queryRawUnsafe(…)`.
   *
   * Matched against the specifier's package root, so `'mysql2/promise'`
   * matches `'mysql2'` and `'@prisma/client/edge'` matches `'@prisma/client'`.
   */
  readonly modules: readonly string[];
  /**
   * `"…"` delimits a string in this driver's default dialect (MySQL), not an
   * identifier — so `= "${x}"` is a value position.
   */
  readonly doubleQuotedStrings?: boolean;
  /**
   * Require the *static* part of a STATEMENT sink's text to read as a SQL
   * statement (`SELECT … FROM`, `INSERT INTO`, `UPDATE … SET` …) before
   * reporting, unless the receiver is proven to be the driver. Precision
   * guard for names other libraries share (`.get()`, `.run()`, `.execute()`).
   */
  readonly requireSqlKeywords: boolean;
  /** Remediation line in the emitted message. */
  readonly fix: string;
  /** Reference link in the emitted message. */
  readonly documentationLink: string;
}

/**
 * SQL statements, recognised by a verb **and** its companion keyword — the
 * same shapes `postgresql-security/no-unsafe-query` recognises, plus the
 * SQLite / MySQL statements that have no companion (`PRAGMA`, `SHOW`).
 */
const SQL_STATEMENTS: readonly RegExp[] = [
  /^[\s(]*select\b[\s\S]*\bfrom\b/i,
  /^[\s(]*select\s/i,
  /^\s*insert\s+(?:or\s+\w+\s+|ignore\s+)?into\b/i,
  /^\s*update\b[\s\S]*\bset\b/i,
  /^\s*delete\s+from\b/i,
  /^\s*(?:replace|merge)\s+into\b/i,
  /^\s*with\b[\s\S]*\bas\s*\(/i,
  /^\s*(?:create|drop|alter|truncate)\s+(?:unique\s+|temp(?:orary)?\s+|or\s+replace\s+)*(?:table|index|view|schema|database|sequence|trigger|function|procedure|user|role)\b/i,
  /^\s*(?:pragma|attach|detach|vacuum|analyze|reindex|show|describe|explain)\b/i,
  /^\s*call\s+[\w".`]+\s*\(/i,
];

/** Statement sinks `secure-coding/no-sql-injection` owns in driver-free files. */
const PARTITION_SHARED_SINKS: ReadonlySet<string> = new Set([
  'query',
  'execute',
]);

/** Whether a string's static half reads as a SQL statement. */
export function looksLikeSqlStatement(text: string): boolean {
  return SQL_STATEMENTS.some((pattern) => pattern.test(text));
}

type UnsafeKind = 'concat' | 'template';

/** Nearest enclosing function of `node`, or `undefined` at module top level. */
function enclosingFunction(
  node: TSESTree.Node,
): TSESTree.FunctionLike | undefined {
  for (let n = node.parent; n; n = n.parent) {
    if (isFunctionNode(n)) return n;
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

/**
 * Build a CWE-89 rule for the given sinks and remediation copy.
 *
 * Detects: an unproven value concatenated or interpolated into a sink's SQL
 * text, directly or through a binding (including `+=` builders and a local
 * function that returns the text); request data passed as the SQL text
 * itself; and either of those passed to a same-file helper that forwards the
 * argument into a sink.
 */
export function createSqlInjectionRule(
  config: SqlInjectionRuleConfig,
): TSESLint.RuleModule<SqlInjectionMessageIds, []> {
  const statementSinks = new Set(config.methods);
  const fragmentSinks = new Map<string, Required<SqlFragmentSink>>();
  for (const sink of config.fragmentMethods ?? []) {
    const spec = typeof sink === 'string' ? { name: sink } : sink;
    fragmentSinks.set(spec.name, {
      name: spec.name,
      arg: spec.arg ?? 0,
      requireDriverReceiver: spec.requireDriverReceiver ?? false,
    });
  }
  const fragmentFunctions = new Set(config.fragmentFunctions ?? []);
  const aliasCallbacks = new Set(config.aliasCallbacks ?? []);
  const sqlTextProperties = new Set(config.sqlTextProperties ?? []);
  const statementFactories = new Set(config.statementFactories ?? []);

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
  const originOf = createOriginClassifier(config.modules);
  const safety = createSqlSafety({
    origin: originOf,
    escapers: new Set(config.escapers ?? []),
    fragmentFactories: new Set(config.fragmentFactories ?? []),
    modules: config.modules,
    escaperModules: config.escaperModules,
  });

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
      // BENCHMARK-CRITERIA §B1: a security rule self-skips test files. A test
      // that wipes a fixture table or builds a throwaway statement is not the
      // shipped attack surface.
      if (isTestFilePath(context.filename)) return {};

      const env: Env = envOf(context);
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
      }[] = [];

      /**
       * Whether this file imports the SDK these sinks belong to.
       *
       * Set once from the Program node — which ESLint visits before any of its
       * children — so every visitor below can read it.
       */
      let ownsFile = false;

      /**
       * Is `node` — a sink's SQL argument — an unproven value spliced into
       * SQL? Returns the kind of construction, or `false`.
       *
       * @param gate require the text to read as a SQL statement.
       */
      const judge = (
        node: TSESTree.Node,
        gate: boolean,
        depth = 0,
      ): UnsafeKind | false => {
        const arg = unwrapTypeSyntax(node);
        if (
          arg.type === AST_NODE_TYPES.TemplateLiteral ||
          (arg.type === AST_NODE_TYPES.BinaryExpression && arg.operator === '+')
        ) {
          if (
            arg.type === AST_NODE_TYPES.TemplateLiteral &&
            arg.expressions.length === 0
          ) {
            return false;
          }
          const kind: UnsafeKind =
            arg.type === AST_NODE_TYPES.TemplateLiteral ? 'template' : 'concat';
          const text = sqlStaticText(arg);
          // `+` is also numeric addition. Without static text there is no
          // evidence this builds SQL at all.
          if (kind === 'concat' && text.trim() === '') return false;
          if (gate && !looksLikeSqlStatement(text)) return false;
          return sqlHoles(arg).some(isUnsafeHole) ? kind : false;
        }
        if (depth > 2) return false;
        if (arg.type === AST_NODE_TYPES.Identifier) {
          return judgeBinding(arg, gate, depth);
        }
        if (arg.type === AST_NODE_TYPES.CallExpression) {
          // A builder written in this file: `db.query(build(req.query.tag))`.
          const target = follow(valueAt(arg.callee, env));
          if (target.env !== env || !isFunctionNode(target.node)) return false;
          for (const result of returnedValues(target.node) ?? []) {
            const kind = judge(result, gate, depth + 1);
            if (kind) return kind;
          }
        }
        return false;
      };

      /**
       * A hole is a finding when the file cannot prove it fixed AND — in a
       * fragment position, where no bind parameter exists — it is traced to
       * the request. See `sql-position.ts`.
       */
      const isUnsafeHole = ({ expression, preceding }: SqlHole): boolean =>
        !safety.isSafe(valueAt(expression, env), isQuoted(preceding)) &&
        (isValuePosition(preceding, config.doubleQuotedStrings) ||
          isRequestDerived(expression, env));

      /**
       * A binding handed to a sink: judged by every write it receives — its
       * initialiser and each `=` / `+=` — and by the SQL text they add up to.
       */
      const judgeBinding = (
        node: TSESTree.Identifier,
        gate: boolean,
        depth: number,
      ): UnsafeKind | false => {
        const variable = lookup(node.name, env.scopeOf(node));
        // A parameter is the wrapper shape; anything else written in the file
        // is judged by what is written to it.
        if (
          variable === null ||
          !variable.defs.some((def) => def.type === 'Variable') ||
          variable.defs.some((def) => def.type === 'Parameter')
        ) {
          return false;
        }
        const writes = variable.references
          .filter((r) => r.isWrite() && r.writeExpr)
          .map((r) => r.writeExpr as TSESTree.Node);
        const text = writes.map(sqlStaticText).join(' ');
        if (gate && !looksLikeSqlStatement(text)) return false;
        for (const write of writes) {
          const kind = judge(write, false, depth + 1);
          if (kind) return kind;
        }
        return false;
      };

      /** Is this sink argument request data handed over as the SQL text itself? */
      const isRequestText = (node: TSESTree.Node): boolean => {
        let cursor = unwrapTypeSyntax(node);
        // `String(x)` hands its argument through unchanged.
        while (
          cursor.type === AST_NODE_TYPES.CallExpression &&
          cursor.callee.type === AST_NODE_TYPES.Identifier &&
          cursor.callee.name === 'String' &&
          cursor.arguments.length === 1
        ) {
          cursor = unwrapTypeSyntax(cursor.arguments[0]);
        }
        // `req.body.sql`, `body.sql` where `body = await req.json()`, `body`.
        for (let link: TSESTree.Node = cursor; ; link = link.object) {
          if (isRequestPayload(link, env)) return true;
          if (link.type !== AST_NODE_TYPES.MemberExpression) return false;
        }
      };

      const report = (node: TSESTree.Node, kind: UnsafeKind): void => {
        context.report({
          node,
          messageId:
            kind === 'template' ? 'unsafeTemplateLiteral' : 'noUnsafeQuery',
        });
      };

      /**
       * Whether the sink being judged is called on the handle itself
       * (`pool.query(…)`), not on a builder or prepared statement one call
       * further down (`db.prepare(sql).get(id)`, `db.insert(t).values(row)`),
       * whose arguments are bound values rather than SQL text.
       */
      let requestTextSink = true;

      /**
       * Is this receiver a prepared statement or a query builder — the result
       * of `db.prepare(sql)` / `db.insert(t)` — whose methods take bound
       * values rather than SQL text?
       */
      const isStatementObject = (receiver: TSESTree.Node): boolean => {
        const value = unwrapTypeSyntax(follow(valueAt(receiver, env)).node);
        return (
          value.type === AST_NODE_TYPES.CallExpression &&
          value.callee.type === AST_NODE_TYPES.MemberExpression &&
          statementFactories.has(propertyName(value.callee) ?? '')
        );
      };

      /** Judge one sink argument and report it. */
      const check = (arg: TSESTree.Node, gate: boolean): void => {
        let text = unwrapTypeSyntax(arg);
        if (
          text.type === AST_NODE_TYPES.ObjectExpression &&
          sqlTextProperties.size > 0
        ) {
          const property = text.properties.find(
            (p): p is TSESTree.Property =>
              p.type === AST_NODE_TYPES.Property &&
              sqlTextProperties.has(objectKeyName(p) ?? ''),
          );
          if (property === undefined) return;
          text = property.value as TSESTree.Expression;
        }
        const kind = judge(text, gate);
        if (kind) {
          report(text, kind);
          return;
        }
        if (requestTextSink && isRequestText(text)) report(text, 'concat');
      };

      /** The name a callee identifier is imported under from the plugin's modules. */
      const importedName = (callee: TSESTree.Identifier): string | null => {
        const variable = lookup(callee.name, env.scopeOf(callee));
        const specifier =
          variable === null ? null : importSpecifierOf(variable);
        return specifier !== null &&
          config.modules.some(
            (m) =>
              specifier.source === m || specifier.source.startsWith(`${m}/`),
          )
          ? specifier.name
          : null;
      };

      /**
       * `Raw((alias) => \`${alias} = '${x}'\`)` — every hole but the alias the
       * driver substitutes must be safe.
       */
      const checkAliasCallback = (node: TSESTree.CallExpression): void => {
        const callback = node.arguments[0];
        if (!callback || !isFunctionNode(callback)) return;
        const alias = callback.params[0];
        for (const result of returnedValues(callback) ?? []) {
          const text = unwrapTypeSyntax(result);
          if (text.type !== AST_NODE_TYPES.TemplateLiteral) continue;
          const unsafe = sqlHoles(text).some(
            (hole) =>
              !(
                hole.expression.type === AST_NODE_TYPES.Identifier &&
                alias?.type === AST_NODE_TYPES.Identifier &&
                hole.expression.name === alias.name
              ) && isUnsafeHole(hole),
          );
          if (unsafe) report(text, 'template');
        }
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

        CallExpression(node: TSESTree.CallExpression) {
          // The name this call is written with: `db.query(…)` and
          // `db['query'](…)` both -> `query`, `q(…)` -> `q`. A method chosen at
          // RUNTIME (`db[verb](…)`) names nothing and stays out of reach, as
          // does an immediately invoked expression.
          const callee = node.callee;
          const isMember = callee.type === AST_NODE_TYPES.MemberExpression;
          const calleeName = isMember
            ? (propertyName(callee) ?? undefined)
            : callee.type === AST_NODE_TYPES.Identifier
              ? callee.name
              : undefined;
          if (calleeName === undefined) return;

          if (!isMember && ownsFile) {
            const imported = importedName(callee as TSESTree.Identifier);
            if (imported !== null && fragmentFunctions.has(imported)) {
              requestTextSink = true;
              if (node.arguments[0]) check(node.arguments[0], false);
              return;
            }
            if (imported !== null && aliasCallbacks.has(imported)) {
              checkAliasCallback(node);
              return;
            }
          }

          const fragment = isMember ? fragmentSinks.get(calleeName) : undefined;
          // A driver sink is always a *method* call. A bare `query(…)` is some
          // local function that happens to share the name, and stays a mere
          // wrapper candidate — matching it as a sink would report every
          // project with its own free-standing `query()` helper.
          if (!isMember || (!statementSinks.has(calleeName) && !fragment)) {
            // Not a driver method. Bank it in case the callee turns out to be
            // a local wrapper — the keyword gate is forced on there regardless
            // of `requireSqlKeywords`, because "this identifier reaches a
            // sink" is weaker evidence than a literal driver call, and an
            // ungated instance would otherwise start reporting
            // `log(`hello ${name}`)` the moment the file happened to define a
            // `log` helper over `pool.query`.
            for (const [index, arg] of node.arguments.entries()) {
              if (arg.type === AST_NODE_TYPES.SpreadElement) continue;
              pending.push({ name: calleeName, index, arg });
            }
            return;
          }

          const receiver = originOf(
            valueAt((callee as TSESTree.MemberExpression).object, env),
          );
          // A method of another library that shares the name: `/re/.exec`,
          // `cp.exec`, `new Map().get`, a GraphQL client's `query`.
          if (receiver === 'foreign') return;
          if (fragment?.requireDriverReceiver && receiver !== 'ours') return;
          if (
            !ownsFile &&
            !(receiver === 'ours' && !PARTITION_SHARED_SINKS.has(calleeName))
          ) {
            return;
          }

          const queryArg = node.arguments[fragment?.arg ?? 0];
          if (!queryArg || queryArg.type === AST_NODE_TYPES.SpreadElement)
            return;

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

          const gate =
            fragment === undefined &&
            config.requireSqlKeywords &&
            receiver !== 'ours';
          requestTextSink = !isStatementObject(
            (callee as TSESTree.MemberExpression).object,
          );
          check(queryArg, gate);
        },

        'Program:exit'() {
          if (!ownsFile) return;
          // How many definitions of each name were proven to be wrappers.
          const proven = new Map<string, number>();
          for (const name of wrapperFns.values())
            proven.set(name, (proven.get(name) ?? 0) + 1);

          for (const { name, index, arg } of pending) {
            if (wrappers.get(name) !== index) continue;
            // Every definition of this name must be a wrapper, or we cannot
            // tell which one a call site meant.
            if (definitions.get(name) !== proven.get(name)) continue;
            const kind = judge(arg, true);
            if (kind) report(unwrapTypeSyntax(arg), kind);
          }
        },
      };
    },
  };
}
