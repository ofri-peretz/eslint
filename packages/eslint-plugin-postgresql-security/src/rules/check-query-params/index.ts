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
import { CheckQueryParamsOptions } from '../../types';
import { fileUsesPostgres } from '../../utils';

/**
 * Methods that hand a statement plus its bound values to the server.
 *
 * Exact membership against a closed API surface, never a substring.
 */
const SQL_SINK_METHODS: ReadonlySet<string> = new Set(['query', 'execute']);

/**
 * Everything in a statement that is NOT executable SQL, in one pass.
 *
 * The order matters and sequential `.replace()` calls get it wrong: a `--`
 * comment can contain an apostrophe, a string constant can contain `--`, and
 * whichever runs first wins. A single alternation is matched leftmost-first, so
 * whichever construct OPENS first consumes the rest of itself, which is exactly
 * how a SQL lexer behaves.
 *
 *   '…'          string constant (with '' escaping)
 *   "…"          quoted identifier — `SELECT "$1"` is a column named `$1`
 *   --…          line comment
 *   /*…*\/       block comment
 *   $tag$…$tag$  dollar-quoted string — a plpgsql body is FULL of `$1`-looking
 *                text that is not a placeholder, and `$$` is not one either
 */
const NON_PLACEHOLDER_TEXT =
  /'(?:[^']|'')*'|"(?:[^"]|"")*"|--[^\n]*|\/\*[\s\S]*?\*\/|\$([A-Za-z_]\w*)?\$[\s\S]*?\$\1\$/g;

/** A bind parameter. Two digits are one placeholder, not `$1` and a zero. */
const PLACEHOLDER = /\$(\d+)/g;

/** How many bindings deep to follow a value before giving up. */
const MAX_RESOLUTION_DEPTH = 4;

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
 * `String.raw` — the one tag that hands the template through unchanged.
 *
 * Tagged templates are unwrapped for this tag ONLY, and that restriction is
 * the whole point. `sql`…`` from postgres.js or slonik binds every
 * interpolation as a parameter, so unwrapping those would report the safest
 * client in the ecosystem; every other tag therefore stays unanalysed.
 * `String.raw` transforms nothing, so the string the server sees is the string
 * written in the source — and the adversarial wave found all three rules in
 * this package silent on it.
 */
function isStringRawTag(node: TSESTree.TaggedTemplateExpression): boolean {
  const { tag } = node;
  return (
    tag.type === AST_NODE_TYPES.MemberExpression &&
    !tag.computed &&
    tag.object.type === AST_NODE_TYPES.Identifier &&
    tag.object.name === 'String' &&
    tag.property.type === AST_NODE_TYPES.Identifier &&
    tag.property.name === 'raw'
  );
}

/** The initialiser of a binding written exactly once. */
function singleAssignedInit(variable: TSESLint.Scope.Variable): TSESTree.Node | null {
  if (variable.references.filter((ref) => ref.isWrite()).length !== 1) return null;
  const def = variable.defs.find((d) => d.type === 'Variable');
  if (def === undefined) return null;
  return (def.node as TSESTree.VariableDeclarator).init ?? null;
}

/**
 * The function a callee name resolves to, when it is written in THIS file.
 * An import binding resolves to nothing — its body is not in this file.
 */
function functionImplementation(
  variable: TSESLint.Scope.Variable,
):
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression
  | TSESTree.ArrowFunctionExpression
  | null {
  const def = variable.defs.find((d) => d.type === 'FunctionName' || d.type === 'Variable');
  if (def === undefined) return null;
  if (def.type === 'FunctionName') {
    return def.node as TSESTree.FunctionDeclaration;
  }
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

/** The single expression a function body evaluates to. */
function returnedExpression(body: TSESTree.Node): TSESTree.Node | null {
  if (body.type === AST_NODE_TYPES.BlockStatement) {
    const [only] = body.body;
    if (body.body.length !== 1 || only.type !== AST_NODE_TYPES.ReturnStatement) {
      return null;
    }
    return only.argument === null ? null : returnedExpression(only.argument);
  }
  return body;
}

/**
 * The expression a sink argument really holds, following one written-once
 * binding or one LOCAL builder at a time.
 *
 * A repository layer keeps its statement in a module constant and a service
 * layer gets it back from a builder. Reading only the literal written at the
 * call site meant every statement in both shapes went uncounted.
 */
function effectiveExpression(
  node: TSESTree.Node,
  scope: TSESLint.Scope.Scope | null,
  depth = 0,
): TSESTree.Node {
  if (depth >= MAX_RESOLUTION_DEPTH) return node;

  if (node.type === AST_NODE_TYPES.TaggedTemplateExpression) {
    return isStringRawTag(node) ? node.quasi : node;
  }

  if (node.type === AST_NODE_TYPES.Identifier) {
    const variable = resolveVariable(node.name, scope);
    const init = variable === null ? null : singleAssignedInit(variable);
    return init === null ? node : effectiveExpression(init, scope, depth + 1);
  }

  if (node.type === AST_NODE_TYPES.CallExpression) {
    if (node.callee.type !== AST_NODE_TYPES.Identifier) return node;
    const fn = resolveVariable(node.callee.name, scope);
    const impl = fn === null ? null : functionImplementation(fn);
    if (impl === null) return node;
    const returned = returnedExpression(impl.body);
    return returned === null ? node : effectiveExpression(returned, scope, depth + 1);
  }

  return node;
}

/**
 * The statement text, when every character of it is knowable.
 *
 * A TemplateLiteral with NO expressions is exactly as analysable as a quoted
 * string, and requiring `Literal` skipped it — which meant the rule could not
 * read multi-line SQL at all, the one form in which a long parameter list is
 * actually written. A template WITH expressions is `null`: an interpolated
 * fragment could contain placeholders of its own, so the count is not knowable
 * and abstaining is the only honest answer.
 */
function knowableText(node: TSESTree.Node): string | null {
  if (node.type === AST_NODE_TYPES.Literal) {
    return typeof node.value === 'string' ? node.value : null;
  }
  if (node.type === AST_NODE_TYPES.TemplateLiteral) {
    if (node.expressions.length > 0) return null;
    // `cooked` is typed non-nullable and this parser never nulls it.
    return node.quasis[0].value.cooked;
  }
  if (node.type === AST_NODE_TYPES.BinaryExpression && node.operator === '+') {
    const left = knowableText(node.left as TSESTree.Node);
    const right = knowableText(node.right);
    return left === null || right === null ? null : left + right;
  }
  return null;
}

/** The highest bind-parameter index the statement references. */
function highestPlaceholder(text: string): number {
  const executable = text.replace(NON_PLACEHOLDER_TEXT, ' ');
  let highest = 0;
  for (const match of executable.matchAll(PLACEHOLDER)) {
    highest = Math.max(highest, Number.parseInt(match[1], 10));
  }
  return highest;
}

/**
 * How many values the array binds, when that is knowable.
 *
 * A `SpreadElement` makes the length depend on runtime data —
 * `[orgId, ...ids]` binds one value plus however many the caller passes — and
 * `rows.map(…)` is not an array literal at all. Both abstain: a count invented
 * from an array whose length the file cannot see is a report on evidence that
 * does not exist.
 */
function knowableValueCount(node: TSESTree.Node, scope: TSESLint.Scope.Scope): number | null {
  const resolved = effectiveExpression(node, scope);
  if (resolved.type !== AST_NODE_TYPES.ArrayExpression) return null;
  if (resolved.elements.some((el) => el !== null && el.type === AST_NODE_TYPES.SpreadElement)) {
    return null;
  }
  return resolved.elements.length;
}

/**
 * The name a property key denotes, for the two spellings that denote one.
 *
 * `{ ['text']: … }` is the same property as `{ text: … }` — a computed key
 * whose expression is a string literal is not dynamic, it is punctuation. This
 * package has shipped a valid-case comment reading "computed key (ignored by
 * rule for now)", which is an evasion any minifier or codegen produces for
 * free.
 */
function propertyName(property: TSESTree.Property): string | null {
  if (property.computed) {
    return property.key.type === AST_NODE_TYPES.Literal &&
      typeof property.key.value === 'string'
      ? property.key.value
      : null;
  }
  if (property.key.type === AST_NODE_TYPES.Identifier) return property.key.name;
  if (property.key.type === AST_NODE_TYPES.Literal && typeof property.key.value === 'string') {
    return property.key.value;
  }
  return null;
}

/** The `text` / `values` pair of a `query({ text, values })` config object. */
function configPair(
  node: TSESTree.ObjectExpression,
): { text: TSESTree.Node; values: TSESTree.Node } | null {
  let text: TSESTree.Node | null = null;
  let values: TSESTree.Node | null = null;
  for (const property of node.properties) {
    if (property.type !== AST_NODE_TYPES.Property) continue;
    const name = propertyName(property);
    if (name === 'text') text = property.value;
    if (name === 'values') values = property.value;
  }
  return text !== null && values !== null ? { text, values } : null;
}

export const checkQueryParams: TSESLint.RuleModule<
  'parameterCountMismatch',
  CheckQueryParamsOptions
> = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Ensure the number of query parameters matches the arguments array.',
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-postgresql-security/docs/rules/check-query-params.md',
      cwe: 'CWE-20',
      cvss: 7.5,
    },
    messages: {
      parameterCountMismatch: formatLLMMessage({
        icon: MessageIcons.QUALITY,
        issueName: 'Parameter Count Mismatch',
        description: 'Query parameter count mismatch detected.',
        severity: 'HIGH',
        cwe: 'CWE-20',
        effort: 'low',
        fix: 'Ensure the number of arguments matches the number of placeholders ($1, $2, etc.).',
        documentationLink: 'https://node-postgres.com/features/queries',
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
     * Report when a knowable statement and a knowable values array disagree.
     *
     * BOTH directions are a hard runtime failure, and only one of them was
     * ever detected. PostgreSQL answers a surplus with "bind message supplies
     * 2 parameters, but prepared statement requires 1" just as loudly as it
     * answers a shortfall — a stale value left behind when a WHERE clause was
     * edited is the ordinary way it happens.
     *
     * The surplus direction needs `highest >= 1` to fire, and that guard is
     * load-bearing rather than cosmetic. A statement with no `$n` in it carries
     * no evidence of a PostgreSQL bind at all, and a service that reads from
     * `pg` and writes to a legacy MySQL replica in the same file has
     * `legacy.query('UPDATE users SET email = ? WHERE id = ?', [email, id])`
     * sitting right there. Counting `$n` against THAT array reports a mismatch
     * that does not exist.
     */
    const check = (
      textNode: TSESTree.Node,
      valuesNode: TSESTree.Node,
      scope: TSESLint.Scope.Scope,
    ): void => {
      const text = knowableText(effectiveExpression(textNode, scope));
      if (text === null) return;

      const provided = knowableValueCount(valuesNode, scope);
      if (provided === null) return;

      const highest = highestPlaceholder(text);
      const mismatched = provided < highest || (highest >= 1 && provided > highest);
      if (!mismatched) return;

      context.report({
        node: valuesNode,
        messageId: 'parameterCountMismatch',
        data: {
          expected: highest.toString(),
          actual: provided.toString(),
        },
      });
    };

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type !== AST_NODE_TYPES.MemberExpression ||
          node.callee.property.type !== AST_NODE_TYPES.Identifier ||
          !SQL_SINK_METHODS.has(node.callee.property.name)
        ) {
          return;
        }

        const [first, second] = node.arguments;
        if (first === undefined || first.type === AST_NODE_TYPES.SpreadElement) return;

        const scope = context.sourceCode.getScope(node);

        // `query({ text, values })` — node-postgres' config-object form, which
        // is how a named/prepared statement has to be written. It was not
        // handled at all, so every mismatch spelled this way was invisible.
        const resolved = effectiveExpression(first, scope);
        if (resolved.type === AST_NODE_TYPES.ObjectExpression) {
          const pair = configPair(resolved);
          if (pair !== null) check(pair.text, pair.values, scope);
          return;
        }

        if (second === undefined || second.type === AST_NODE_TYPES.SpreadElement) return;
        check(first, second, scope);
      },
    };
  },
};
