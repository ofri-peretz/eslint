/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-fail-open-auth
 * Detects an authentication/authorization check whose `catch` grants access
 * (CWE-636, Not Failing Securely).
 *
 * The bug is not the `try`. The bug is that the failure path of a security
 * decision resolves to *allow*: either the handler hands back a truthy verdict,
 * or it swallows the error and execution falls through to the privileged work
 * as though the check had passed. In both cases an attacker who can make
 * verification **throw** — a malformed token, an expired key, an unreachable
 * IdP — gets the same result as an attacker who passes it.
 *
 * ## Why this rule is not "flag empty catch blocks"
 *
 * Auth libraries are full of `try { … } catch { … }`. okta-auth-js,
 * express-openid-connect and twilio-node carry well over a thousand catch
 * clauses between them, and virtually all of them are around parsing, storage,
 * telemetry and cleanup, where swallowing is the correct behaviour. An
 * empty-catch rule is a formatting rule with a CWE glued on.
 *
 * The load-bearing condition here is that the `try` block must contain a
 * **security-decision call** — a call whose name marks it as deciding
 * authentication, authorization or token validity. If we cannot see a security
 * decision, we do not report. That is the whole precision budget of this rule,
 * so the name set is specific rather than generous:
 *
 * - A decision verb must be paired with a security noun. `verifyToken`,
 *   `assertAdmin`, `checkPermissions`, `validateSession`, `requireAuth` are in.
 *   Bare `verify`, `validate`, `check`, `assert`, `ensure`, `require` are OUT —
 *   they are the most common verbs in any codebase and they decide nothing on
 *   their own. (`jwt.verify(...)` is a real miss because of this; see the docs'
 *   false-negative section. Admitting bare `verify` would also admit
 *   `sinon.verify`, `mock.verify` and `schema.verify`.)
 * - The noun list is enumerated, not a `\w*` suffix. Measured on the wild
 *   corpus: okta-auth-js has `assertAuthSdkError`, `assertAuthStatusText` and
 *   `verifyAuthJSVersion`, none of which decide anything about a caller's
 *   access. `assert|verify + Auth\w*` matches all three; `assert|verify +
 *   (Auth|Authorization|Authenticated|…)` matches none.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'failOpenReturn' | 'failOpenSwallow';

export interface Options {
  /**
   * Extra call names to treat as security decisions, for codebases whose
   * wrappers are named in-house (`gateKeeper`, `mustBeStaff`, …).
   */
  securityDecisions?: string[];
}

type RuleOptions = [Options?];

/**
 * Calls that decide whether the caller is allowed to proceed.
 *
 * Verb + enumerated security noun, or one of a handful of names that are a
 * security decision on their own. Anchored at both ends: `assertAuth` matches,
 * `assertAuthSdkError` does not.
 */
const SECURITY_DECISION = new RegExp(
  '^(?:' +
    '(?:verify|validate|assert|check|ensure|require)' +
    '(?:Access|AccessToken|Admin|ApiKey|Auth|Authentication|Authorization|Authorized|Authenticated|Claim|Claims|Credential|Credentials|Identity|IdToken|Jwt|Login|Password|Permission|Permissions|Role|Roles|Scope|Scopes|Session|Signature|Token)' +
    '|(?:is|has|can)(?:Access|Admin|Authenticated|Authorized|Owner|Permission|Permissions|Role|Roles)' +
    '|authenticate|authorize|introspectToken|decodeAndVerify' +
    ')$',
  'i',
);

/**
 * Calls that make a catch clause a denial path even without `return`/`throw`.
 *
 * `next(err)` and `reject(err)` do not stop the handler either, so strictly
 * they still fall through — but they are the idiomatic denial in Express and
 * in a promise executor, and reporting them would be arguing with a convention
 * rather than finding a bug. Listed as a known false negative in the docs.
 */
const DENIAL_SIGNAL =
  /^(?:next|reject|abort|deny|fail|forbid|forbidden|unauthorized|logout|exit|sendStatus|redirect)$/i;

const FUNCTION_TYPES = new Set<string>([
  AST_NODE_TYPES.FunctionDeclaration,
  AST_NODE_TYPES.FunctionExpression,
  AST_NODE_TYPES.ArrowFunctionExpression,
]);

/** The statically-known property name of a member expression, or null. */
function memberName(node: TSESTree.MemberExpression): string | null {
  return !node.computed && node.property.type === AST_NODE_TYPES.Identifier
    ? node.property.name
    : null;
}

/** The statically-known callee name of a call — `f()` or `o.f()` — or null. */
function calleeName(node: TSESTree.CallExpression): string | null {
  const callee = node.callee;
  if (callee.type === AST_NODE_TYPES.Identifier) return callee.name;
  if (callee.type === AST_NODE_TYPES.MemberExpression)
    return memberName(callee);
  return null;
}

/**
 * A returned value that is unambiguously "allowed": `return true`, `return 1`,
 * `return 'ok'`.
 *
 * Object and array literals are excluded on purpose. `return { error: err }` is
 * truthy too, and in a catch block an object literal is far more often an error
 * envelope than a grant — `return { authorized: true }` is the price paid for
 * not reporting every one of those. A non-constant return (`return cached`,
 * `return fallback()`) says nothing statically, so it is not a grant either.
 */
function isGrant(node: TSESTree.Expression | null): boolean {
  return node?.type === AST_NODE_TYPES.Literal && Boolean(node.value);
}

/**
 * Is there code after this try/catch that now runs as if the check had passed?
 *
 * This is what makes a swallowed error a *fail-open* rather than merely an
 * ignored one. When the try/catch is the last statement of its block, nothing
 * downstream was gated on it in that scope, and the rule abstains — a
 * try/catch that is the tail of a function is the shape of a fire-and-forget
 * audit or refresh call, which is exactly where auth SDKs swallow on purpose.
 */
function hasWorkAfter(tryStatement: TSESTree.TryStatement): boolean {
  const parent = tryStatement.parent;
  if (
    parent?.type !== AST_NODE_TYPES.BlockStatement &&
    parent?.type !== AST_NODE_TYPES.Program
  ) {
    return false;
  }
  const body: TSESTree.Statement[] = parent.body;
  return body.indexOf(tryStatement) < body.length - 1;
}

export const noFailOpenAuth = createRule<RuleOptions, MessageIds>({
  name: 'no-fail-open-auth',
  /**
   * A test asserting how a component behaves when auth fails is not a
   * fail-open path — it is the assertion that the path is closed.
   * cds-snc/canadalogin-user-selfservice-webapp reported one, inside
   * `__tests__/AddMFAPage.test.jsx`, on a mock component written to exercise
   * exactly this rule's subject. The rule had no test handling at all.
   */
  skipTestFiles: true,
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-fail-open-auth.md',
      description:
        'Detects authentication and authorization checks whose catch block fails open',
      cwe: 'CWE-636',
      // CWE-636 is not in the devkit's CWE→CVSS table, so the score is stated
      // explicitly and must equal the one both messages emit.
      // CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:N = 8.1 — remote, no
      // privileges, full confidentiality and integrity impact behind the
      // bypassed check; AC:H because the attacker must find an input that
      // makes verification *throw* rather than merely return false.
      // Pinned by src/security-cvss-docs-consistency.lock.test.ts.
      cvss: 8.1,
    },
    messages: {
      failOpenReturn: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Fail-Open Authorization',
        cwe: 'CWE-636',
        owasp: 'A10:2025',
        cvss: 8.1,
        description:
          'Security check fails open — the catch block returns a truthy verdict, so a verification error grants access',
        severity: 'HIGH',
        fix: 'Return the deny value from the catch block (return false / null) and log the error',
        documentationLink: 'https://cwe.mitre.org/data/definitions/636.html',
      }),
      failOpenSwallow: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Swallowed Security Check',
        cwe: 'CWE-636',
        owasp: 'A10:2025',
        cvss: 8.1,
        description:
          'Security check fails open — the catch block swallows the error and execution continues into the code the check was guarding',
        severity: 'HIGH',
        fix: 'Rethrow, return a deny value, or send a 401/403 from the catch block before the guarded work runs',
        documentationLink: 'https://cwe.mitre.org/data/definitions/636.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          securityDecisions: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description:
              'Additional call names to treat as authentication/authorization decisions',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ securityDecisions: [] }],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const { securityDecisions = [] }: Options = context.options[0] ?? {};

    /** Try statements whose `try` block contains a security decision. */
    const decisionTries = new WeakSet<TSESTree.TryStatement>();
    /** Catch clauses that return an unambiguous grant. */
    const grantingCatches = new WeakSet<TSESTree.CatchClause>();
    /**
     * Catch clauses (and try statements, via their `finally`) that stop
     * falling through: a throw, a return, a break/continue, or a denial call.
     */
    const handledScopes = new WeakSet<TSESTree.Node>();

    /**
     * The try statement whose *try block* contains this node, stopping at
     * function boundaries — a call inside a callback declared in the try does
     * not run in the try.
     */
    function enclosingTryBlock(
      node: TSESTree.Node,
    ): TSESTree.TryStatement | null {
      let current: TSESTree.Node = node;
      let parent = current.parent;
      while (parent) {
        if (FUNCTION_TYPES.has(parent.type)) return null;
        if (
          parent.type === AST_NODE_TYPES.TryStatement &&
          parent.block === current
        ) {
          return parent;
        }
        current = parent;
        parent = current.parent;
      }
      return null;
    }

    /**
     * The catch clause — or the try statement whose `finally` — this node
     * executes in, stopping at function boundaries.
     *
     * The function boundary is the point: `catch (e) { setTimeout(() => {
     * throw e; }) }` still swallows, because that `throw` belongs to the
     * callback, not to the handler.
     */
    function enclosingHandler(
      node: TSESTree.Node,
    ): TSESTree.CatchClause | TSESTree.TryStatement | null {
      let current: TSESTree.Node = node;
      let parent = current.parent;
      while (parent) {
        if (FUNCTION_TYPES.has(parent.type)) return null;
        if (parent.type === AST_NODE_TYPES.CatchClause) return parent;
        if (
          parent.type === AST_NODE_TYPES.TryStatement &&
          parent.finalizer === current
        ) {
          return parent;
        }
        current = parent;
        parent = current.parent;
      }
      return null;
    }

    function markHandled(node: TSESTree.Node): void {
      const handler = enclosingHandler(node);
      if (handler !== null) handledScopes.add(handler);
    }

    /** Does this call deny, rather than let control fall through? */
    function isDenialSignal(
      node: TSESTree.CallExpression,
      name: string,
    ): boolean {
      if (DENIAL_SIGNAL.test(name)) return true;
      // `res.status(401)` — a 4xx/5xx status is a denial even when the handler
      // forgot to `return` it.
      if (name !== 'status') return false;
      const code = node.arguments[0];
      return (
        code?.type === AST_NODE_TYPES.Literal &&
        typeof code.value === 'number' &&
        code.value >= 400
      );
    }

    /**
     * Does swallowing here leave the caller DENIED?
     *
     * A `try` whose only writes land on bindings declared falsy just above it
     * cannot fail open by being silent — the variable is still falsy when the
     * catch is done, so every gate reading it takes the deny branch:
     *
     *   let token = null;
     *   try {
     *     token = env.enclave.verifyJWT(data.token).accessToken;
     *   } catch (err) {}
     *   if (token) { …grant… }
     *   addFailedRequest(data.ip);   // ← where an unverified token lands
     *
     * That is nightscout/cgm-remote-monitor `lib/authorization/index.js:192`,
     * reported as CWE-703 fail-open. The empty catch is a real code smell —
     * it swallows programming errors too — but the authentication decision it
     * governs is closed, and this rule is about the decision.
     *
     * Deliberately narrow: EVERY assignment in the try must target such a
     * binding. One write to anything else and the shape is not provable, so
     * the finding stands.
     */
    function preservesDenyState(tryStatement: TSESTree.TryStatement): boolean {
      const assignments: TSESTree.AssignmentExpression[] = [];
      const stack: TSESTree.Node[] = [tryStatement.block];
      while (stack.length > 0) {
        const current = stack.pop() as TSESTree.Node;
        if (current.type === AST_NODE_TYPES.AssignmentExpression) {
          assignments.push(current);
        }
        for (const key of Object.keys(current)) {
          if (key === 'parent') continue;
          const value = (current as unknown as Record<string, unknown>)[key];
          for (const child of Array.isArray(value) ? value : [value]) {
            if (
              child !== null &&
              typeof child === 'object' &&
              typeof (child as TSESTree.Node).type === 'string'
            ) {
              stack.push(child as TSESTree.Node);
            }
          }
        }
      }
      if (assignments.length === 0) return false;

      const targets = assignments.every((assignment) => {
        if (assignment.left.type !== AST_NODE_TYPES.Identifier) return false;
        const target = assignment.left;
        let variable: TSESLint.Scope.Variable | undefined;
        for (
          let scope: TSESLint.Scope.Scope | null =
            context.sourceCode.getScope(target);
          scope !== null && variable === undefined;
          scope = scope.upper
        ) {
          variable = scope.variables.find((v) => v.name === target.name);
        }
        const definition = variable?.defs[0];
        if (definition?.type !== 'Variable') return false;
        const init = definition.node.init;
        // Declared with a falsy literal, and declared BEFORE the try — a
        // binding written first inside the try has no prior deny state.
        return (
          init !== null &&
          init !== undefined &&
          init.type === AST_NODE_TYPES.Literal &&
          !init.value &&
          definition.node.range[1] < tryStatement.range[0]
        );
      });
      if (!targets) return false;

      // …AND something downstream must actually GATE on it.
      //
      // A falsy variable only fails closed if a branch reads it and stops.
      // The corpus case `benchmarks/corpus/CWE-636/vulnerable/empty-catch-continues.js`
      // is the counter-example that keeps this honest:
      //
      //   let actor = null;
      //   try { actor = await assertAdmin(req.headers.authorization); } catch (err) {}
      //   await purgeTable(req.body.table);       // runs whatever `actor` is
      //
      // `actor` is left null and nothing branches on it before the privileged
      // work, so that IS fail-open. Nightscout's shape differs in exactly one
      // way — `if (token) { …; return results; }` — and that is the difference
      // this looks for: a test on the variable whose consequent leaves.
      const names = new Set(
        assignments
          .map((assignment) => assignment.left)
          .filter(
            (left): left is TSESTree.Identifier =>
              left.type === AST_NODE_TYPES.Identifier,
          )
          .map((left) => left.name),
      );
      return hasExitingGuard(tryStatement, names);
    }

    /** An `if` after the try that reads one of `names` and leaves the function. */
    function hasExitingGuard(
      tryStatement: TSESTree.TryStatement,
      names: ReadonlySet<string>,
    ): boolean {
      // Reached only after `hasWorkAfter(tryStatement)` returned true, which
      // requires the try to sit in a statement list — so a runtime guard here
      // would be unreachable, and an unreachable guard reads as a check that
      // runs. A braceless `try` as an `if` body has no work after it and never
      // gets this far.
      const enclosing = tryStatement.parent as TSESTree.Node & {
        body: TSESTree.Node[];
      };

      const readsAName = (node: TSESTree.Node): boolean => {
        const stack: TSESTree.Node[] = [node];
        while (stack.length > 0) {
          const current = stack.pop() as TSESTree.Node;
          if (
            current.type === AST_NODE_TYPES.Identifier &&
            names.has(current.name)
          ) {
            return true;
          }
          for (const key of Object.keys(current)) {
            if (key === 'parent') continue;
            const value = (current as unknown as Record<string, unknown>)[key];
            for (const child of Array.isArray(value) ? value : [value]) {
              if (
                child !== null &&
                typeof child === 'object' &&
                typeof (child as TSESTree.Node).type === 'string'
              ) {
                stack.push(child as TSESTree.Node);
              }
            }
          }
        }
        return false;
      };

      const exits = (node: TSESTree.Node): boolean => {
        const stack: TSESTree.Node[] = [node];
        while (stack.length > 0) {
          const current = stack.pop() as TSESTree.Node;
          if (
            current.type === AST_NODE_TYPES.ReturnStatement ||
            current.type === AST_NODE_TYPES.ThrowStatement
          ) {
            return true;
          }
          for (const key of Object.keys(current)) {
            if (key === 'parent') continue;
            const value = (current as unknown as Record<string, unknown>)[key];
            for (const child of Array.isArray(value) ? value : [value]) {
              if (
                child !== null &&
                typeof child === 'object' &&
                typeof (child as TSESTree.Node).type === 'string'
              ) {
                stack.push(child as TSESTree.Node);
              }
            }
          }
        }
        return false;
      };

      return enclosing.body.some(
        (statement) =>
          statement.range[0] > tryStatement.range[1] &&
          statement.type === AST_NODE_TYPES.IfStatement &&
          readsAName(statement.test) &&
          exits(statement.consequent),
      );
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const name = calleeName(node);
        if (name === null) return;

        if (SECURITY_DECISION.test(name) || securityDecisions.includes(name)) {
          const tryStatement = enclosingTryBlock(node);
          if (tryStatement !== null) decisionTries.add(tryStatement);
        }

        if (isDenialSignal(node, name)) markHandled(node);
      },

      ThrowStatement(node: TSESTree.ThrowStatement) {
        markHandled(node);
      },

      // `continue` / `break` skip the guarded work in a loop body just as
      // effectively as a `return` does in a function.
      BreakStatement(node: TSESTree.BreakStatement) {
        markHandled(node);
      },

      ContinueStatement(node: TSESTree.ContinueStatement) {
        markHandled(node);
      },

      ReturnStatement(node: TSESTree.ReturnStatement) {
        markHandled(node);
        if (!isGrant(node.argument)) return;
        const handler = enclosingHandler(node);
        if (handler?.type === AST_NODE_TYPES.CatchClause) {
          grantingCatches.add(handler);
        }
      },

      // `TryStatement:exit`, not `CatchClause:exit`: the traversal order is
      // block → handler → finalizer, so a `throw` in `finally` has not been
      // seen yet when the catch clause exits. Judging the handler on the way
      // out of the whole try statement is the only point at which every part
      // of it has been visited.
      'TryStatement:exit'(node: TSESTree.TryStatement) {
        const handler = node.handler;
        if (handler === null) return;
        if (!decisionTries.has(node)) return;

        // A grant wins over any other control flow in the handler:
        // `catch (e) { if (fatal(e)) throw e; return true; }` still grants.
        if (grantingCatches.has(handler)) {
          context.report({ node: handler, messageId: 'failOpenReturn' });
          return;
        }

        if (handledScopes.has(handler) || handledScopes.has(node)) return;
        if (!hasWorkAfter(node)) return;
        if (preservesDenyState(node)) return;

        context.report({ node: handler, messageId: 'failOpenSwallow' });
      },
    };
  },
});
