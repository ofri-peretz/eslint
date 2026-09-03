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
import { PreferPoolQueryOptions } from '../../types';
import { fileUsesPostgres } from '../../utils';

/**
 * Statements whose effect belongs to the CONNECTION, not to the statement.
 *
 * Every one of these is a reason a client was checked out on purpose, and
 * telling the user to move it to `pool.query()` is telling them to break it:
 *
 * - `BEGIN` / `COMMIT` / `ROLLBACK` / `SAVEPOINT` — the transaction is the
 *   connection. This is the single most important quiet case; a rule that
 *   reports it contradicts `no-transaction-on-pool` in the same plugin.
 * - `SET` / `RESET` / `DISCARD` — session GUCs live and die with the backend.
 * - `LISTEN` / `UNLISTEN` — the subscription is registered on the backend, and
 *   through a pool it is delivered to an arbitrary one and then lost.
 * - `DECLARE` / `FETCH` / `MOVE` / `CLOSE` — a cursor is bound to its
 *   connection.
 * - `PREPARE` / `EXECUTE` / `DEALLOCATE` — prepared statements are per-session.
 * - `COPY` — the stream rides the connection.
 * - `LOCK` — a table lock outside a transaction block is meaningless anyway,
 *   and inside one it is the transaction's connection that holds it.
 *
 * Matched on the leading keyword of the statement, so `SELECT … WHERE kind =
 * 'SET'` is data rather than a session change.
 */
const SESSION_STATEMENTS: readonly RegExp[] = [
  /^begin\b/i,
  /^start\s+transaction\b/i,
  /^commit\b/i,
  /^end\b/i,
  /^rollback\b/i,
  /^savepoint\b/i,
  /^release\s+savepoint\b/i,
  /^set\b/i,
  /^reset\b/i,
  /^discard\b/i,
  /^listen\b/i,
  /^unlisten\b/i,
  /^notify\b/i,
  /^declare\b/i,
  /^fetch\b/i,
  /^move\b/i,
  /^close\b/i,
  /^copy\b/i,
  /^prepare\b/i,
  /^execute\b/i,
  /^deallocate\b/i,
  /^lock\b/i,
];

/**
 * Session-scoped advisory locks, which are ordinary `SELECT`s and so are
 * invisible to a leading-keyword test.
 *
 * `pg_advisory_lock` and its family are held by the BACKEND until explicitly
 * released. Taken through a pool, the lock is released the moment an unrelated
 * request is handed that connection — or never, because the holder went back
 * into the pool. `pg_export_snapshot` has the same connection affinity.
 */
const SESSION_FUNCTIONS = /\bpg_(?:try_)?advisory_(?:xact_)?(?:un)?lock\w*\s*\(|\bpg_export_snapshot\s*\(/i;

/** Whether a statement needs the connection it runs on to be the same one. */
function needsSessionAffinity(text: string): boolean {
  const trimmed = text.trim();
  return SESSION_STATEMENTS.some((pattern) => pattern.test(trimmed)) || SESSION_FUNCTIONS.test(trimmed);
}

/**
 * The SQL a query argument carries: a plain string, a template literal, or
 * node-postgres' `{ text, values }` config object.
 *
 * `null` means "this file does not say what statement runs", and the rule
 * abstains on it. That is deliberate: a `client.query(new Cursor(...))` and a
 * `client.query(copyFrom(...))` are not statements at all — they are stream and
 * cursor handles bound to that connection, and `pool.query()` has nowhere to
 * put them. Failing to report a single-shot checkout costs a nudge; reporting a
 * cursor tells the user to write code that cannot work.
 */
function statementText(node: TSESTree.Node): string | null {
  if (node.type === AST_NODE_TYPES.Literal) {
    return typeof node.value === 'string' ? node.value : null;
  }
  if (node.type === AST_NODE_TYPES.TemplateLiteral) {
    return node.quasis.map((quasi) => quasi.value.cooked!).join(' 1 ');
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

function isFunctionOrProgram(node: TSESTree.Node): boolean {
  return (
    node.type === AST_NODE_TYPES.FunctionDeclaration ||
    node.type === AST_NODE_TYPES.FunctionExpression ||
    node.type === AST_NODE_TYPES.ArrowFunctionExpression ||
    node.type === AST_NODE_TYPES.Program
  );
}

function isLoop(node: TSESTree.Node): boolean {
  return (
    node.type === AST_NODE_TYPES.ForStatement ||
    node.type === AST_NODE_TYPES.ForOfStatement ||
    node.type === AST_NODE_TYPES.ForInStatement ||
    node.type === AST_NODE_TYPES.WhileStatement ||
    node.type === AST_NODE_TYPES.DoWhileStatement
  );
}

/** The function (or Program) a node belongs to. */
function owningScopeNode(node: TSESTree.Node): TSESTree.Node {
  let current: TSESTree.Node = node;
  while (!isFunctionOrProgram(current)) {
    // A Program always terminates this walk, so `parent` is defined here.
    current = current.parent as TSESTree.Node;
  }
  return current;
}

/**
 * Whether a query call runs exactly once per checkout.
 *
 * The old implementation counted SYNTACTIC call sites, which is a different
 * quantity. Reusing one checked-out client across a loop is the entire reason
 * `pool.connect()` exists — it avoids re-acquiring a pool slot per iteration —
 * and it has exactly one `client.query(...)` in the source. The rule reported
 * it, which is advice to make the code worse. The same counting bug reaches the
 * `rows.map((row) => client.query(...))` form.
 */
function runsExactlyOnce(call: TSESTree.Node, declarator: TSESTree.Node): boolean {
  const owner = owningScopeNode(declarator);
  for (let node: TSESTree.Node | undefined = call.parent; node && node !== owner; node = node.parent) {
    if (isLoop(node) || isFunctionOrProgram(node)) return false;
  }
  return true;
}

export const preferPoolQuery: TSESLint.RuleModule<'preferPoolQuery', PreferPoolQueryOptions> = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Prefer pool.query() over client.query() for single-shot queries.',
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-postgresql-security/docs/rules/prefer-pool-query.md',
    },
    messages: {
      preferPoolQuery: formatLLMMessage({
        icon: MessageIcons.PERFORMANCE,
        issueName: 'Prefer Pool Query',
        description: 'Single-shot queries should use pool.query() directly.',
        severity: 'MEDIUM',
        cwe: 'CWE-400',
        effort: 'low',
        fix: 'Use pool.query(...) instead of manual client checkout/release for simple queries.',
        documentationLink: 'https://node-postgres.com/features/pooling',
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
      VariableDeclarator(node) {
        // `const client = await pool.connect()` — a manual checkout.
        if (
          !node.init ||
          node.init.type !== AST_NODE_TYPES.AwaitExpression ||
          node.init.argument.type !== AST_NODE_TYPES.CallExpression ||
          node.init.argument.callee.type !== AST_NODE_TYPES.MemberExpression ||
          node.init.argument.callee.property.type !== AST_NODE_TYPES.Identifier ||
          node.init.argument.callee.property.name !== 'connect'
        ) {
          return;
        }

        const [variable] = context.sourceCode.getDeclaredVariables(node);
        if (!variable) return;

        let queryCallCount = 0;
        let releaseCallCount = 0;
        let otherUsageCount = 0;

        for (const ref of variable.references) {
          if (ref.isWrite()) continue;

          const id = ref.identifier;
          const access = id.parent;
          if (
            access === undefined ||
            access.type !== AST_NODE_TYPES.MemberExpression ||
            access.object !== id ||
            access.property.type !== AST_NODE_TYPES.Identifier
          ) {
            // The handle itself escapes — passed to a helper, returned, stored.
            // What happens to it is not knowable here.
            otherUsageCount += 1;
            continue;
          }

          if (access.property.name === 'release') {
            releaseCallCount += 1;
            continue;
          }
          if (access.property.name !== 'query') {
            otherUsageCount += 1;
            continue;
          }

          queryCallCount += 1;
          const call = access.parent;
          if (call === undefined || call.type !== AST_NODE_TYPES.CallExpression) {
            // `const run = client.query` — the method is taken as a value.
            otherUsageCount += 1;
            continue;
          }
          if (!runsExactlyOnce(call, node)) return;

          const [queryArg] = call.arguments;
          if (queryArg === undefined) return;
          const text = statementText(queryArg);
          if (text === null || needsSessionAffinity(text)) return;
        }

        if (queryCallCount === 1 && releaseCallCount === 1 && otherUsageCount === 0) {
          context.report({ node, messageId: 'preferPoolQuery' });
        }
      },
    };
  },
};
