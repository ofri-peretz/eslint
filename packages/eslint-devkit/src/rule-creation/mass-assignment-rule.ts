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
import {
  driverBindings,
  propertyKeyName,
  receiverBaseName,
} from './unscoped-mutation-rule';

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
   * Names a receiver may have for its call to count as a driver write.
   *
   * Carried over from `createUnscopedMutationRule`, and for the same reason:
   * importing the driver does not make every matching method call in the file
   * a database write. Without it, `bindings.size === 0` only proves that *some*
   * driver import exists somewhere in the file, and the method names here are
   * among the most generic in JavaScript — `Map.prototype.set`, `Headers.set`,
   * `URLSearchParams.set`, `FormData.set`, and any `cache.create`. One
   * `req.body` reaching any of those in a file that also imports the ORM would
   * report.
   */
  readonly receiverPattern: RegExp;
  readonly fix: string;
  readonly documentationLink: string;
}

/** Identifiers that name an inbound HTTP request. */
const REQUEST_OBJECTS = ['req', 'request', 'ctx', 'context', 'event'] as const;

/**
 * Request properties that are wholly attacker-controlled.
 *
 * `params` is included even though a route param is usually one id: a router
 * that mounts `/:id/:field` puts arbitrary keys there, and spreading it is the
 * same defect. `payload` is Hapi's spelling of `body`.
 *
 * `data` is deliberately absent. `ctx.data` and `context.data` are ordinary
 * application state in several frameworks, so keying on it would report code
 * that never touches a request.
 */
const UNTRUSTED_PROPS = ['body', 'query', 'params', 'payload'] as const;

/**
 * Does this expression evaluate to attacker-controlled input?
 *
 * Matches `req.body`, `request.query`, `ctx.request.body`, `event.body` — the
 * property must be an untrusted one *and* the chain must bottom out in a
 * request-shaped identifier. Requiring both is what keeps `config.data` and
 * `form.body` out of the findings.
 */
export function isUntrustedSource(node: TSESTree.Node): boolean {
  if (node.type !== AST_NODE_TYPES.MemberExpression || node.computed) return false;
  if (node.property.type !== AST_NODE_TYPES.Identifier) return false;
  if (!UNTRUSTED_PROPS.includes(node.property.name as (typeof UNTRUSTED_PROPS)[number])) {
    return false;
  }
  return baseIsRequest(node.object);
}

/** Walk a member chain down to its root identifier and test it. */
function baseIsRequest(node: TSESTree.Node): boolean {
  let cursor = node;
  while (cursor.type === AST_NODE_TYPES.MemberExpression) cursor = cursor.object;
  return (
    cursor.type === AST_NODE_TYPES.Identifier &&
    REQUEST_OBJECTS.includes(cursor.name as (typeof REQUEST_OBJECTS)[number])
  );
}

/**
 * Classify a payload expression.
 *
 * `false` for anything that names its fields, which is the fix:
 * `{ name: req.body.name }` reads one value out of the request and is not a
 * mass assignment. Only handing over the object itself, or splatting it into
 * one, opens every column.
 */
export function classifyPayload(
  node: TSESTree.Node,
): MassAssignmentMessageIds | false {
  if (isUntrustedSource(node)) return 'untrustedPayload';
  if (node.type === AST_NODE_TYPES.ObjectExpression) {
    for (const prop of node.properties) {
      if (prop.type !== AST_NODE_TYPES.SpreadElement) continue;
      if (isUntrustedSource(prop.argument)) return 'untrustedSpread';
    }
  }
  return false;
}

/** Build a CWE-915 rule for one driver's write surface. */
export function createMassAssignmentRule(
  config: MassAssignmentRuleConfig,
): TSESLint.RuleModule<MassAssignmentMessageIds, []> {
  const methods = new Set(config.methods);
  const payloadKeys = new Set(config.payloadKeys ?? []);

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
      let bindings = new Set<string>();

      return {
        Program(program: TSESTree.Program) {
          bindings = driverBindings(program, config.modules);
        },

        CallExpression(node: TSESTree.CallExpression) {
          if (bindings.size === 0) return;
          if (
            node.callee.type !== AST_NODE_TYPES.MemberExpression ||
            node.callee.property.type !== AST_NODE_TYPES.Identifier ||
            !methods.has(node.callee.property.name)
          ) {
            return;
          }

          // The receiver has to read as a driver handle. See
          // MassAssignmentRuleConfig#receiverPattern — a file that imports the
          // ORM is still full of Maps, Headers and caches.
          const base = receiverBaseName(node.callee);
          if (base === undefined) return;
          if (!bindings.has(base) && !config.receiverPattern.test(base)) return;

          for (const arg of node.arguments) {
            if (arg.type === AST_NODE_TYPES.SpreadElement) continue;

            // `User.create(req.body)` / `repo.save({ ...req.body })`
            const direct = classifyPayload(arg);
            if (direct) {
              context.report({ node: arg, messageId: direct });
              continue;
            }

            // `prisma.user.update({ where, data: req.body })`
            if (arg.type !== AST_NODE_TYPES.ObjectExpression) continue;
            for (const prop of arg.properties) {
              if (prop.type !== AST_NODE_TYPES.Property) continue;
              const name = propertyKeyName(prop);
              if (name === undefined || !payloadKeys.has(name)) continue;
              const nested = classifyPayload(prop.value);
              if (nested) context.report({ node: prop.value, messageId: nested });
            }
          }
        },
      };
    },
  };
}
