/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Shared mass-assignment detector (CWE-915).
 *
 * The whole request body handed to a write:
 *
 *     await prisma.user.update({ where: { id }, data: req.body });
 *     await User.create(req.body);
 *     await db.insert(users).values({ ...req.body });
 *
 * Every column the model exposes is now writable by whoever sent the request.
 * `role: "admin"`, `isAdmin: true`, `ownerId`, `emailVerified`, `credits`,
 * `stripeCustomerId` — none of them appear anywhere in the diff, which is why
 * this survives review. The vulnerability is in what the code *does not say*.
 *
 * It is also the failure that outlives its fix: adding a sensitive column to a
 * model months later silently widens every existing mass-assignment site. No
 * line changes, and the exposure is new.
 *
 * ## Why there is no allowlist option
 *
 * The remediation is to name the fields — `{ name: req.body.name }` — and that
 * shape is already silent here, because the payload is then a set of chosen
 * values rather than the request object itself. An allowlist option would let a
 * project re-approve the dangerous shape wholesale, which is the same mistake
 * one config file further away.
 */

// AST_NODE_TYPES must come from the local shim, not upstream — it is an enum,
// so a *runtime value*, and `@typescript-eslint/utils` is an optional peer npm
// does not install. See sql-injection-rule.ts for the full note.
import { AST_NODE_TYPES } from '../ast-node-types';
import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import { formatLLMMessage, MessageIcons } from '../messaging';
import { createModuleEvidence } from './module-evidence';
import { isTestFilePath } from './rule-creator';
import { createOriginClassifier } from './driver-origin';
import { isRequestPayload } from './request-source';
import {
  chainMethodNames,
  propertyKeyName,
  startsWithTable,
} from './unscoped-mutation-rule';
import { type Env, envOf, lookup, valueAt } from './value-follow';

/**
 * Two ids because the shapes read differently at the call site, and a reader
 * who sees "spread" needs to be told the spread is the problem, not the object
 * around it.
 */
export type MassAssignmentMessageIds = 'untrustedPayload' | 'untrustedSpread';

export interface MassAssignmentRuleConfig {
  /**
   * The rule's own `meta.type` + `meta.docs`, spelled out by the caller.
   *
   * Deliberately not derived in here: `scripts/audit-rule-meta-completeness.ts`
   * statically parses each rule's source, so metadata hidden inside a factory
   * is invisible to it.
   */
  readonly meta: {
    readonly type: 'problem';
    readonly docs: {
      readonly description: string;
      readonly url: string;
      readonly cwe: string;
      readonly cweJustification?: string;
      readonly cvss: number;
      readonly confidence: 'high' | 'medium' | 'low';
    };
  };
  /** Write methods, e.g. `['create', 'update', 'save']`. */
  readonly methods: readonly string[];
  /**
   * Property names inside an options object that carry the row payload —
   * Prisma's `data` / `create` / `update`, Drizzle's `values` / `set`.
   *
   * Empty means the payload is the argument itself (`User.create(req.body)`).
   * Both are checked regardless; this list only adds the nested positions.
   */
  readonly payloadKeys?: readonly string[];
  /** Driver modules — the plugin-scope gate. */
  readonly modules: readonly string[];
  /**
   * @deprecated Ignored. The receiver was once matched by NAME against this
   * pattern; it is now classified by where it is written (`driver-origin.ts`).
   * Kept so an existing caller still type-checks.
   */
  readonly receiverPattern?: RegExp;
  /**
   * What a write must look like to be reported when its receiver cannot be
   * traced to the driver (an undeclared name, an untyped parameter, a path
   * alias the linter cannot read). A receiver PROVEN to be the driver's is
   * always enough; one proven to be another library's — a `Map`, `Headers`,
   * a cache client — never is.
   *
   *   - `'model-accessor'` — Prisma's `<client>.<model>.create(…)`.
   *   - `'table-call'` — Knex's `<knex>('users').insert(…)`, or a chain that
   *     names its table with `.into()` / `.table()` / `.from()`.
   *   - `'builder-chain'` — Drizzle's `<db>.insert(t).values(…)` /
   *     `<db>.update(t).set(…)`: the write method follows the statement verb.
   *
   * Without one (Sequelize, TypeORM: `Model.create`, `repo.save`), an
   * untraceable receiver is not reported — `cache.create(req.body)` and
   * `User.create(req.body)` are the same program when neither name resolves.
   */
  readonly distinctiveShape?: 'model-accessor' | 'table-call' | 'builder-chain';
  /**
   * An options key that is the driver's own column allowlist — Sequelize's
   * `create(req.body, { fields: ['name'] })`. Its presence is the fix.
   */
  readonly allowlistOption?: string;
  readonly fix: string;
  readonly documentationLink: string;
}

/**
 * Classify one write argument: the request payload itself, a spread of it
 * into an object literal, or neither. The request is recognised by where it
 * comes from (`request-source.ts`), never by what it is called.
 */
export function classifyPayload(
  node: TSESTree.Node,
  env: Env,
  isOurs: (node: TSESTree.Node) => boolean = () => false,
): MassAssignmentMessageIds | false {
  if (isRequestPayload(node, env)) return 'untrustedPayload';
  // `Object.assign(entity, req.body); repo.save(entity)` — the payload was
  // copied in one statement earlier. (When `entity` is itself the driver's
  // model instance the `Object.assign` is reported instead.)
  if (node.type === AST_NODE_TYPES.Identifier) {
    const variable = lookup(node.name, env.scopeOf(node));
    const filled = variable?.references.some((reference) => {
      const call = reference.identifier.parent;
      if (call === undefined || !isObjectAssign(call)) return false;
      const args = (call as TSESTree.CallExpression).arguments;
      return (
        args[0] === reference.identifier &&
        !isOurs(reference.identifier) &&
        args.slice(1).some((source) => isRequestPayload(source, env))
      );
    });
    if (filled === true) return 'untrustedPayload';
  }
  if (node.type === AST_NODE_TYPES.ObjectExpression) {
    for (const prop of node.properties) {
      if (prop.type !== AST_NODE_TYPES.SpreadElement) continue;
      if (isRequestPayload(prop.argument, env)) return 'untrustedSpread';
    }
  }
  return false;
}

/** `Object.assign(target, …sources)`. */
function isObjectAssign(node: TSESTree.Node): boolean {
  return (
    node.type === AST_NODE_TYPES.CallExpression &&
    node.callee.type === AST_NODE_TYPES.MemberExpression &&
    node.callee.object.type === AST_NODE_TYPES.Identifier &&
    node.callee.object.name === 'Object' &&
    !node.callee.computed &&
    node.callee.property.type === AST_NODE_TYPES.Identifier &&
    node.callee.property.name === 'assign'
  );
}

/** Drizzle statement verbs a write method follows in the chain. */
const WRITE_VERBS: ReadonlySet<string> = new Set(['insert', 'update']);

/** Build a CWE-915 rule for one driver's write surface. */
export function createMassAssignmentRule(
  config: MassAssignmentRuleConfig,
): TSESLint.RuleModule<MassAssignmentMessageIds, []> {
  const methods = new Set(config.methods);
  const payloadKeys = new Set(config.payloadKeys ?? []);
  const usesModule = createModuleEvidence({ packages: config.modules });
  const originOf = createOriginClassifier(config.modules);

  return {
    meta: {
      type: config.meta.type,
      docs: { ...config.meta.docs },
      messages: {
        untrustedPayload: formatLLMMessage({
          icon: MessageIcons.SECURITY,
          issueName: 'Mass Assignment',
          description:
            'The request object is written straight to the database, so every column the model exposes is settable by the caller — including ones this code never mentions.',
          severity: 'HIGH',
          // Same source as meta.docs.cwe so the emitted CVSS can never drift
          // from the documented one (security-cvss-docs-consistency.lock).
          cwe: config.meta.docs.cwe,
          owasp: 'A04:2021',
          compliance: ['SOC2', 'PCI-DSS', 'NIST-CSF'],
          effort: 'medium',
          fix: config.fix,
          documentationLink: config.documentationLink,
        }),
        untrustedSpread: formatLLMMessage({
          icon: MessageIcons.SECURITY,
          issueName: 'Mass Assignment',
          description:
            'Spreading the request into the payload carries every key it happens to hold, not just the ones written beside it.',
          severity: 'HIGH',
          cwe: config.meta.docs.cwe,
          owasp: 'A04:2021',
          compliance: ['SOC2', 'PCI-DSS', 'NIST-CSF'],
          effort: 'medium',
          fix: config.fix,
          documentationLink: config.documentationLink,
        }),
      },
      schema: [],
    },
    defaultOptions: [],
    create(context) {
      // BENCHMARK-CRITERIA §B1: a test fixture building a row from a fake
      // request is not the shipped attack surface.
      if (isTestFilePath(context.filename)) return {};
      const env = envOf(context);
      let ownsFile = false;
      const isOurs = (node: TSESTree.Node): boolean =>
        originOf(valueAt(node, env)) === 'ours';

      const hasDistinctiveShape = (node: TSESTree.CallExpression): boolean => {
        const callee = node.callee as TSESTree.MemberExpression;
        switch (config.distinctiveShape) {
          case 'model-accessor':
            return callee.object.type === AST_NODE_TYPES.MemberExpression;
          case 'table-call': {
            const chained = chainMethodNames(node);
            return (
              startsWithTable(callee.object) ||
              ['into', 'table', 'from'].some((m) => chained.has(m))
            );
          }
          case 'builder-chain': {
            // `.values()` / `.set()` read off `x.insert(t)` / `x.update(t)`.
            const object = callee.object;
            return (
              object.type === AST_NODE_TYPES.CallExpression &&
              object.callee.type === AST_NODE_TYPES.MemberExpression &&
              WRITE_VERBS.has(
                (object.callee.property as TSESTree.Identifier).name,
              )
            );
          }
          default:
            return false;
        }
      };

      return {
        Program(program: TSESTree.Program) {
          ownsFile = usesModule(program);
        },

        CallExpression(node: TSESTree.CallExpression) {
          // `Object.assign(user, req.body)` onto the driver's own model
          // instance: every column is set before `save()` is even called.
          if (isObjectAssign(node)) {
            const [target, ...sources] = node.arguments;
            if (target === undefined || !isOurs(target)) return;
            for (const source of sources) {
              if (isRequestPayload(source, env))
                context.report({ node: source, messageId: 'untrustedPayload' });
            }
            return;
          }
          if (
            node.callee.type !== AST_NODE_TYPES.MemberExpression ||
            node.callee.property.type !== AST_NODE_TYPES.Identifier ||
            !methods.has(node.callee.property.name)
          ) {
            return;
          }

          // Where the receiver comes from, never what it is called: a `Map`,
          // `Headers` or another library's client is not a database write; a
          // handle traced to the driver is, even through a relative import.
          const origin = originOf(valueAt(node.callee.object, env));
          if (origin === 'foreign') return;
          if (
            origin === 'unknown' &&
            !(ownsFile && hasDistinctiveShape(node))
          ) {
            return;
          }

          // Sequelize's `{ fields: [...] }` is the allowlist the fix asks for.
          if (
            config.allowlistOption !== undefined &&
            node.arguments.some(
              (arg) =>
                arg.type === AST_NODE_TYPES.ObjectExpression &&
                arg.properties.some(
                  (p) =>
                    p.type === AST_NODE_TYPES.Property &&
                    propertyKeyName(p) === config.allowlistOption,
                ),
            )
          ) {
            return;
          }

          for (const arg of node.arguments) {
            if (arg.type === AST_NODE_TYPES.SpreadElement) continue;

            // The request itself, or spread into the payload literal.
            const direct = classifyPayload(arg, env, isOurs);
            if (direct) {
              context.report({ node: arg, messageId: direct });
              continue;
            }

            // The request nested under a payload key: `{ data: req.body }`.
            if (arg.type !== AST_NODE_TYPES.ObjectExpression) continue;
            for (const prop of arg.properties) {
              if (prop.type !== AST_NODE_TYPES.Property) continue;
              const name = propertyKeyName(prop);
              if (name === undefined || !payloadKeys.has(name)) continue;
              const nested = classifyPayload(prop.value, env, isOurs);
              if (nested)
                context.report({ node: prop.value, messageId: nested });
            }
          }
        },
      };
    },
  };
}
