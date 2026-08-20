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
import { NoBatchInsertLoopOptions } from '../../types';
import { fileUsesPostgres } from '../../utils';

/**
 * Array methods that invoke their callback once per element.
 *
 * Exact membership against a closed API surface — `Array.prototype` — not a
 * substring test. A query inside one of these callbacks is one round trip per
 * element, which is the same defect as a `for` loop with different punctuation.
 */
const ITERATION_METHODS: ReadonlySet<string> = new Set([
  'forEach',
  'filter',
  'reduce',
  'reduceRight',
  'some',
  'every',
  'find',
  'findIndex',
  'findLast',
  'findLastIndex',
]);

/**
 * Callback methods the walk passes THROUGH rather than stopping at.
 *
 * `.then` / `.catch` / `.finally` run their callback once per invocation of the
 * chain, so whether the query is N+1 depends on what encloses the chain. The
 * sequential-reduce idiom —
 * `rows.reduce((chain, row) => chain.then(() => pool.query(...)), Promise.resolve())`
 * — is a real N+1 that is only visible if the walk passes through `.then`.
 *
 * `map` / `flatMap` are here for a different reason. Unlike `forEach`, which
 * throws its callback's return value away, `map` PRODUCES an array of promises,
 * and whoever consumes that array decides the concurrency —
 * `await Promise.all(ids.map((id) => pool.query(...)))` is the shape people
 * write specifically to escape the sequential round trips this rule exists to
 * catch, so reporting it fires on the fix. Treating `map` as transparent rather
 * than special-casing `Promise.all` also survives the indirection
 * (`const pending = ids.map(...); await Promise.all(pending)`), and it keeps
 * reporting a `map` nested inside a real loop, because the walk continues up to
 * that loop instead of stopping. What `map` does NOT excuse — a discarded array
 * of promises — is a floating-promise defect and belongs to `no-floating-query`.
 */
const TRANSPARENT_METHODS: ReadonlySet<string> = new Set([
  'then',
  'catch',
  'finally',
  'map',
  'flatMap',
]);

const LIMIT = /\bLIMIT\b/i;
const OFFSET = /\bOFFSET\b/i;

type IterationContext =
  | { readonly kind: 'loop'; readonly node: TSESTree.Node }
  | { readonly kind: 'method' };

function isLoop(node: TSESTree.Node): boolean {
  return (
    node.type === AST_NODE_TYPES.ForStatement ||
    node.type === AST_NODE_TYPES.ForOfStatement ||
    node.type === AST_NODE_TYPES.ForInStatement ||
    node.type === AST_NODE_TYPES.WhileStatement ||
    node.type === AST_NODE_TYPES.DoWhileStatement
  );
}

function isFunction(node: TSESTree.Node): boolean {
  return (
    node.type === AST_NODE_TYPES.FunctionDeclaration ||
    node.type === AST_NODE_TYPES.FunctionExpression ||
    node.type === AST_NODE_TYPES.ArrowFunctionExpression
  );
}

/**
 * How a function relates to the call that holds it.
 *
 * - `'iife'`  the function IS the callee — it runs exactly once, right here, so
 *   the walk passes straight through it to whatever encloses the IIFE.
 * - a method name — the function is a callback handed to `x.method(fn)`.
 * - `null`    a plain declaration, or a callback whose callee is not a member
 *   call, so nothing here says it is invoked per element.
 *
 * `jobs.push(() => pool.query(...))` and `items.forEach((i) => pool.query(...))`
 * are the same AST shape and opposite facts: `push` STORES the lambda, `forEach`
 * INVOKES it. Reading the method name is what separates them; the previous
 * implementation treated "the parent is a call" as invocation and reported the
 * loop that merely built an array of thunks.
 */
function callbackMethod(fn: TSESTree.Node): string | null {
  const call = fn.parent;
  if (call === undefined || call.type !== AST_NODE_TYPES.CallExpression) return null;
  if (call.callee === fn) return 'iife';
  if (
    call.callee.type !== AST_NODE_TYPES.MemberExpression ||
    call.callee.property.type !== AST_NODE_TYPES.Identifier
  ) {
    return null;
  }
  return call.callee.property.name;
}

/**
 * The nearest construct that makes this call run once per element.
 *
 * Stops at any function that is not an iteration callback: blaming the caller's
 * loop for a query inside a helper is interprocedural, and blaming a lambda's
 * enclosing loop for something that lambda may never run is a lexical accident.
 */
function iterationContext(start: TSESTree.Node): IterationContext | null {
  for (let node: TSESTree.Node | undefined = start.parent; node; node = node.parent) {
    if (isLoop(node)) return { kind: 'loop', node };
    if (!isFunction(node)) continue;

    const method = callbackMethod(node);
    if (method === null) return null;
    if (ITERATION_METHODS.has(method)) return { kind: 'method' };
    if (method !== 'iife' && !TRANSPARENT_METHODS.has(method)) return null;
  }
  return null;
}

/**
 * The statement text, for the pagination check only.
 *
 * No binding hop here on purpose: an unreadable statement falls through to a
 * report, which is the conservative direction for a rule whose evidence is the
 * loop rather than the SQL.
 */
function statementText(node: TSESTree.Node): string | null {
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
        property.key.type === AST_NODE_TYPES.Identifier &&
        !property.computed &&
        property.key.name === 'text',
    );
    return text === undefined ? null : statementText(text.value);
  }
  return null;
}

/**
 * A pagination loop is not an N+1.
 *
 * `while (true) { … LIMIT $1 OFFSET $2 }` issues one statement per PAGE, so its
 * round trips scale with pages and not with rows — the LIMIT is there precisely
 * to bound the result set, and there is nothing to batch. Two signatures:
 * LIMIT with OFFSET is unambiguous pagination whatever the loop; LIMIT alone
 * counts only under `while` / `do…while`, which iterate a condition rather than
 * a collection and so cannot be N+1 over rows in the first place. A keyset page
 * loop (`WHERE id > $1 ORDER BY id LIMIT $2`) is the second form.
 */
function isPagination(text: string | null, context: IterationContext): boolean {
  if (text === null || !LIMIT.test(text)) return false;
  if (OFFSET.test(text)) return true;
  return (
    context.kind === 'loop' &&
    (context.node.type === AST_NODE_TYPES.WhileStatement ||
      context.node.type === AST_NODE_TYPES.DoWhileStatement)
  );
}

export const noBatchInsertLoop: TSESLint.RuleModule<'noBatchInsertLoop', NoBatchInsertLoopOptions> = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent executing database queries within loops (N+1 problem).',
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-postgresql-security/docs/rules/no-batch-insert-loop.md',
      cwe: 'CWE-1049',
      cvss: 7.5,
    },
    messages: {
      noBatchInsertLoop: formatLLMMessage({
        icon: MessageIcons.PERFORMANCE,
        issueName: 'N+1 Query Detection',
        description: 'Database query loop detected.',
        severity: 'HIGH',
        cwe: 'CWE-1049',
        effort: 'medium',
        fix: 'Batch queries using arrays and "UNNEST" or a single batched INSERT.',
        documentationLink: 'https://use-the-index-luke.com/sql/joins/nested-loops-join-n1-problem',
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

        // The statement kind is NOT a filter. The rule used to return unless
        // the SQL contained INSERT or UPDATE, which excluded the N+1 problem by
        // its textbook definition: one parent query, then one SELECT per parent
        // row — the exact shape the rule's own documentation link describes.
        // Worse, the filter only ran when the argument was a plain string, so
        // the identical SELECT written as a template literal reported and the
        // string form did not.
        const iteration = iterationContext(node);
        if (iteration === null) return;

        const [queryArg] = node.arguments;
        if (queryArg !== undefined && isPagination(statementText(queryArg), iteration)) return;

        context.report({ node, messageId: 'noBatchInsertLoop' });
      },
    };
  },
};
