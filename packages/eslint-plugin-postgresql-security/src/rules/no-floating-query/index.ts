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
import { NoFloatingQueryOptions } from '../../types';
import { fileUsesPostgres } from '../../utils';

/**
 * Positions that pass the promise straight through without consuming it.
 *
 * `ChainExpression` is optional chaining: `this.db?.query(...)` wraps the call,
 * so the call's parent is no longer the ExpressionStatement and the whole
 * detection missed it.
 *
 * The other three are CONTROL FLOW, not value consumption. In statement
 * position, `dirty && pool.query(...)` is `if (dirty) pool.query(...)` with
 * different punctuation, `ok ? pool.query(a) : pool.query(b)` is an if/else,
 * and `(other(), pool.query(x))` throws its own value away. All three were
 * treated as "handled" and all three float. In a value position they stay
 * transparent and the enclosing position decides, so `const x = cond ?
 * pool.query(a) : pool.query(b)` is still fine.
 */
const TRANSPARENT_POSITIONS: ReadonlySet<string> = new Set([
  AST_NODE_TYPES.ChainExpression,
  AST_NODE_TYPES.SequenceExpression,
  AST_NODE_TYPES.LogicalExpression,
  AST_NODE_TYPES.ConditionalExpression,
]);

interface Chain {
  /** The outermost expression of the promise chain. */
  readonly root: TSESTree.Node;
  /** Whether some link in the chain installs a rejection handler. */
  readonly rejectionHandled: boolean;
}

/**
 * Walk `.then(...)` / `.catch(...)` / `.finally(...)` to the end of the chain,
 * noting whether anything along it can absorb a rejection.
 *
 * A one-argument `.then(onFulfilled)` is NOT a rejection handler — it covers
 * the success path and leaves the failure path as an unhandled rejection — and
 * `.finally()` is transparent by specification: it re-throws whatever it was
 * handed. Both were silently accepted because the rule returned on any
 * MemberExpression parent, so `pool.query(sql).then(cache.set)` and
 * `pool.query(sql).finally(done)` were invisible.
 */
function promiseChain(node: TSESTree.Node): Chain {
  let current: TSESTree.Node = node;
  let rejectionHandled = false;

  for (;;) {
    const member = current.parent;
    if (
      member === undefined ||
      member.type !== AST_NODE_TYPES.MemberExpression ||
      member.object !== current ||
      member.property.type !== AST_NODE_TYPES.Identifier
    ) {
      break;
    }
    const call = member.parent;
    if (call === undefined || call.type !== AST_NODE_TYPES.CallExpression || call.callee !== member) {
      break;
    }
    const method = member.property.name;
    if (method === 'catch' || (method === 'then' && call.arguments.length >= 2)) {
      rejectionHandled = true;
    }
    current = call;
  }

  return { root: current, rejectionHandled };
}

/**
 * Whether any binding reference reads the value.
 *
 * `const pending = pool.query(...)` only handles the promise if something later
 * awaits or chains `pending`. When nothing does, the assignment is decoration
 * and the promise floats exactly as if it were not there — but the rule
 * returned on every VariableDeclarator and every AssignmentExpression, so the
 * shape was a guaranteed miss.
 */
function isRead(variable: TSESLint.Scope.Variable | undefined): boolean {
  return variable !== undefined && variable.references.some((ref) => ref.isRead());
}

function lookup(
  scope: TSESLint.Scope.Scope,
  name: string,
): TSESLint.Scope.Variable | undefined {
  for (let current: TSESLint.Scope.Scope | null = scope; current; current = current.upper) {
    const variable = current.set.get(name);
    if (variable !== undefined) return variable;
  }
  return undefined;
}

export const noFloatingQuery: TSESLint.RuleModule<'noFloatingQuery', NoFloatingQueryOptions> = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Ensure all queries are awaited or returned to prevent unhandled promise rejections.',
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-postgresql-security/docs/rules/no-floating-query.md',
      cwe: 'CWE-391',
      cvss: 5.3,
    },
    messages: {
      noFloatingQuery: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Floating Query',
        description: 'Promise-returning query is neither awaited nor returned.',
        severity: 'HIGH',
        cwe: 'CWE-391',
        effort: 'low',
        fix: 'Add "await" or "return" to handle the query promise.',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise',
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

        const { root, rejectionHandled } = promiseChain(node);

        // Where the chain's value ends up. Control-flow wrappers pass through;
        // whatever sits above them is what decides ownership. Every expression
        // has a parent and `Program` is never transparent, so the walk always
        // lands on a real node.
        let owner = root.parent as TSESTree.Node;
        while (TRANSPARENT_POSITIONS.has(owner.type)) {
          owner = owner.parent as TSESTree.Node;
        }

        if (owner.type === AST_NODE_TYPES.VariableDeclarator) {
          if (owner.id.type !== AST_NODE_TYPES.Identifier) return;
          const [variable] = context.sourceCode.getDeclaredVariables(owner);
          if (isRead(variable)) return;
          context.report({ node, messageId: 'noFloatingQuery' });
          return;
        }

        if (
          owner.type === AST_NODE_TYPES.AssignmentExpression &&
          owner.left.type === AST_NODE_TYPES.Identifier
        ) {
          if (isRead(lookup(context.sourceCode.getScope(node), owner.left.name))) return;
          context.report({ node, messageId: 'noFloatingQuery' });
          return;
        }

        // Every other position — an argument, an array element, a property
        // value, a return, an await, a yield, `void`, an arrow body — hands the
        // promise to something that can own it. Only a bare statement discards
        // it outright.
        if (owner.type !== AST_NODE_TYPES.ExpressionStatement || rejectionHandled) return;

        context.report({ node, messageId: 'noFloatingQuery' });
      },
    };
  },
};
