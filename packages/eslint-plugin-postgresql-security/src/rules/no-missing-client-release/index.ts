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
import { fileUsesPostgres, PG_MODULES } from '../../utils';

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

/**
 * Does this reference hand the client to something else?
 *
 * A client passed to a helper, returned, or stored somewhere has an owner this
 * function cannot see, and the standard `withClient(client, work)` wrapper
 * exists precisely to guarantee the release. Reporting those fires on the
 * remediation, so ownership leaving the function means abstain.
 */
function transfersOwnership(identifier: TSESTree.Node): boolean {
  // Every reference identifier has a parent — only `Program` does not — so the
  // undefined arm is unreachable through the real parser. Asserted rather than
  // branched on, so there is no dead branch to chase to 100%.
  const parent = identifier.parent as TSESTree.Node;
  if (parent.type === AST_NODE_TYPES.ReturnStatement) return true;
  if (parent.type === AST_NODE_TYPES.ArrowFunctionExpression) return true;
  // A bare argument: `runInTransaction(client, ...)`. A `client.query(...)`
  // receiver is a MemberExpression parent and never reaches here.
  if (parent.type === AST_NODE_TYPES.CallExpression) {
    return parent.arguments.includes(
      identifier as TSESTree.CallExpressionArgument,
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
    },
    messages: {
      missingClientRelease: formatLLMMessage({
        icon: MessageIcons.PERFORMANCE,
        issueName: 'Missing Client Release',
        description: 'PG client acquired but not released.',
        severity: 'HIGH',
        cwe: 'CWE-404',
        owasp: 'A05:2025',
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
        owasp: 'A05:2025',
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
    if (!fileUsesPostgres(context.sourceCode.ast)) return {};

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

        // Only a POOL hands out a client that has to be given back.
        if (
          !isPgPool(
            node.callee.object,
            context.sourceCode.getScope(node),
            poolProperties,
          )
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

        // Ownership left this function — a helper, the caller, or a container
        // now decides when the client goes back.
        if (uses.some((id) => transfersOwnership(id))) return;

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
        if (!releases.some((id) => isInsideFinally(id))) {
          context.report({
            node: declarator,
            messageId: 'releaseNotGuaranteed',
          });
        }
      },
    };
  },
};
