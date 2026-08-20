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
} from '@interlace/eslint-devkit';
import { NoSelectAllOptions } from '../../types';
import { fileUsesPostgres } from '../../utils';

/**
 * The select-list star, in the two spellings Postgres accepts.
 *
 * `SELECT *` and `SELECT u.*` are the same defect: the column set is decided by
 * the schema rather than by the query, so a migration silently changes what
 * crosses the wire. The qualified form is the one that shows up in joins, and
 * a detector that only knows the bare star misses every `SELECT u.*, o.id`.
 *
 * `DISTINCT ON (...)` has to be consumed explicitly — it sits between the
 * keyword and the star and would otherwise break the match.
 */
const SELECT_PREFIX = String.raw`SELECT\s+(?:ALL\s+|DISTINCT\s+(?:ON\s*\([^)]*\)\s*)?)?`;
const SELECT_STAR = new RegExp(String.raw`\b${SELECT_PREFIX}(?:[A-Za-z_][\w$]*\s*\.\s*)?\*`, 'i');
/**
 * `SELECT a, *` / `SELECT o.id, u.*` — the star after the first column.
 *
 * Guarded by a `SELECT` appearing earlier in the statement, because `INSERT
 * INTO t VALUES (1, *)` is not a select list. After literals and comments are
 * stripped a bare `*` immediately after a comma cannot be multiplication:
 * multiplication needs a left operand.
 */
const COMMA_STAR = new RegExp(String.raw`,\s*(?:[A-Za-z_][\w$]*\s*\.\s*)?\*`);
const SELECT_KEYWORD = /\bSELECT\b/i;

/**
 * `EXISTS (SELECT * ...)` — not a finding.
 *
 * Postgres documents that the select list of an EXISTS subquery is never
 * evaluated: `SELECT *`, `SELECT 1` and `SELECT 1/0` all produce the same plan.
 * No column is fetched, so there is nothing to make explicit, and `EXISTS
 * (SELECT *)` is common enough that reporting it is pure noise.
 */
const EXISTS_STAR = new RegExp(String.raw`\bEXISTS\s*\(\s*${SELECT_PREFIX}\*`, 'gi');

/**
 * `SELECT * FROM unnest($1::int[], $2::text[])` and its relatives.
 *
 * The star ranges over a set-returning FUNCTION whose output columns are fixed
 * by the call — an `AS x(id int, name text)` definition list, or the function's
 * own signature. Schema drift cannot reach it. This generalises what used to be
 * a hard-coded `unnest` exception: `json_to_recordset`, `jsonb_to_recordset`,
 * `generate_series` and `regexp_split_to_table` are the same shape, and the
 * `unnest` form is the batch-insert remediation this plugin recommends
 * elsewhere.
 */
const SELECT_STAR_FROM_FUNCTION = new RegExp(
  String.raw`\b${SELECT_PREFIX}\*\s+FROM\s+[A-Za-z_][\w$]*\s*\(`,
  'gi',
);

/**
 * Strip everything in a SQL string that is not the statement: `--` line
 * comments, `/* *\/` block comments, single-quoted literals, double-quoted
 * identifiers and dollar-quoted bodies.
 *
 * Written as a scanner rather than a chain of replaces because the naive order
 * is wrong in both directions — a quote inside a comment breaks literal
 * stripping, and a `--` inside a literal breaks comment stripping. Three of the
 * corpus's safe fixtures are exactly those two cases: a star left behind in a
 * `--` comment by the migration that removed it, a star in a block comment
 * explaining why the columns are listed by hand, and an audit query that
 * searches FOR the text `'SELECT * FROM users'`.
 *
 * `$1` placeholders are not dollar quotes: a dollar tag is `$$` or
 * `$name$`, never `$` followed by a digit.
 */
function stripSqlNoise(sql: string): string {
  let out = '';
  let index = 0;
  while (index < sql.length) {
    const rest = sql.slice(index);
    if (rest.startsWith('--')) {
      const newline = sql.indexOf('\n', index);
      out += ' ';
      index = newline === -1 ? sql.length : newline;
      continue;
    }
    if (rest.startsWith('/*')) {
      const end = sql.indexOf('*/', index + 2);
      out += ' ';
      index = end === -1 ? sql.length : end + 2;
      continue;
    }
    const dollarTag = /^\$[A-Za-z_]\w*\$|^\$\$/.exec(rest);
    if (dollarTag !== null) {
      const tag = dollarTag[0];
      const end = sql.indexOf(tag, index + tag.length);
      out += ' ';
      index = end === -1 ? sql.length : end + tag.length;
      continue;
    }
    const char = sql[index];
    if (char === "'" || char === '"') {
      index += 1;
      while (index < sql.length) {
        if (sql[index] !== char) {
          index += 1;
          continue;
        }
        // `''` is an escaped quote inside the literal, not the end of it.
        if (sql[index + 1] === char) {
          index += 2;
          continue;
        }
        index += 1;
        break;
      }
      out += ' ';
      continue;
    }
    out += char;
    index += 1;
  }
  return out;
}

/** Whether a normalised statement selects an implicit column set. */
function selectsEveryColumn(sql: string): boolean {
  const cleaned = stripSqlNoise(sql)
    .replace(EXISTS_STAR, 'EXISTS ( SELECT 1')
    .replace(SELECT_STAR_FROM_FUNCTION, 'SELECT 1 FROM f(');

  if (SELECT_STAR.test(cleaned)) return true;

  const comma = COMMA_STAR.exec(cleaned);
  // A star after a comma is only a select list if a SELECT opened one. Without
  // this, `INSERT INTO foo VALUES (1, *)` reports.
  return comma !== null && SELECT_KEYWORD.test(cleaned.slice(0, comma.index));
}

/**
 * The SQL a query argument carries, in every form node-postgres accepts.
 *
 * A rule that reads only `Literal` sees a fraction of real code. Multi-line SQL
 * is written as a template literal; `query({ text, values })` is the documented
 * config form; and a repository hoists its statements to module constants. All
 * three were invisible.
 *
 * Interpolated expressions are replaced by a neutral token rather than dropped,
 * so `SELECT ${columns} FROM t` does not collapse into `SELECT FROM t` and read
 * as a star.
 */
function queryText(node: TSESTree.Node, scope: TSESLint.Scope.Scope): string | null {
  if (node.type === AST_NODE_TYPES.Literal) {
    return typeof node.value === 'string' ? node.value : null;
  }
  if (node.type === AST_NODE_TYPES.TemplateLiteral) {
    return node.quasis.map((quasi) => quasi.value.cooked).join(' 1 ');
  }
  if (node.type === AST_NODE_TYPES.ObjectExpression) {
    const text = node.properties.find(
      (property): property is TSESTree.Property =>
        property.type === AST_NODE_TYPES.Property &&
        ((property.key.type === AST_NODE_TYPES.Identifier &&
          !property.computed &&
          property.key.name === 'text') ||
          (property.key.type === AST_NODE_TYPES.Literal && property.key.value === 'text')),
    );
    return text === undefined ? null : queryText(text.value, scope);
  }
  if (node.type === AST_NODE_TYPES.Identifier) {
    return bindingText(node, scope);
  }
  return null;
}

/**
 * One binding hop: `const FIND = 'SELECT * …'` then `pool.query(FIND, …)`.
 *
 * Only a binding written exactly once is read — anything reassigned may hold
 * something else by the time it reaches the driver, and guessing would be
 * reporting on evidence the file does not have.
 */
function bindingText(node: TSESTree.Identifier, scope: TSESLint.Scope.Scope): string | null {
  for (let current: TSESLint.Scope.Scope | null = scope; current; current = current.upper) {
    const variable = current.set.get(node.name);
    if (variable === undefined) continue;
    if (variable.references.filter((ref) => ref.isWrite()).length !== 1) return null;
    const def = variable.defs.find((d) => d.type === 'Variable');
    if (def === undefined) return null;
    const init = (def.node as TSESTree.VariableDeclarator).init;
    if (init == null || init.type === AST_NODE_TYPES.Identifier) return null;
    return queryText(init, scope);
  }
  return null;
}

export const noSelectAll: TSESLint.RuleModule<'noSelectAll', NoSelectAllOptions> = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent using * in SELECT statements (implicit columns).',
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-postgresql-security/docs/rules/no-select-all.md',
      cwe: 'CWE-1049',
      cvss: 5,
    },
    messages: {
      noSelectAll: formatLLMMessage({
        icon: MessageIcons.PERFORMANCE,
        issueName: 'Select All',
        description: 'Avoid using "SELECT *" which fetches all columns.',
        severity: 'MEDIUM',
        cwe: 'CWE-1049',
        effort: 'low',
        fix: 'Explicitly list the columns you need (e.g., SELECT id, name FROM ...).',
        documentationLink:
          'https://wiki.postgresql.org/wiki/Don%27t_Do_This#Don.27t_use_SELECT_.2A',
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

    return {
      CallExpression(node) {
        if (
          node.callee.type !== AST_NODE_TYPES.MemberExpression ||
          node.callee.property.type !== AST_NODE_TYPES.Identifier ||
          node.callee.property.name !== 'query'
        ) {
          return;
        }

        const [queryArg] = node.arguments;
        if (queryArg === undefined) return;

        const text = queryText(queryArg, context.sourceCode.getScope(node));
        if (text === null || !selectsEveryColumn(text)) return;

        context.report({ node: queryArg, messageId: 'noSelectAll' });
      },
    };
  },
};
