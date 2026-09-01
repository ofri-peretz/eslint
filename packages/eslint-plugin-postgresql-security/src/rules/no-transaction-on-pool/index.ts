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
  resolveModuleBinding,
  staticString,
  objectKeyName,
} from '@interlace/eslint-devkit';
import { NoTransactionOnPoolOptions } from '../../types';
import { fileUsesPostgres, PG_MODULES } from '../../utils';

const PG_MODULE_SET: ReadonlySet<string> = new Set(PG_MODULES);

/**
 * Statements that open, close or checkpoint a transaction.
 *
 * `START TRANSACTION` is the SQL-standard spelling of `BEGIN` and `END` is a
 * synonym for `COMMIT`; both were missing, and both break in exactly the same
 * way on a pool. Matched on the leading keyword of the statement, so `SELECT …
 * WHERE marker = 'BEGIN'` is data rather than a transaction.
 */
const TRANSACTION_STATEMENTS: readonly RegExp[] = [
  /^begin\b/i,
  /^start\s+transaction\b/i,
  /^commit\b/i,
  /^end\b/i,
  /^rollback\b/i,
  /^savepoint\b/i,
  /^release\s+savepoint\b/i,
];

/**
 * Is this callee a pg **Pool** constructor?
 *
 * `Client` is deliberately not one: a dedicated client is a single connection by
 * construction, so a transaction on it is correct. The whole defect is that a
 * POOL hands out a different connection per query.
 */
function isPgPoolConstructor(
  callee: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
): boolean {
  const binding = resolveModuleBinding(callee, scope);
  if (binding === undefined) return false;
  const parts = binding.module.split('/');
  const root = binding.module.startsWith('@')
    ? parts.slice(0, 2).join('/')
    : parts[0];
  if (!PG_MODULE_SET.has(root)) return false;
  const [exported] = binding.path;
  // `const Pool = require('pg-pool')` — the module itself is the constructor.
  return exported === undefined || exported === 'Pool';
}

/** The statement text of a query argument, when it is written as a plain string. */
function statementText(node: TSESTree.Node): string | null {
  // Both spellings, in one call. A template literal with no interpolation is a
  // plain string and multi-line SQL arrives that way constantly, so
  // `pool.query(`BEGIN`)` was once silent here; the arm that fixed it is now
  // inside `staticString`, where every rule gets it rather than this one.
  const staticText = staticString(node);
  if (staticText !== null) {
    return staticText.trim();
  }
  // node-postgres also takes a config object: `pool.query({ text, values })`.
  // Found by the adversarial wave — it is the same call written the other
  // documented way, and it went straight past a rule that only read a string.
  if (node.type === AST_NODE_TYPES.ObjectExpression) {
    // `objectKeyName` rather than an Identifier/Literal pair: `{ text }`,
    // `{ 'text': … }`, `{ ['text']: … }` and `` { [`text`]: … } `` all declare
    // the same property, and hand-rolling the check caught two of the four.
    const text = node.properties.find(
      (prop): prop is TSESTree.Property =>
        prop.type === AST_NODE_TYPES.Property && objectKeyName(prop) === 'text',
    );
    return text === undefined ? null : statementText(text.value);
  }
  return null;
}

/** Whether a statement opens, closes or checkpoints a transaction. */
function isTransactionStatement(text: string): boolean {
  return TRANSACTION_STATEMENTS.some((pattern) => pattern.test(text));
}

export const noTransactionOnPool: TSESLint.RuleModule<
  'noTransactionOnPool',
  NoTransactionOnPoolOptions
> = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Prevent starting transactions directly on the Pool, which is unsafe due to lack of client affinity.',
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-postgresql-security/docs/rules/no-transaction-on-pool.md',
      cwe: 'CWE-662',
      cweJustification:
        'CWE-662 (Improper Synchronization) — running BEGIN/COMMIT on a connection pool can split a logical transaction across different physical clients, breaking ACID atomicity.',
      confidence: 'high',
    },
    messages: {
      noTransactionOnPool: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Transaction on Pool',
        description: 'Transactions should not be started on the Pool directly.',
        severity: 'HIGH',
        effort: 'low',
        fix: 'Use "await pool.connect()" to get a client, then start the transaction on the client.',
        documentationLink: 'https://node-postgres.com/features/transactions',
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
     * Properties of `this` that were assigned a pg Pool in this file.
     *
     * `this.pool = new Pool()` in a constructor and `this.pool.query('BEGIN')`
     * in a method is the ordinary repository shape, and the receiver there is a
     * MemberExpression — which the rule skipped entirely, because it only ever
     * looked at a bare identifier.
     */
    const poolProperties = new Set<string>();

    /**
     * Does this receiver resolve to a pg **Pool**?
     *
     * The rule used to answer this with
     * `objectName.toLowerCase().includes('pool')`. That is a spelling, not a
     * fact, and it was wrong in both directions at once. It reported
     * `poolClient.query('BEGIN')` — a correctly checked-out CLIENT running a
     * correct transaction — and `carpoolClient.query('BEGIN')`, a ride-sharing
     * API that shares four letters with a connection pool. Meanwhile a real
     * Pool bound to `db` was invisible.
     *
     * What decides it is what the binding was assigned: `new Pool()` from a pg
     * package is a pool; `await pool.connect()` and `new Client()` are single
     * connections and correct.
     */
    const isPool = (
      receiver: TSESTree.Node,
      scope: TSESLint.Scope.Scope,
    ): boolean => {
      if (
        receiver.type === AST_NODE_TYPES.MemberExpression &&
        receiver.object.type === AST_NODE_TYPES.ThisExpression &&
        !receiver.computed &&
        receiver.property.type === AST_NODE_TYPES.Identifier
      ) {
        return poolProperties.has(receiver.property.name);
      }

      if (receiver.type !== AST_NODE_TYPES.Identifier) return false;

      for (
        let current: TSESLint.Scope.Scope | null = scope;
        current;
        current = current.upper
      ) {
        const variable = current.set.get(receiver.name);
        if (variable === undefined) continue;
        // A handle reassigned somewhere else may hold a different connection by
        // the time it is used.
        if (variable.references.filter((ref) => ref.isWrite()).length !== 1)
          return false;
        const def = variable.defs.find((d) => d.type === 'Variable');
        const init =
          def === undefined
            ? null
            : (def.node as TSESTree.VariableDeclarator).init;
        if (init == null || init.type !== AST_NODE_TYPES.NewExpression)
          return false;
        return isPgPoolConstructor(init.callee, scope);
      }
      return false;
    };

    return {
      // `this.pool = new Pool()` — record the property, so a method calling
      // `this.pool.query('BEGIN')` is judged on what was actually assigned.
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        if (
          node.operator !== '=' ||
          node.left.type !== AST_NODE_TYPES.MemberExpression ||
          node.left.object.type !== AST_NODE_TYPES.ThisExpression ||
          node.left.computed ||
          node.left.property.type !== AST_NODE_TYPES.Identifier ||
          node.right.type !== AST_NODE_TYPES.NewExpression
        ) {
          return;
        }
        if (
          isPgPoolConstructor(
            node.right.callee,
            context.sourceCode.getScope(node),
          )
        ) {
          poolProperties.add(node.left.property.name);
        }
      },

      // `pool = new Pool()` as a class property definition.
      PropertyDefinition(node: TSESTree.PropertyDefinition) {
        if (
          node.computed ||
          node.key.type !== AST_NODE_TYPES.Identifier ||
          node.value == null ||
          node.value.type !== AST_NODE_TYPES.NewExpression
        ) {
          return;
        }
        if (
          isPgPoolConstructor(
            node.value.callee,
            context.sourceCode.getScope(node),
          )
        ) {
          poolProperties.add(node.key.name);
        }
      },

      'CallExpression:exit'(node: TSESTree.CallExpression) {
        if (
          node.callee.type !== AST_NODE_TYPES.MemberExpression ||
          node.callee.property.type !== AST_NODE_TYPES.Identifier ||
          node.callee.property.name !== 'query'
        ) {
          return;
        }

        const [queryArg] = node.arguments;
        if (queryArg === undefined) return;

        const text = statementText(queryArg);
        if (text === null || !isTransactionStatement(text)) return;

        if (isPool(node.callee.object, context.sourceCode.getScope(node))) {
          context.report({ node: queryArg, messageId: 'noTransactionOnPool' });
        }
      },
    };
  },
};
