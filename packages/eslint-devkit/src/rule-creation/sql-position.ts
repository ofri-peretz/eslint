/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Where a hole sits in a SQL string — and so what it takes to report it.
 *
 * A VALUE position (after `=`, `<`, `LIKE`, inside `'…'`, in an `IN (…)` or
 * `VALUES (…)` list, after `LIMIT`) always has a safe alternative: a bind
 * parameter. Any value the file cannot prove fixed is a finding there.
 *
 * A FRAGMENT position (a table or column name, `ORDER BY` / `SAVEPOINT`
 * targets, a whole clause or subquery spliced in) has no bind parameter, so
 * composing it is the only way to build the statement. Query builders,
 * migration helpers and savepoint managers do exactly that with values from
 * their own callers. There a hole is reported when the file can trace it to
 * the inbound request — `ORDER BY ${req.query.sort}` — not merely because it
 * is unproven.
 */
import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '../ast-node-types';
import { staticString } from '../ast/spellings';
import { unwrapTypeSyntax } from '../ast/type-syntax';
import { isRequestPayload } from './request-source';
import { isFunctionNode } from './driver-origin';
import {
  type Env,
  MAX_FOLLOW_DEPTH,
  follow,
  importSpecifierOf,
  lookup,
  returnedValues,
  singleWrite,
  valueAt,
} from './value-follow';

/** One interpolated value, with the SQL text written before it. */
export interface SqlHole {
  readonly expression: TSESTree.Node;
  readonly preceding: string;
}

/**
 * Every value spliced into a template or `+` chain, with the static text in
 * front of it. A ternary or `||` between two string-building arms is walked
 * into, so `${a ? \` AND x = '${v}'\` : ''}` yields `v` with `… AND x = '`.
 */
export function sqlHoles(node: TSESTree.Node, prefix = ''): SqlHole[] {
  const value = unwrapTypeSyntax(node);
  if (value.type === AST_NODE_TYPES.TemplateLiteral) {
    const holes: SqlHole[] = [];
    let text = prefix;
    value.quasis.forEach((quasi, index) => {
      text += quasi.value.raw;
      const expression = value.expressions[index];
      if (expression === undefined) return;
      holes.push(...sqlHoles(expression, text));
      // A literal spliced in is text like any other.
      text += textOf(expression);
    });
    return holes;
  }
  if (
    value.type === AST_NODE_TYPES.BinaryExpression &&
    value.operator === '+'
  ) {
    const left = sqlHoles(value.left, prefix);
    return [...left, ...sqlHoles(value.right, prefix + textOf(value.left))];
  }
  if (
    value.type === AST_NODE_TYPES.ConditionalExpression &&
    buildsText(value)
  ) {
    return [
      ...sqlHoles(value.consequent, prefix),
      ...sqlHoles(value.alternate, prefix),
    ];
  }
  if (
    value.type === AST_NODE_TYPES.LogicalExpression &&
    value.operator !== '&&' &&
    buildsText(value)
  ) {
    return [...sqlHoles(value.left, prefix), ...sqlHoles(value.right, prefix)];
  }
  if (staticString(value) !== null) return [];
  return [{ expression: value, preceding: prefix }];
}

/**
 * Does a ternary or `||` choose between pieces of SQL text — an arm that is a
 * template or a `+` chain? `ALLOWED.includes(x) ? x : 'id'` chooses a value,
 * and is judged whole so the guard stays attached to the arm it guards.
 */
function buildsText(
  node: TSESTree.ConditionalExpression | TSESTree.LogicalExpression,
): boolean {
  const arms =
    node.type === AST_NODE_TYPES.ConditionalExpression
      ? [node.consequent, node.alternate]
      : [node.left, node.right];
  return arms.some((arm) => {
    const value = unwrapTypeSyntax(arm);
    return (
      value.type === AST_NODE_TYPES.TemplateLiteral ||
      (value.type === AST_NODE_TYPES.BinaryExpression &&
        value.operator === '+') ||
      ((value.type === AST_NODE_TYPES.ConditionalExpression ||
        value.type === AST_NODE_TYPES.LogicalExpression) &&
        buildsText(value))
    );
  });
}

/**
 * Is a hole preceded by `text` inside a quoted token — a `'…'` string, or an
 * identifier quote (`` ` ``, `[`, `"`)? An escaper's output carries its own
 * quotes, so there it closes the author's token instead of staying inside it.
 */
export function isQuoted(text: string): boolean {
  const quotes = text.replace(/''/g, '').split("'").length - 1;
  return quotes % 2 === 1 || /[`["]$/.test(text);
}

/** The static text a string expression contributes, holes as nothing. */
function textOf(node: TSESTree.Node): string {
  const value = unwrapTypeSyntax(node);
  if (value.type === AST_NODE_TYPES.TemplateLiteral)
    return value.quasis.map((q) => q.value.raw).join('');
  if (value.type === AST_NODE_TYPES.BinaryExpression && value.operator === '+')
    return textOf(value.left) + textOf(value.right);
  return staticString(value) ?? '';
}

/** Keywords and operators whose operand is a value. */
const VALUE_OPERATOR =
  /(?:[=<>]|!=|\b(?:like|ilike|limit|offset|between|then|else|regexp|glob|match|escape))$/i;

/**
 * Is a hole preceded by `text` in a VALUE position?
 *
 * @param doubleQuotedStrings `"…"` delimits a string (MySQL's default mode)
 *   rather than an identifier (standard SQL, SQLite, PostgreSQL).
 */
export function isValuePosition(
  text: string,
  doubleQuotedStrings = false,
): boolean {
  // A statement whose operands never take a bind parameter.
  if (/^\s*pragma\b/i.test(text)) return false;
  // Inside a single-quoted SQL string literal: an odd count of quotes, with
  // the doubled `''` escape removed first.
  const quotes = text.replace(/''/g, '').split("'").length - 1;
  if (quotes % 2 === 1) return true;
  // Directly inside an identifier quote — `"${col}"`, `` `${col}` ``, `[${col}]`.
  if (/[`[]$/.test(text) || (!doubleQuotedStrings && text.endsWith('"')))
    return false;
  const tail = text.replace(/[\s"%]+$/, '');
  if (VALUE_OPERATOR.test(tail)) return true;
  // In an `IN (…)` / `VALUES (…)` list: the innermost open parenthesis was
  // opened by one of those keywords.
  let depth = 0;
  for (let i = tail.length - 1; i >= 0; i--) {
    const ch = tail[i];
    if (ch === ')') depth++;
    else if (ch === '(') {
      if (depth === 0) return /\b(?:in|values)\s*$/i.test(tail.slice(0, i));
      depth--;
    }
  }
  return false;
}

/**
 * Can this value be traced, in this file, to the inbound request — the
 * payload itself, a field of it, or text derived from one?
 */
export function isRequestDerived(
  node: TSESTree.Node,
  env: Env,
  depth = 0,
): boolean {
  if (depth > MAX_FOLLOW_DEPTH) return false;
  const value = unwrapTypeSyntax(node);
  if (isRequestPayload(value, env)) return true;
  const derived = (next: TSESTree.Node): boolean =>
    isRequestDerived(next, env, depth + 1);
  switch (value.type) {
    case AST_NODE_TYPES.MemberExpression:
      return derived(value.object);
    case AST_NODE_TYPES.TemplateLiteral:
      return value.expressions.some(derived);
    case AST_NODE_TYPES.BinaryExpression:
      return derived(value.left) || derived(value.right);
    case AST_NODE_TYPES.LogicalExpression:
      return derived(value.left) || derived(value.right);
    case AST_NODE_TYPES.ConditionalExpression:
      return derived(value.consequent) || derived(value.alternate);
    case AST_NODE_TYPES.AwaitExpression:
      return derived(value.argument);
    case AST_NODE_TYPES.CallExpression: {
      const callee = value.callee;
      // A method of a value carries that value: `x.trim()`, `ids.join(',')`.
      if (
        callee.type === AST_NODE_TYPES.MemberExpression &&
        derived(callee.object)
      )
        return true;
      // A function builds its result from its arguments — `String(x)`,
      // `Object.keys(req.body)`, `format('%s', x)`, `validator.escape(x)`, a
      // project helper handed `x` — escaping or not; the driver's own
      // escapers are recognised as safe before this is asked. A method of
      // the file's own data does not: `map.get(x)` returns what the map
      // holds, not `x`.
      if (
        !isMethodOfData(callee, env) &&
        value.arguments.some(
          (a) => a.type !== AST_NODE_TYPES.SpreadElement && derived(a),
        )
      ) {
        return true;
      }
      if (callee.type === AST_NODE_TYPES.MemberExpression) return false;
      // `const pick = () => req.body.name; … pick()` — a helper written in
      // this file that returns request data.
      const target = follow(valueAt(callee, env));
      return (
        target.env === env &&
        isFunctionNode(target.node) &&
        (returnedValues(target.node) ?? []).some(derived)
      );
    }
    case AST_NODE_TYPES.Identifier: {
      const variable = lookup(value.name, env.scopeOf(value));
      const def = variable?.defs[0];
      if (variable === null || def?.type !== 'Variable') return false;
      // `const { sort } = req.query` / `for (const c of req.body.cols)`.
      if (def.node.id.type !== AST_NODE_TYPES.Identifier) {
        return def.node.init !== null && derived(def.node.init);
      }
      const loop = def.node.parent.parent;
      if (
        loop?.type === AST_NODE_TYPES.ForOfStatement &&
        loop.left === def.node.parent
      ) {
        return derived(loop.right);
      }
      const written = singleWrite(variable);
      if (written !== null) return derived(written);
      // Written more than once: derived when any write is.
      return variable.references.some(
        (r) => r.isWrite() && r.writeExpr != null && derived(r.writeExpr),
      );
    }
    default:
      return false;
  }
}

/**
 * Is `callee` a method of a value this file holds — `map.get`, `rows.find` —
 * rather than a function: a global (`Object.keys`), or one a module exports
 * (`validator.escape`, `path.join`)?
 */
function isMethodOfData(callee: TSESTree.Node, env: Env): boolean {
  if (callee.type !== AST_NODE_TYPES.MemberExpression) return false;
  let root: TSESTree.Node = callee.object;
  while (root.type === AST_NODE_TYPES.MemberExpression) root = root.object;
  if (root.type !== AST_NODE_TYPES.Identifier) return true;
  const variable = lookup(root.name, env.scopeOf(root));
  return (
    variable !== null &&
    variable.defs.length > 0 &&
    importSpecifierOf(variable) === null
  );
}
