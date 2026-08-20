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
  isStaticExpression,
} from '@interlace/eslint-devkit';
import { NoUnsafeQueryOptions } from '../../types';
import { fileUsesPostgres } from '../../utils';

/**
 * Methods that hand a raw SQL string to the server.
 *
 * `query` alone was the whole sink list, and `pool.execute(...)` — the spelling
 * every `mysql2`-shaped codebase carries over to `pg`, and the one node-postgres
 * itself accepts on a prepared statement — walked straight past the rule.
 * Exact membership against a closed API surface, never a substring.
 */
const SQL_SINK_METHODS: ReadonlySet<string> = new Set(['query', 'execute']);

/**
 * SQL statements, recognised by a verb **and** its companion keyword.
 *
 * Being called `query` is not evidence of being SQL. The rule reported
 * `analytics.query(`event:${req.query.name}`)` — an analytics client, no
 * database anywhere near it — because the method happened to share a name with
 * the pg sink. What makes a string a statement is that it reads like one, so
 * the static half of the expression has to match `SELECT … FROM`,
 * `UPDATE … SET` and the rest. A lone verb is not enough: `'update ' + name` is
 * a status message far more often than it is SQL.
 */
const SQL_STATEMENTS: readonly RegExp[] = [
  // Verb AND companion keyword. `INSERT`, `UPDATE`, `DELETE` and the DDL verbs
  // are never valid without theirs, so requiring it costs no recall.
  /^\s*select\b[\s\S]*\bfrom\b/i,
  /^\s*insert\s+into\b/i,
  /^\s*update\b[\s\S]*\bset\b/i,
  /^\s*delete\s+from\b/i,
  /^\s*replace\s+into\b/i,
  /^\s*merge\s+into\b/i,
  /^\s*with\b[\s\S]*\bas\s*\(/i,
  /^\s*copy\b[\s\S]*\bfrom\b/i,
  /^\s*grant\b[\s\S]*\bon\b/i,
  /^\s*(create|drop|alter|truncate)\s+(table|index|view|schema|database|sequence|materialized|type|function|trigger|role|user|extension)\b/i,
  // A bare projection has no FROM clause at all — `SELECT 1`,
  // `SELECT nextval('s')`, `SELECT pg_sleep(1)` — and pg codebases are full of
  // them. Demanding the companion here DID cost recall: the rule's own
  // coverage suite caught `let q = 'SELECT 1'; q += ` AND id = ${id}`` going
  // silent. Anchored, with required whitespace after the verb, so `event:` and
  // `'selected: ' + n` still stay out.
  /^\s*select\s/i,
];

/** The literal text of a string expression, ignoring every interpolated value. */
function staticText(node: TSESTree.Node): string {
  if (node.type === AST_NODE_TYPES.TemplateLiteral) {
    return node.quasis.map((q) => q.value.raw).join('');
  }
  if (node.type === AST_NODE_TYPES.BinaryExpression && node.operator === '+') {
    return `${staticText(node.left as TSESTree.Node)}${staticText(node.right)}`;
  }
  if (node.type === AST_NODE_TYPES.Literal && typeof node.value === 'string') {
    return node.value;
  }
  return '';
}

/** Whether the static half of an expression reads as a SQL statement. */
function looksLikeSqlStatement(text: string): boolean {
  return SQL_STATEMENTS.some((pattern) => pattern.test(text));
}

/**
 * Is some interpolated part a value this file cannot prove constant?
 *
 * `const TABLE = 'users'; db.query(`SELECT * FROM ${TABLE}`)` was reported as an
 * injection. Nothing there can change: the interpolation folds to a literal
 * written three lines up. `isStaticExpression` resolves the binding rather than
 * assuming that interpolation means danger.
 *
 * A part that is a CALL is deliberately not raw. `'… ORDER BY ' +
 * escapeIdentifier(req.query.sort)` and `client.escapeLiteral(x)` are the
 * DOCUMENTED remediations for this very weakness, and reporting them would hand
 * a developer their own fix as the finding. Locally-defined builders still get
 * caught — `effectiveExpression` substitutes their returned string before this
 * ever runs, so the real query is what gets judged.
 */
function hasRawPart(
  node: TSESTree.TemplateLiteral | TSESTree.BinaryExpression,
  scope: TSESLint.Scope.Scope,
): boolean {
  const parts: TSESTree.Node[] =
    node.type === AST_NODE_TYPES.TemplateLiteral
      ? [...node.expressions]
      : [node.left as TSESTree.Node, node.right];
  return parts.some((part) => {
    if (part.type === AST_NODE_TYPES.CallExpression) return false;
    if (
      part.type === AST_NODE_TYPES.BinaryExpression ||
      part.type === AST_NODE_TYPES.TemplateLiteral
    ) {
      return hasRawPart(part, scope);
    }
    return !isStaticExpression({ node: part, scope });
  });
}

/** The variable a name resolves to, walking outward from `scope`. */
function resolveVariable(
  name: string,
  scope: TSESLint.Scope.Scope | null,
): TSESLint.Scope.Variable | null {
  for (let current = scope; current !== null; current = current.upper) {
    const variable = current.set.get(name);
    if (variable !== undefined) return variable;
  }
  return null;
}

/**
 * The expression a sink argument really holds.
 *
 * A LOCAL query builder resolves to the string it returns:
 *
 *   const build = (t) => `SELECT * FROM logs WHERE tag = '${t}'`;
 *   db.query(build(req.query.tag));            // was completely silent
 *
 * The sink saw a `CallExpression`, which is neither a concatenation nor a
 * template, so the entire injection disappeared. Substituting the builder's
 * returned string makes the real query visible to every gate below.
 *
 * Only when the callee resolves HERE and its body is visibly an interpolated
 * string. An IMPORTED call — `format('SELECT * FROM %I', table)`,
 * `escapeIdentifier(x)` — does not resolve, so the documented fixes stay quiet.
 * Escapers come from libraries; builders are written in the file.
 */
function effectiveExpression(
  node: TSESTree.Node,
  scope: TSESLint.Scope.Scope | null,
): TSESTree.Node {
  // node-postgres also takes a config object: `db.query({ text, values })`.
  // The SQL is interpolated exactly as it is in the string form, and it went
  // straight past a rule that only ever read the first argument as a string.
  // The same gap was found independently on `no-transaction-on-pool`.
  if (node.type === AST_NODE_TYPES.ObjectExpression) {
    const text = node.properties.find(
      (prop): prop is TSESTree.Property =>
        prop.type === AST_NODE_TYPES.Property &&
        ((prop.key.type === AST_NODE_TYPES.Identifier &&
          !prop.computed &&
          prop.key.name === 'text') ||
          (prop.key.type === AST_NODE_TYPES.Literal && prop.key.value === 'text')),
    );
    return text === undefined ? node : effectiveExpression(text.value, scope);
  }

  // `const config = { text: … }; db.query(config)` — the config object one
  // binding above the sink. Restricted to an ObjectExpression initialiser on
  // purpose: a STRING binding is handled by the `fragments` map instead, which
  // also accumulates the `+=` builder shape that a single init cannot express.
  if (node.type === AST_NODE_TYPES.Identifier) {
    const variable = resolveVariable(node.name, scope);
    if (variable === null) return node;
    if (variable.references.filter((ref) => ref.isWrite()).length !== 1) return node;
    const def = variable.defs.find((d) => d.type === 'Variable');
    const init = def === undefined ? null : (def.node as TSESTree.VariableDeclarator).init;
    return init != null && init.type === AST_NODE_TYPES.ObjectExpression
      ? effectiveExpression(init, scope)
      : node;
  }

  if (node.type === AST_NODE_TYPES.CallExpression) {
    if (node.callee.type !== AST_NODE_TYPES.Identifier) return node;
    const fn = resolveVariable(node.callee.name, scope);
    const impl = fn === null ? null : functionImplementation(fn);
    if (impl === null) return node;
    const returned = returnedExpression(impl.body);
    return returned === null ? node : returned;
  }
  return node;
}

/**
 * The function a callee name resolves to, when it is written in THIS file.
 *
 * `singleAssignedInit` alone covered only `const build = () => …`. A plain
 * `function build(t) { … }` is a `FunctionName` definition with no initialiser,
 * so it resolved to nothing and the most ordinary builder spelling of all went
 * unread.
 *
 * An `ImportBinding` deliberately resolves to nothing. That is what keeps
 * `format(…)` and `escapeIdentifier(…)` — the documented remediations — quiet:
 * escapers come from libraries, builders are written in the file.
 */
function functionImplementation(
  variable: TSESLint.Scope.Variable,
): TSESTree.FunctionDeclaration | TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression | null {
  const def = variable.defs.find((d) => d.type === 'FunctionName' || d.type === 'Variable');
  if (def === undefined) return null;
  if (def.type === 'FunctionName') {
    return def.node as TSESTree.FunctionDeclaration;
  }
  // A binding written more than once has no knowable implementation at the
  // sink — the call could reach either one.
  if (variable.references.filter((ref) => ref.isWrite()).length !== 1) return null;
  const init = (def.node as TSESTree.VariableDeclarator).init;
  if (
    init === null ||
    init === undefined ||
    (init.type !== AST_NODE_TYPES.ArrowFunctionExpression &&
      init.type !== AST_NODE_TYPES.FunctionExpression)
  ) {
    return null;
  }
  return init;
}

/**
 * The string a function body evaluates to.
 *
 * A concise arrow (`(t) => `SELECT …${t}``) is the shape the reference
 * implementation handles, and it is the RARER one. Every builder written the
 * ordinary way —
 *
 *   function build(t) { return 'SELECT * FROM logs WHERE tag = ' + t; }
 *   const build = (t) => { return `SELECT … ${t}`; };
 *
 * — has a BlockStatement body, so the substitution never happened and the
 * injection stayed silent. The rule's own adversarial suite is what surfaced
 * this; the corpus fixture only ever used the concise form.
 *
 * A block with more than one statement, or whose `return` is not the last
 * statement, is not read: the string could be reassigned in between, and
 * guessing is how a precise rule becomes a noisy one.
 */
function returnedExpression(body: TSESTree.Node): TSESTree.Node | null {
  if (body.type === AST_NODE_TYPES.BlockStatement) {
    const [only] = body.body;
    if (body.body.length !== 1 || only.type !== AST_NODE_TYPES.ReturnStatement) {
      return null;
    }
    return only.argument === null ? null : returnedExpression(only.argument);
  }
  return body.type === AST_NODE_TYPES.TemplateLiteral ||
    body.type === AST_NODE_TYPES.BinaryExpression
    ? body
    : null;
}

export const noUnsafeQuery: TSESLint.RuleModule<
  'noUnsafeQuery' | 'unsafeTemplateLiteral',
  NoUnsafeQueryOptions
> = {
  meta: {
    type: 'problem',
    // CWE / CVSS lifted to meta.docs (Interlace extension) so
    // @interlace/eslint-formatter renders them inline. Previously these
    // values lived only inside the `messages` factory below, where the
    // whole-run formatter cannot see them. See docs/META_HYGIENE.md for
    // the fleet-wide audit and tracker P1 #5 for the rollout plan.
    docs: {
      description: 'Prevent SQL injection by disallowing string concatenation or unsafe template literals in queries.',
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-postgresql-security/docs/rules/no-unsafe-query.md',
      // CWE / CVSS surfaces in the formatter (devkit augments RuleMetaDataDocs).
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
        fix: 'Use parameterized queries ($1, $2) instead of string concatenation.',
        documentationLink: 'https://node-postgres.com/features/queries#parameterized-queries',
      }),
      unsafeTemplateLiteral: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'SQL Injection Risk',
        description: 'Unsafe SQL query construction detected (template literal).',
        severity: 'CRITICAL',
        fix: 'Use parameterized queries ($1, $2) instead of interpolating values.',
        documentationLink: 'https://owasp.org/www-community/attacks/SQL_Injection',
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
     * Every string-valued fragment written into a local binding, in source
     * order.
     *
     * The old map stored only a KIND (`'concat' | 'template'`), which threw away
     * the statement text — so a `+=` builder could never be tested for being SQL
     * at all, and the fragments could not be judged together. Keeping the nodes
     * lets the sink re-read the whole assembled query:
     *
     *   let q = "SELECT * FROM products WHERE 1=1";
     *   q += ` AND name = '${name}'`;      // ← alone, not a SQL statement
     *   db.query(q);                       // ← together, plainly one
     */
    const fragments = new Map<string, TSESTree.Node[]>();

    /** Is this expression a string being BUILT out of parts, rather than written? */
    const isBuilt = (node: TSESTree.Node): boolean =>
      (node.type === AST_NODE_TYPES.TemplateLiteral && node.expressions.length > 0) ||
      (node.type === AST_NODE_TYPES.BinaryExpression && node.operator === '+');

    /** Does this expression contribute text to a SQL string? */
    const isStringish = (node: TSESTree.Node): boolean =>
      isBuilt(node) ||
      node.type === AST_NODE_TYPES.TemplateLiteral ||
      (node.type === AST_NODE_TYPES.Literal && typeof node.value === 'string');

    /**
     * Report when the fragments together form a SQL statement built out of at
     * least one value this file cannot prove constant.
     *
     * All three conditions are required, and each one is a false positive the
     * rule used to ship:
     *   built     — `db.query('SELECT 1')` is not assembled from anything
     *   SQL       — `analytics.query(`event:${name}`)` is not a statement
     *   raw part  — `` `SELECT * FROM ${TABLE}` `` folds to a literal
     */
    const reportIfUnsafe = (
      reportNode: TSESTree.Node,
      parts: readonly TSESTree.Node[],
      scope: TSESLint.Scope.Scope,
    ): void => {
      let kind: 'concat' | 'template' | null = null;
      let raw = false;
      let text = '';

      for (const part of parts) {
        text += staticText(part);
        if (part.type === AST_NODE_TYPES.BinaryExpression && part.operator === '+') {
          kind = 'concat';
          if (hasRawPart(part, scope)) raw = true;
        } else if (
          part.type === AST_NODE_TYPES.TemplateLiteral &&
          part.expressions.length > 0
        ) {
          kind = 'template';
          if (hasRawPart(part, scope)) raw = true;
        }
      }

      if (kind === null || !raw) return;
      if (!looksLikeSqlStatement(text)) return;

      context.report({
        node: reportNode,
        messageId: kind === 'template' ? 'unsafeTemplateLiteral' : 'noUnsafeQuery',
      });
    };

    return {
      // Track variable declarations that hold query text:
      // const query = "SELECT..." + userId;
      // const query = `SELECT...${email}`;
      // let query = "SELECT ...";            ← the seed of a `+=` builder
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (
          node.id.type === AST_NODE_TYPES.Identifier &&
          node.init &&
          isStringish(node.init)
        ) {
          fragments.set(node.id.name, [node.init]);
        }
      },

      // Track augmented assignment: query += " AND ..." + var
      // or: query += `...${var}`
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        if (node.operator !== '+=' || node.left.type !== AST_NODE_TYPES.Identifier) {
          return;
        }
        const existing = fragments.get(node.left.name);
        if (existing === undefined) {
          fragments.set(node.left.name, [node.right]);
          return;
        }
        existing.push(node.right);
      },

      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type !== AST_NODE_TYPES.MemberExpression ||
          node.callee.property.type !== AST_NODE_TYPES.Identifier ||
          !SQL_SINK_METHODS.has(node.callee.property.name)
        ) {
          return;
        }

        const [queryArg] = node.arguments;
        if (queryArg === undefined || queryArg.type === AST_NODE_TYPES.SpreadElement) {
          return;
        }

        const scope = context.sourceCode.getScope(node);

        // The query written at the sink, or the one a LOCAL builder returns.
        const expression = effectiveExpression(queryArg, scope);
        if (isBuilt(expression)) {
          reportIfUnsafe(queryArg, [expression], scope);
          return;
        }

        // Otherwise the query was assembled into a binding: db.query(sql)
        if (queryArg.type === AST_NODE_TYPES.Identifier) {
          const parts = fragments.get(queryArg.name);
          if (parts !== undefined) reportIfUnsafe(queryArg, parts, scope);
        }
      },
    };
  },
};
