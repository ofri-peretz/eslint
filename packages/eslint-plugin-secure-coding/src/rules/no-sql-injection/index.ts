/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-sql-injection
 * CWE-89: SQL injection built from attacker-attributable input, in files that
 * import no SQL driver.
 *
 * @see https://cwe.mitre.org/data/definitions/89.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'sqlInjection';

/**
 * Packages that put a SQL client in a file — the union of every `modules` list
 * the driver-specific plugins declare.
 *
 * This set is the **complement** of the driver rules' gate, not a copy of it.
 * `createSqlInjectionRule` (devkit) and `pg/no-unsafe-query` report only in a
 * file that imports their own driver; this rule reports only in a file that
 * imports none of them. The two tests are complements, so exactly one rule
 * owns any given `db.query(...)` site and `recommended` never bills the same
 * line twice — the duplicate-finding class #478 was opened to close.
 *
 * Keep in sync with: postgresql-security `PG_MODULES`, mysql-security,
 * sqlite-security, typeorm-security, sequelize-security, knex-security,
 * drizzle-security and prisma-security `modules`.
 *
 * **Known hole, and it is not this rule's to close.** `createSqlInjectionRule`
 * in the devkit decides `ownsFile` from `Program.body` `ImportDeclaration`s
 * only — it never looks at `require()`. So a CommonJS file doing
 * `const mysql = require('mysql2')` is invisible to the mysql/typeorm/knex/
 * drizzle/sqlite/prisma/sequelize rules, and this rule abstains there too
 * because the `require` arm below *does* see it. The result is a file nobody
 * reports. `postgresql-security` is unaffected: its `fileUsesPostgres` gate
 * handles `require`, dynamic `import()` and `import =` as well as ESM.
 *
 * Widening this rule to cover the hole is the wrong fix — it would make every
 * CommonJS `require('pg')` file report twice. The fix belongs in the devkit
 * factory, alongside a re-measurement of the seven driver plugins.
 */
const SQL_DRIVER_MODULES: ReadonlySet<string> = new Set([
  // PostgreSQL — postgresql-security/PG_MODULES
  'pg',
  'pg-pool',
  'pg-native',
  'pg-cursor',
  'pg-promise',
  'pg-copy-streams',
  'postgres',
  'slonik',
  '@vercel/postgres',
  '@neondatabase/serverless',
  '@electric-sql/pglite',
  // MySQL
  'mysql',
  'mysql2',
  '@planetscale/database',
  // SQLite
  'sqlite3',
  'better-sqlite3',
  'node:sqlite',
  'bun:sqlite',
  '@libsql/client',
  // ORMs and query builders that own their own rules
  'typeorm',
  '@nestjs/typeorm',
  'sequelize',
  'sequelize-typescript',
  '@nestjs/sequelize',
  'knex',
  'objection',
  'drizzle-orm',
  '@prisma/client',
  'prisma',
  // Raw clients with no plugin of their own yet — still excluded, because a
  // file holding one of these is a driver file and adding its plugin later
  // must not turn this rule into a duplicate.
  'kysely',
  'mssql',
  'oracledb',
]);

/**
 * Whether a module specifier names a SQL driver.
 *
 * Compared on the package root so `mysql2/promise` and `@prisma/client/edge`
 * count. A relative or absolute specifier is never a package and is rejected
 * outright — otherwise `'./pg'` would silence this rule in a repo that has no
 * `pg`, which is a false negative rather than a partition.
 */
function isSqlDriverSpecifier(specifier: string): boolean {
  if (specifier.startsWith('.') || specifier.startsWith('/')) return false;
  const parts = specifier.split('/');
  const root = specifier.startsWith('@')
    ? parts.slice(0, 2).join('/')
    : parts[0];
  return SQL_DRIVER_MODULES.has(root);
}

/** The string value of a node, when it is a plain string literal. */
function stringLiteralValue(node: TSESTree.Node | undefined): string | null {
  if (
    node !== undefined &&
    node.type === AST_NODE_TYPES.Literal &&
    typeof node.value === 'string'
  ) {
    return node.value;
  }
  return null;
}

/** Method names that execute a raw SQL string. */
const SQL_SINK_METHODS: ReadonlySet<string> = new Set(['query', 'execute']);

/**
 * SQL statements, recognised by a verb **and** its companion keyword.
 *
 * A single verb is not evidence. `'update ' + name` is a status message far
 * more often than it is a statement, and `no-graphql-injection`'s demotion to
 * `warn` is what a keyword-soup matcher costs. Requiring `SELECT … FROM`,
 * `UPDATE … SET` and the rest means the static text has to be shaped like a
 * statement, not merely contain a word that also appears in one.
 */
const SQL_STATEMENTS: readonly RegExp[] = [
  /^\s*select\b[\s\S]*\bfrom\b/i,
  /^\s*insert\s+into\b/i,
  /^\s*update\b[\s\S]*\bset\b/i,
  /^\s*delete\s+from\b/i,
  /^\s*replace\s+into\b/i,
  /^\s*merge\s+into\b/i,
];

/** Literal text of a string expression, ignoring interpolated values. */
function staticText(node: TSESTree.Node): string {
  if (node.type === AST_NODE_TYPES.TemplateLiteral) {
    return node.quasis.map((q) => q.value.raw).join('');
  }
  if (
    node.type === AST_NODE_TYPES.BinaryExpression &&
    node.operator === '+'
  ) {
    return `${staticText(node.left as TSESTree.Node)}${staticText(node.right)}`;
  }
  const literal = stringLiteralValue(node);
  return literal === null ? '' : literal;
}

/** Whether the static half of an expression reads as a SQL statement. */
function looksLikeSqlStatement(node: TSESTree.Node): boolean {
  const text = staticText(node);
  return SQL_STATEMENTS.some((pattern) => pattern.test(text));
}

/** Whether an expression builds a string out of parts. */
function isBuiltString(node: TSESTree.Node): boolean {
  if (node.type === AST_NODE_TYPES.TemplateLiteral) {
    return node.expressions.length > 0;
  }
  return (
    node.type === AST_NODE_TYPES.BinaryExpression && node.operator === '+'
  );
}

/** Identifier roots that denote an inbound request. */
const REQUEST_ROOTS: ReadonlySet<string> = new Set([
  'req',
  'request',
  'ctx',
  'event',
]);

/** Properties of a request that carry caller-supplied data. */
const REQUEST_PROPERTIES: ReadonlySet<string> = new Set([
  'query',
  'params',
  'body',
  'headers',
  'cookies',
  'url',
  'path',
]);

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
 * The initialiser of a variable that is written exactly once.
 *
 * More than one write and the value at the sink is not knowable from the
 * declaration, so this abstains. That deliberately gives up the `let sql =
 * '…'; sql += ' AND x = ' + x` builder shape: the driver-scoped rules track
 * `+=` because they already know the file is a database file, and guessing at
 * it here — in a rule that runs on *every* file with no driver evidence at
 * all — is how a precise rule becomes a noisy one.
 */
function singleAssignedInit(
  variable: TSESLint.Scope.Variable,
): TSESTree.Node | null {
  const writes = variable.references.filter((ref) => ref.isWrite());
  if (writes.length !== 1) return null;
  // Only a `var`/`let`/`const` declaration carries an initialiser to follow.
  // A parameter assigned once inside its body, a class name and an import
  // binding are all written-once too, and none of them has one.
  const def = variable.defs.find((d) => d.type === 'Variable');
  if (def === undefined) return null;
  return (def.node as TSESTree.VariableDeclarator).init ?? null;
}

/**
 * Where the dynamic half of this expression comes from, or `null` when it
 * cannot be attributed.
 *
 * "I cannot prove this is safe" is not a finding. A `db.query('SELECT … ' +
 * id)` whose `id` is a function parameter, a config value or a loop counter is
 * a query builder doing its job; the rule reports only when it can name an
 * attacker-controlled origin. This is the same contract
 * `no-unsafe-regex-construction` adopted when it stopped reporting everything
 * dynamic.
 *
 * Calls are deliberately **not** traversed: `escapeIdentifier(req.query.sort)`
 * and `client.escapeLiteral(req.body.name)` are the documented fixes for the
 * exact defect this rule reports, so treating a wrapped value as tainted would
 * report code that is already correct and offer it its own remedy.
 */
function attributedSource(
  node: TSESTree.Node,
  scope: TSESLint.Scope.Scope | null,
  depth = 0,
): string | null {
  if (depth > 5) return null;

  if (node.type === AST_NODE_TYPES.TemplateLiteral) {
    for (const expression of node.expressions) {
      const found = attributedSource(expression, scope, depth + 1);
      if (found !== null) return found;
    }
    return null;
  }

  if (
    node.type === AST_NODE_TYPES.BinaryExpression &&
    node.operator === '+'
  ) {
    return (
      attributedSource(node.left as TSESTree.Node, scope, depth + 1) ??
      attributedSource(node.right, scope, depth + 1)
    );
  }

  if (node.type === AST_NODE_TYPES.MemberExpression) {
    let root: TSESTree.Node = node;
    const properties: string[] = [];
    while (root.type === AST_NODE_TYPES.MemberExpression) {
      if (root.property.type === AST_NODE_TYPES.Identifier) {
        properties.unshift(root.property.name);
      }
      root = root.object;
    }
    if (
      root.type === AST_NODE_TYPES.Identifier &&
      REQUEST_ROOTS.has(root.name) &&
      properties.some((property) => REQUEST_PROPERTIES.has(property))
    ) {
      return `${root.name}.${properties.join('.')}`;
    }
    return null;
  }

  if (node.type === AST_NODE_TYPES.Identifier) {
    const variable = resolveVariable(node.name, scope);
    if (variable === null) return null;
    const init = singleAssignedInit(variable);
    if (init === null) return null;
    return attributedSource(init, scope, depth + 1);
  }

  return null;
}

/**
 * The expression a sink argument really holds — following a
 * written-once local binding to its initialiser.
 *
 * `const query = 'SELECT … ' + userId; db.query(query);` is the textbook
 * spelling, and without this hop the sink sees a bare `Identifier` and the
 * rule would have to either report every `db.query(variable)` or miss it.
 */
function effectiveExpression(
  node: TSESTree.Node,
  scope: TSESLint.Scope.Scope | null,
): TSESTree.Node {
  if (node.type !== AST_NODE_TYPES.Identifier) return node;
  const variable = resolveVariable(node.name, scope);
  if (variable === null) return node;
  const init = singleAssignedInit(variable);
  return init ?? node;
}

export const noSqlInjection = createRule<[], MessageIds>({
  name: 'no-sql-injection',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-sql-injection.md',
      description:
        'Prevent SQL injection when a query is built from attacker-controlled input and executed through a driver-agnostic handle',
      cwe: 'CWE-89',
      cvss: 9.8,
      confidence: 'high',
    },
    messages: {
      sqlInjection: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'SQL Injection Risk',
        cwe: 'CWE-89',
        owasp: 'A03:2021',
        cvss: 9.8,
        description:
          'SQL statement built from "{{source}}" and executed. An attacker controls part of the statement text.',
        severity: 'CRITICAL',
        compliance: ['SOC2', 'PCI-DSS', 'NIST-CSF'],
        effort: 'high',
        fix: 'Pass the value as a bound parameter (`$1` / `?`) instead of concatenating it into the statement.',
        documentationLink:
          'https://owasp.org/www-community/attacks/SQL_Injection',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, []>) {
    /**
     * Findings are held until `Program:exit` so a `require('pg')` anywhere in
     * the file — including below the sink, or inside a function — still hands
     * the site to the driver-specific rule. Deciding at the call site would
     * make the partition depend on statement order.
     */
    const pending: { node: TSESTree.Node; source: string }[] = [];
    let importsSqlDriver = false;

    const noteSpecifier = (specifier: string | null): void => {
      if (specifier !== null && isSqlDriverSpecifier(specifier)) {
        importsSqlDriver = true;
      }
    };

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        noteSpecifier(node.source.value);
      },

      ImportExpression(node: TSESTree.ImportExpression) {
        noteSpecifier(stringLiteralValue(node.source));
      },

      TSImportEqualsDeclaration(node: TSESTree.TSImportEqualsDeclaration) {
        if (
          node.moduleReference.type ===
          AST_NODE_TYPES.TSExternalModuleReference
        ) {
          noteSpecifier(stringLiteralValue(node.moduleReference.expression));
        }
      },

      CallExpression(node: TSESTree.CallExpression) {
        // `require('pg')` — the CommonJS half of the partition test.
        if (
          node.callee.type === AST_NODE_TYPES.Identifier &&
          node.callee.name === 'require'
        ) {
          noteSpecifier(stringLiteralValue(node.arguments[0]));
          return;
        }

        if (node.callee.type !== AST_NODE_TYPES.MemberExpression) return;
        if (node.callee.property.type !== AST_NODE_TYPES.Identifier) return;
        if (!SQL_SINK_METHODS.has(node.callee.property.name)) return;

        const [firstArgument] = node.arguments;
        if (
          firstArgument === undefined ||
          firstArgument.type === AST_NODE_TYPES.SpreadElement
        ) {
          return;
        }

        const scope = context.sourceCode.getScope(node);
        const expression = effectiveExpression(firstArgument, scope);
        if (!isBuiltString(expression)) return;
        if (!looksLikeSqlStatement(expression)) return;

        const source = attributedSource(expression, scope);
        if (source === null) return;

        pending.push({ node, source });
      },

      'Program:exit'() {
        if (importsSqlDriver) return;
        for (const finding of pending) {
          context.report({
            node: finding.node,
            messageId: 'sqlInjection',
            data: { source: finding.source },
          });
        }
      },
    };
  },
});

export default noSqlInjection;
