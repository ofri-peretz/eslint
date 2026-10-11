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
  namesOneOf,
  memberPropertyName,
  propertyName,
} from '@interlace/eslint-devkit';
import { NoTransactionOnPoolOptions } from '../../types';
import { usesPostgres, PG_MODULES } from '../../utils';
import { isDeclaredPgPool, isPgPoolType } from '../../utils/pool-receiver';
import { envOf, follow, type Env } from '../../utils/cross-file';

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

/**
 * Does the receiver RESOLVE to a pg Pool — `new Pool()`, or a declaration typed
 * as pg's `Pool` — following bindings in this file and relative imports into
 * the module that creates it? `import { pool } from './db'` is a Pool only if
 * `./db` says so; a `new Client()` exported the same way is a single
 * connection, where a transaction is correct.
 */
function resolvesToPool(
  receiver: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
  env: Env,
): boolean {
  const value = follow({ node: receiver, scope, env });
  if (value.node.type === AST_NODE_TYPES.NewExpression) {
    return isPgPoolConstructor(value.node.callee, value.scope);
  }
  const declarator = value.node.parent;
  return (
    declarator?.type === AST_NODE_TYPES.VariableDeclarator &&
    declarator.id.type === AST_NODE_TYPES.Identifier &&
    isPgPoolType(declarator.id.typeAnnotation, value.scope)
  );
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
    const text = node.properties.find(
      (prop): prop is TSESTree.Property =>
        prop.type === AST_NODE_TYPES.Property &&
        ((prop.key.type === AST_NODE_TYPES.Identifier &&
          !prop.computed &&
          prop.key.name === 'text') ||
          (prop.key.type === AST_NODE_TYPES.Literal &&
            prop.key.value === 'text')),
    );
    return text === undefined ? null : statementText(text.value);
  }
  return null;
}

/** Whether a statement opens, closes or checkpoints a transaction. */
function isTransactionStatement(text: string): boolean {
  return TRANSACTION_STATEMENTS.some((pattern) => pattern.test(text));
}

/**
 * Is the whole transaction in this one string — `BEGIN; …; COMMIT`?
 *
 * A single simple-protocol query runs on ONE connection, atomically; there is
 * nothing for the pool to split.
 */
function isSelfContainedTransaction(text: string): boolean {
  const statements = text
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement !== '');
  return (
    statements.length > 1 &&
    /^(?:begin|start\s+transaction)\b/i.test(statements[0]) &&
    /^(?:commit|end|rollback)\b/i.test(statements[statements.length - 1])
  );
}

/**
 * Does this file check a client out of `receiver` and keep it —
 * `const c = await receiver.connect()`? A pg `Client#connect` resolves to
 * nothing, so a kept checkout is a Pool's.
 */
function handsOutClients(
  receiver: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
): boolean {
  if (receiver.type !== AST_NODE_TYPES.Identifier) return false;
  for (
    let current: TSESLint.Scope.Scope | null = scope;
    current;
    current = current.upper
  ) {
    const variable = current.set.get(receiver.name);
    if (variable === undefined) continue;
    return variable.references.some((ref) => {
      const member = ref.identifier.parent;
      const call = member?.parent;
      const kept =
        call?.parent?.type === AST_NODE_TYPES.AwaitExpression
          ? call.parent.parent
          : undefined;
      return (
        member?.type === AST_NODE_TYPES.MemberExpression &&
        propertyName(member) === 'connect' &&
        call?.type === AST_NODE_TYPES.CallExpression &&
        kept?.type === AST_NODE_TYPES.VariableDeclarator
      );
    });
  }
  return false;
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
    if (!usesPostgres(context)) return {};

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
        propertyName(receiver) !== null
      ) {
        // `this['pool'].query(…)` is the same pool `this.pool` names.
        return namesOneOf(propertyName(receiver), poolProperties);
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
        // Resolved before the guard: the guard already asks whether the field
        // is nameable, so the assignment below reads that answer instead of
        // casting a second call past the same question.
        const field = memberPropertyName(node.left);
        if (
          node.operator !== '=' ||
          node.left.type !== AST_NODE_TYPES.MemberExpression ||
          node.left.object.type !== AST_NODE_TYPES.ThisExpression ||
          field === null ||
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
          // `this['pool'] = new Pool()` binds the same field.
          poolProperties.add(field);
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
          // `db['query']('BEGIN')` runs the same statement.
          propertyName(node.callee) !== 'query'
        ) {
          return;
        }

        const [queryArg] = node.arguments;
        if (queryArg === undefined) return;

        const text = statementText(queryArg);
        if (text === null || !isTransactionStatement(text)) return;
        if (isSelfContainedTransaction(text)) return;

        const scope = context.sourceCode.getScope(node);
        const receiver = node.callee.object;
        if (
          isPool(receiver, scope) ||
          isDeclaredPgPool(receiver, scope) ||
          handsOutClients(receiver, scope) ||
          resolvesToPool(receiver, scope, envOf(context))
        ) {
          context.report({ node: queryArg, messageId: 'noTransactionOnPool' });
        }
      },
    };
  },
};
