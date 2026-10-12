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
  namesOneOf,
  propertyName,
} from '@interlace/eslint-devkit';
import { NoMissingClientReleaseOptions } from '../../types';
import { usesPostgres, PG_MODULES } from '../../utils';
import { isDeclaredPgPool } from '../../utils/pool-receiver';

const PG_MODULE_SET: ReadonlySet<string> = new Set(PG_MODULES);

/** Is this callee a pg **Pool** constructor? Only a Pool hands out clients. */
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
  return exported === undefined || exported === 'Pool';
}

/**
 * Does this receiver resolve to a pg Pool?
 *
 * `connect()` is on almost everything. The rule matched the method name alone,
 * so `broker.connect()` and `WebSocket.connect(...)` — neither of which HAS a
 * `release()` to call — were reported as leaked PostgreSQL clients. Only a Pool
 * hands out a client that has to be given back.
 */
function isPgPool(
  receiver: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
  poolProperties: ReadonlySet<string>,
): boolean {
  if (
    receiver.type === AST_NODE_TYPES.MemberExpression &&
    receiver.object.type === AST_NODE_TYPES.ThisExpression &&
    propertyName(receiver) !== null
  ) {
    // `this['pool'].connect()` is the same pool.
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
    if (variable.references.filter((ref) => ref.isWrite()).length !== 1)
      return false;
    const def = variable.defs.find((d) => d.type === 'Variable');
    const init =
      def === undefined ? null : (def.node as TSESTree.VariableDeclarator).init;
    if (init == null || init.type !== AST_NODE_TYPES.NewExpression)
      return false;
    return isPgPoolConstructor(init.callee, scope);
  }
  return false;
}

/** Is this reference the receiver of a `release(...)` CALL, not merely a read of it? */
function isReleaseCall(identifier: TSESTree.Node): boolean {
  const member = identifier.parent;
  if (
    member?.type !== AST_NODE_TYPES.MemberExpression ||
    member.object !== identifier ||
    // `client['release']()` returns the same client to the pool.
    propertyName(member) !== 'release'
  ) {
    return false;
  }
  // `cleanupHandlers.push(client.release)` READS the method and hands it to
  // something that never runs it. The old test asked only whether the member
  // expression's parent was a CallExpression — which it is, the `push(...)`
  // one — so passing the release away counted as calling it.
  return (
    member.parent?.type === AST_NODE_TYPES.CallExpression &&
    member.parent.callee === member
  );
}

/** Whether a node sits inside the `finally` block of some enclosing try. */
function isInsideFinally(node: TSESTree.Node): boolean {
  for (let current = node.parent; current; current = current.parent) {
    if (
      current.parent?.type === AST_NODE_TYPES.TryStatement &&
      current.parent.finalizer === current
    ) {
      return true;
    }
  }
  return false;
}

/** Is this reference the receiver of a `.query(...)` call? */
function isQueryCall(identifier: TSESTree.Node): boolean {
  const member = identifier.parent;
  return (
    member?.type === AST_NODE_TYPES.MemberExpression &&
    member.object === identifier &&
    propertyName(member) === 'query' &&
    member.parent?.type === AST_NODE_TYPES.CallExpression &&
    member.parent.callee === member
  );
}

/** Does this subtree contain one of these statements, not counting nested functions? */
function contains(
  node: TSESTree.Node,
  types: readonly TSESTree.Node['type'][],
): boolean {
  if (types.includes(node.type)) return true;
  if (
    node.type === AST_NODE_TYPES.FunctionDeclaration ||
    node.type === AST_NODE_TYPES.FunctionExpression ||
    node.type === AST_NODE_TYPES.ArrowFunctionExpression
  ) {
    return false;
  }
  return Object.entries(node).some(([key, value]) => {
    if (key === 'parent') return false;
    const children: unknown[] = Array.isArray(value) ? value : [value];
    return children.some(
      (child) =>
        typeof child === 'object' &&
        child !== null &&
        typeof (child as TSESTree.Node).type === 'string' &&
        contains(child as TSESTree.Node, types),
    );
  });
}

const containsReturn = (node: TSESTree.Node): boolean =>
  contains(node, [AST_NODE_TYPES.ReturnStatement]);

/** The block this release is a direct `client.release();` statement of. */
function enclosingBlock(
  release: TSESTree.Node,
): { block: TSESTree.BlockStatement; index: number } | null {
  const statement = release.parent?.parent?.parent;
  const block = statement?.parent;
  if (
    statement?.type !== AST_NODE_TYPES.ExpressionStatement ||
    block?.type !== AST_NODE_TYPES.BlockStatement
  ) {
    return null;
  }
  return { block, index: block.body.indexOf(statement) };
}

/**
 * Is this release a direct statement of a `try` block that nothing before it
 * can leave early? Returns that `try`.
 */
function tryBlockRelease(release: TSESTree.Node): TSESTree.TryStatement | null {
  const slot = enclosingBlock(release);
  if (
    slot === null ||
    slot.block.parent?.type !== AST_NODE_TYPES.TryStatement ||
    slot.block.parent.block !== slot.block
  ) {
    return null;
  }
  const before = slot.block.body.slice(0, slot.index);
  return before.some(containsReturn) ? null : slot.block.parent;
}

/** Is this release inside the `catch` clause of `tryStatement`? */
function isInCatchOf(
  release: TSESTree.Node,
  tryStatement: TSESTree.TryStatement,
): boolean {
  for (let current = release.parent; current; current = current.parent) {
    if (current === tryStatement.handler) return true;
  }
  return false;
}

/**
 * Is this release the statement right after a `try … catch`, reached by every
 * path out of it that does not release on its own?
 *
 * The query succeeding falls out of the `try` block into it. The query
 * throwing falls out of the `catch` into it too when the catch swallows the
 * error; a catch that rethrows or returns never gets here, so it has to
 * release on its own.
 */
function releaseAfterTry(
  release: TSESTree.Node,
  releases: readonly TSESTree.Node[],
): boolean {
  const slot = enclosingBlock(release);
  if (slot === null) return false;
  const previous = slot.block.body[slot.index - 1];
  if (
    previous?.type !== AST_NODE_TYPES.TryStatement ||
    previous.handler === null ||
    containsReturn(previous.block)
  ) {
    return false;
  }
  const swallows = !contains(previous.handler, [
    AST_NODE_TYPES.ReturnStatement,
    AST_NODE_TYPES.ThrowStatement,
  ]);
  return swallows || releases.some((other) => isInCatchOf(other, previous));
}

/**
 * Does this reference hand the client to something else?
 *
 * A client passed to a helper, returned, or stored somewhere has an owner this
 * function cannot see, and the standard `withClient(client, work)` wrapper
 * exists precisely to guarantee the release. Reporting those fires on the
 * remediation, so ownership leaving the function means abstain.
 */
function transfersOwnership(
  identifier: TSESTree.Node,
  runsQueries: boolean,
): boolean {
  // Every reference identifier has a parent — only `Program` does not — so the
  // undefined arm is unreachable through the real parser. Asserted rather than
  // branched on, so there is no dead branch to chase to 100%.
  const parent = identifier.parent as TSESTree.Node;
  if (parent.type === AST_NODE_TYPES.ReturnStatement) return true;
  if (parent.type === AST_NODE_TYPES.ArrowFunctionExpression) return true;
  // A bare argument: `runInTransaction(client, ...)`. A `client.query(...)`
  // receiver is a MemberExpression parent and never reaches here.
  //
  // Only when this function runs no query on the client itself. A function
  // that does `client.query('BEGIN')`, `await insertUser(client, …)`,
  // `client.query('COMMIT')` is the client's OWNER, merely lending it to a
  // repository helper — treating every such call as a hand-off silenced the
  // rule on the ordinary transaction shape, leak or not.
  if (parent.type === AST_NODE_TYPES.CallExpression) {
    return (
      !runsQueries &&
      parent.arguments.includes(identifier as TSESTree.CallExpressionArgument)
    );
  }
  if (parent.type === AST_NODE_TYPES.Property) return true;
  if (parent.type === AST_NODE_TYPES.ArrayExpression) return true;
  if (
    parent.type === AST_NODE_TYPES.AssignmentExpression &&
    parent.right === identifier
  ) {
    return true;
  }
  return false;
}

export const noMissingClientRelease: TSESLint.RuleModule<
  'missingClientRelease' | 'releaseNotGuaranteed',
  NoMissingClientReleaseOptions
> = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Ensure pg client is released after use to prevent pool exhaustion.',
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-postgresql-security/docs/rules/no-missing-client-release.md',
      // Already asserted inside `formatLLMMessage` below, which the formatter
      // cannot read — it only looks at `meta.docs.cwe`. Without it here the
      // rule reported a CWE to an LLM consumer and none to every other render.
      cwe: 'CWE-404',
    },
    messages: {
      missingClientRelease: formatLLMMessage({
        icon: MessageIcons.PERFORMANCE,
        issueName: 'Missing Client Release',
        description: 'PG client acquired but not released.',
        severity: 'HIGH',
        cwe: 'CWE-404',
        owasp: 'A10:2025',
        effort: 'low',
        fix: 'Ensure "client.release()" is called in a finally block to return the client to the pool.',
        documentationLink:
          'https://node-postgres.com/features/pooling#checkout-use-and-return',
      }),
      releaseNotGuaranteed: formatLLMMessage({
        icon: MessageIcons.PERFORMANCE,
        issueName: 'Client Release Not Guaranteed',
        description:
          'PG client is released on some paths but not all. A throw, an early return or a rejected query skips the release and leaks the connection.',
        severity: 'HIGH',
        cwe: 'CWE-404',
        owasp: 'A10:2025',
        effort: 'low',
        fix: 'Move "client.release()" into a finally block so it runs on every path out of the function.',
        documentationLink:
          'https://node-postgres.com/features/pooling#checkout-use-and-return',
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

    /** Properties of `this` assigned a pg Pool in this file. */
    const poolProperties = new Set<string>();

    return {
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

      // `:exit` so every `this.pool = new Pool()` in the file has been seen —
      // a constructor may be written below the method that uses the handle.
      'CallExpression:exit'(node: TSESTree.CallExpression) {
        if (
          node.callee.type !== AST_NODE_TYPES.MemberExpression ||
          // `pool['connect']()` checks out the same client.
          propertyName(node.callee) !== 'connect'
        ) {
          return;
        }

        // `const client = await pool.connect()`
        const checkout: TSESTree.Node =
          node.parent?.type === AST_NODE_TYPES.AwaitExpression
            ? node.parent
            : node;
        if (checkout.parent?.type !== AST_NODE_TYPES.VariableDeclarator) return;

        const declarator = checkout.parent;
        if (declarator.id.type !== AST_NODE_TYPES.Identifier) return;

        // Flattened rather than `[0]` with an undefined guard: a declarator
        // with an Identifier id always declares exactly one variable, so that
        // guard was unreachable through the real parser and only a synthetic
        // AST could enter it. Dead branches get deleted here, not tested.
        const uses = context.sourceCode
          .getDeclaredVariables(declarator)
          .flatMap((variable) =>
            variable.references.map((ref) => ref.identifier),
          );

        const runsQueries = uses.some((id) => isQueryCall(id));

        // Only a POOL hands out a client that has to be given back. Proven by
        // a `new Pool()` in this file, by a declared `Pool` type (the
        // injected / imported pool), or by what the checkout is used for: a
        // `.connect()` whose result then runs `.query(...)` is a pg pool
        // checkout whatever the receiver is called — `pg.Client#connect`
        // resolves to nothing, and broker / socket connections have no
        // `.query`.
        const scope = context.sourceCode.getScope(node);
        if (
          !isPgPool(node.callee.object, scope, poolProperties) &&
          !isDeclaredPgPool(node.callee.object, scope) &&
          !runsQueries
        ) {
          return;
        }

        // Ownership left this function — a helper, the caller, or a container
        // now decides when the client goes back.
        if (uses.some((id) => transfersOwnership(id, runsQueries))) return;

        const releases = uses.filter((id) => isReleaseCall(id));

        if (releases.length === 0) {
          context.report({
            node: declarator,
            messageId: 'missingClientRelease',
          });
          return;
        }

        // A release that is not in a `finally` runs only on the paths that
        // reach it. An early return, a throw, or a rejected query skips it —
        // and the happy path always returns the client, so this is the leak
        // that only ever shows up in production.
        // Released at the end of the `try` AND in its `catch` also covers
        // every path: success reaches the first, any throw before it reaches
        // the second.
        const coveredByTryAndCatch = releases.some((id) => {
          const tryStatement = tryBlockRelease(id);
          return (
            tryStatement !== null &&
            releases.some((other) => isInCatchOf(other, tryStatement))
          );
        });
        // Released right after a `try … catch` covers both paths as long as
        // the catch falls through to it or releases before it rethrows.
        if (
          !coveredByTryAndCatch &&
          !releases.some((id) => releaseAfterTry(id, releases)) &&
          !releases.some((id) => isInsideFinally(id))
        ) {
          context.report({
            node: declarator,
            messageId: 'releaseNotGuaranteed',
          });
        }
      },
    };
  },
};
