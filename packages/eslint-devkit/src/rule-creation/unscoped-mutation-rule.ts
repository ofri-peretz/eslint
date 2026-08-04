/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Shared unscoped-bulk-mutation detector (CWE-284).
 *
 * `deleteMany()`, `.destroy({})`, `db.delete(users)` with no `.where()` —
 * every ORM ships a bulk mutation whose *unscoped* form silently rewrites or
 * destroys the whole table. It is one forgotten clause, it type-checks, and
 * the failure only shows up in production data.
 *
 * The AST work is the same everywhere: find a bulk-mutation sink, then look
 * for evidence that it was scoped. Only two things differ per driver — the
 * sink names, and where the scope evidence lives. Both shapes are checked for
 * every sink, so a driver only has to declare its method names:
 *
 *   - options-object scope — `prisma.user.deleteMany({ where })`,
 *     `User.destroy({ where })`, `repo.delete({ id })`
 *   - builder-chain scope — `db.delete(users).where(...)`,
 *     `knex('users').del().where(...)`,
 *     `qb.createQueryBuilder().delete().where(...)`
 *
 * A driver that never uses chains simply never matches the chain check, so
 * running both costs nothing and keeps the config to a sink list.
 *
 * The rule must stay in a driver-scoped plugin: it keys on driver method
 * names, not language primitives, so it does not belong in the code-agnostic
 * plugins (`secure-coding`, `node-security`, `browser-security`).
 *
 * Deliberately NOT covered: `eslint-plugin-mysql-security` and
 * `-sqlite-security`. Those are raw drivers where the mutation is a SQL
 * string, not an API call — `DELETE FROM t` with no `WHERE` is a different
 * detector (literal-text analysis) and belongs in its own rule.
 */

import { AST_NODE_TYPES } from '../ast-node-types';
import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import { formatLLMMessage, MessageIcons } from '../messaging';

/** Message ids every rule built by this factory reports. */
export type UnscopedMutationMessageIds = 'unscopedMutation' | 'explicitTruncate';

export interface UnscopedMutationRuleConfig {
  /**
   * The rule's own `meta.type` + `meta.docs`, spelled out by the caller.
   *
   * Deliberately NOT derived inside this factory: `scripts/audit-rule-meta-completeness.ts`
   * reads rule metadata by *statically parsing the rule's source file*, so
   * metadata hidden in here is invisible to it — a factory-built rule scores
   * 0% and fails the strict gate. Keeping it at the call site also puts each
   * driver's CWE/CVSS where a reader expects to find it.
   */
  readonly meta: {
    readonly type: 'problem';
    readonly docs: {
      readonly description: string;
      readonly url: string;
      readonly cwe: string;
      readonly cvss: number;
      readonly confidence: 'high' | 'medium' | 'low';
    };
  };
  /** Bulk-mutation sink methods, e.g. `['deleteMany', 'updateMany']`. */
  readonly methods: readonly string[];
  /**
   * What the sink's arguments mean for this driver. The same AST — a lone
   * identifier argument — means opposite things per driver, so it cannot be
   * inferred:
   *
   *   - `'options'` (default) — the arguments may carry the filter
   *     (`deleteMany(opts)`, `destroy({ where })`). An argument that cannot be
   *     read is therefore treated as possible scope, and nothing is reported.
   *   - `'table'` — the argument names the table (`db.delete(users)`,
   *     `knex('users').update(values)`) and never carries a filter, so only
   *     chain scope counts.
   *
   * Reading `db.delete(users)` as `'options'` would suppress the headline
   * Drizzle finding; reading `deleteMany(opts)` as `'table'` would invent a
   * false positive on every dynamic filter.
   */
  readonly argumentRole?: 'options' | 'table';
  /**
   * Only report when an options object is actually present but carries no
   * filter — never on a bare `sink()` with no arguments. Defaults to `false`.
   *
   * Required by ORMs whose instance and static methods share a name.
   * Sequelize's `instance.destroy()` deletes exactly one row and takes no
   * arguments, while `Model.destroy({})` empties the table. Without this,
   * every single-row `instance.destroy()` becomes a false positive — and a
   * plugin that fires on correct code is the one users disable.
   *
   * The cost is a deliberate false negative on `Model.destroy()` written with
   * no arguments, which Sequelize rejects at runtime anyway.
   */
  readonly requireOptionsObject?: boolean;
  /**
   * Top-level option keys that scope a mutation. Defaults to `['where']`.
   * Only DIRECT properties count — a nested `{ data: { where } }` is data,
   * not a filter.
   */
  readonly scopeKeys?: readonly string[];
  /**
   * Chain methods that scope a mutation. Defaults to `['where']`; Knex-style
   * drivers pass their variants (`whereIn`, `whereRaw`, ...).
   */
  readonly scopeMethods?: readonly string[];
  /**
   * Option keys that mean "wipe the table" even though an options object was
   * passed, e.g. Sequelize's `destroy({ truncate: true })`. Reported under
   * `explicitTruncate` because the remediation differs: there is no clause to
   * add, the call itself is the decision.
   */
  readonly truncateKeys?: readonly string[];
  /** Remediation line in the emitted message. */
  readonly fix: string;
  /** Reference link in the emitted message. */
  readonly documentationLink: string;
}

const DEFAULT_SCOPE_KEYS = ['where'] as const;
const DEFAULT_SCOPE_METHODS = ['where'] as const;

/** Property-key name of an object member, or `undefined` for one we cannot read. */
export function propertyKeyName(prop: TSESTree.ObjectLiteralElement): string | undefined {
  if (prop.type !== AST_NODE_TYPES.Property) return undefined;
  // Computed keys (`{ [k]: v }`) are not statically known — a resolved name
  // is required, never the printed source text.
  if (prop.computed) return undefined;
  if (prop.key.type === AST_NODE_TYPES.Identifier) return prop.key.name;
  if (prop.key.type === AST_NODE_TYPES.Literal && typeof prop.key.value === 'string') {
    return prop.key.value;
  }
  return undefined;
}

/**
 * Does this object literal carry a truthy value under any of `keys`?
 *
 * `truncate: false` is not a truncate, so the value is checked rather than
 * the key's presence.
 */
export function hasTruthyKey(obj: TSESTree.ObjectExpression, keys: readonly string[]): boolean {
  return obj.properties.some((prop) => {
    if (prop.type !== AST_NODE_TYPES.Property) return false;
    const name = propertyKeyName(prop);
    if (name === undefined || !keys.includes(name)) return false;
    return !(prop.value.type === AST_NODE_TYPES.Literal && prop.value.value === false);
  });
}

/**
 * Scope evidence inside the call's arguments, for `argumentRole: 'options'`.
 *
 * Returns `true` when scope is present OR cannot be ruled out. An argument we
 * cannot see into — an identifier, a call, a conditional — is treated as
 * scoped: this rule's value is that a finding is always real, so an
 * unreadable filter is a deliberate false negative rather than a guess.
 *
 * A bare literal (`destroy(1)`) is readable and carries no filter, so it does
 * not suppress.
 */
export function hasArgumentScope(
  args: readonly TSESTree.CallExpressionArgument[],
  scopeKeys: readonly string[],
): boolean {
  return args.some((arg) => {
    if (arg.type === AST_NODE_TYPES.ObjectExpression) {
      return arg.properties.some((prop) => {
        // `{ ...filter }` may carry the where clause; cannot be ruled out.
        if (prop.type === AST_NODE_TYPES.SpreadElement) return true;
        const name = propertyKeyName(prop);
        // A computed or unreadable key may be the scope key.
        return name === undefined || scopeKeys.includes(name);
      });
    }
    return arg.type !== AST_NODE_TYPES.Literal;
  });
}

/**
 * Every method name called anywhere in the member chain containing `node`.
 *
 * Ascends to the chain root first, so scope written after the sink
 * (`db.delete(users).where(...)`) counts as much as scope written before it
 * (`qb.where(...).delete()`).
 */
export function chainMethodNames(node: TSESTree.CallExpression): Set<string> {
  let root: TSESTree.Node = node;
  // Ascend only while this node IS the chain — the object of a member
  // access, or the callee of a call. A sink used as an *argument* is a
  // different expression and must not inherit that expression's scope.
  for (;;) {
    const parent: TSESTree.Node | undefined = root.parent;
    if (!parent) break;
    if (parent.type === AST_NODE_TYPES.MemberExpression && parent.object === root) {
      root = parent;
      continue;
    }
    if (parent.type === AST_NODE_TYPES.CallExpression && parent.callee === root) {
      root = parent;
      continue;
    }
    break;
  }

  const names = new Set<string>();
  let cursor: TSESTree.Node = root;
  for (;;) {
    if (cursor.type === AST_NODE_TYPES.CallExpression) {
      cursor = cursor.callee;
      continue;
    }
    if (cursor.type === AST_NODE_TYPES.MemberExpression) {
      if (!cursor.computed && cursor.property.type === AST_NODE_TYPES.Identifier) {
        names.add(cursor.property.name);
      }
      cursor = cursor.object;
      continue;
    }
    break;
  }
  return names;
}

/**
 * Build a CWE-284 rule for the given bulk-mutation sinks.
 *
 * Reports a sink call only when BOTH scope channels come up empty: no
 * readable filter in the arguments, and no scoping method anywhere in its
 * chain.
 */
export function createUnscopedMutationRule(
  config: UnscopedMutationRuleConfig,
): TSESLint.RuleModule<UnscopedMutationMessageIds, []> {
  const sinks = new Set(config.methods);
  const scopeKeys = config.scopeKeys ?? DEFAULT_SCOPE_KEYS;
  const scopeMethods = config.scopeMethods ?? DEFAULT_SCOPE_METHODS;
  const truncateKeys = config.truncateKeys ?? [];
  const argumentRole = config.argumentRole ?? 'options';

  return {
    meta: {
      type: config.meta.type,
      // CWE / CVSS surface in @interlace/eslint-formatter (devkit augments
      // RuleMetaDataDocs) and are locked against the emitted message by
      // security-cvss-docs-consistency.lock.test.ts.
      docs: { ...config.meta.docs },
      messages: {
        unscopedMutation: formatLLMMessage({
          icon: MessageIcons.SECURITY,
          issueName: 'Unscoped Bulk Mutation',
          description:
            'Bulk mutation with no filter detected. This rewrites or deletes every row in the table.',
          severity: 'HIGH',
          // Same source as meta.docs.cwe, so the emitted CVSS can never drift
          // from the documented one (security-cvss-docs-consistency.lock).
          cwe: config.meta.docs.cwe,
          owasp: 'A01:2021',
          compliance: ['SOC2', 'NIST-CSF'],
          effort: 'low',
          fix: config.fix,
          documentationLink: config.documentationLink,
        }),
        explicitTruncate: formatLLMMessage({
          icon: MessageIcons.SECURITY,
          issueName: 'Unscoped Bulk Mutation',
          description:
            'Table truncation detected. This ignores any filter and empties the whole table.',
          severity: 'HIGH',
          cwe: config.meta.docs.cwe,
          owasp: 'A01:2021',
          compliance: ['SOC2', 'NIST-CSF'],
          effort: 'low',
          fix: 'Remove the truncate flag and delete by filter, or move the truncation to an explicit maintenance script.',
          documentationLink: config.documentationLink,
        }),
      },
      schema: [],
    },
    defaultOptions: [],
    create(context) {
      return {
        CallExpression(node: TSESTree.CallExpression) {
          if (
            node.callee.type !== AST_NODE_TYPES.MemberExpression ||
            node.callee.computed ||
            node.callee.property.type !== AST_NODE_TYPES.Identifier ||
            !sinks.has(node.callee.property.name)
          ) {
            return;
          }

          // `destroy({ truncate: true })` passes the scope check by having an
          // options object, so it is tested first.
          if (truncateKeys.length > 0) {
            const truncating = node.arguments.some(
              (arg) =>
                arg.type === AST_NODE_TYPES.ObjectExpression && hasTruthyKey(arg, truncateKeys),
            );
            if (truncating) {
              context.report({ node, messageId: 'explicitTruncate' });
              return;
            }
          }

          if (argumentRole === 'options') {
            // Instance-method guard: no options object means this is not the
            // bulk form at all. See `requireOptionsObject`.
            if (
              config.requireOptionsObject === true &&
              !node.arguments.some((arg) => arg.type === AST_NODE_TYPES.ObjectExpression)
            ) {
              return;
            }
            if (hasArgumentScope(node.arguments, scopeKeys)) return;
          }

          const chained = chainMethodNames(node);
          if (scopeMethods.some((name) => chained.has(name))) return;

          context.report({ node, messageId: 'unscopedMutation' });
        },
      };
    },
  };
}
