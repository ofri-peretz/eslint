/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: require-emitter-error-handler
 * Detects a `ClientRequest` or `ChildProcess` that is created and never given
 * an `'error'` listener.
 * CWE-248: Uncaught Exception
 *
 * An EventEmitter that emits `'error'` with no listener throws, and Node turns
 * that into an uncaught exception: the process exits. A `try/catch` around the
 * call or the `await` cannot catch it, because the throw happens later, from
 * the event loop. Two production crashes found on 2026-11-24 have this shape:
 * parse-server's GraphQL upload (`http.request(...)` piped into, ECONNREFUSED
 * kills the server) and Eleventy's `spawn('git', ...)` (a missing `git` binary
 * kills the build).
 *
 * ## Why a rule of its own, not an extension of require-stream-error-handler
 *
 * That rule asks "does this `.pipe()` have a stream with no listener?". It is
 * triggered by a pipe, matches stream constructors by method NAME, and judges
 * names file-wide. This rule is triggered by the CREATION of an emitter, whose
 * callee is resolved to its module (`http`, `https`, `child_process`), and which
 * has no pipe at all in the Eleventy case. Folding it in would change the
 * verdicts of a rule already in `recommended` and replace its model, so the two
 * share the doctrine and not the code.
 *
 * ## What is reported
 *
 * A call that resolves, by import provenance, to one of EMITTER_FACTORIES, when
 * the returned emitter is used inline or bound to a variable and no
 * `.on('error')`, `.once('error')`, `.addListener('error')` (or the prepend
 * forms) is ever registered on it. Being passed to `.pipe()` is not a listener.
 *
 * ## What is not reported (the ceilings)
 *
 * - The emitter ESCAPES: returned, assigned to a property or another variable,
 *   or passed to any function other than as a `.pipe()` destination
 *   (`events.once(req, ...)`, `pipeline(a, req)`, `finished(req, cb)`, a helper
 *   that may attach the listener). The listener may live in the receiver; the
 *   rule cannot see across that call, so it stays silent.
 * - `exec` and `execFile` are NOT in the table. Node attaches its own `'error'`
 *   listener inside both, with or without a callback (checked on Node 24 with a
 *   missing binary and a missing cwd: the process survives), so they cannot
 *   crash this way. Promisified forms resolve to no module and are silent.
 * - Listeners are looked up through every reference to the binding, closures
 *   included.
 *
 * @see https://cwe.mitre.org/data/definitions/248.html
 * @see https://nodejs.org/api/events.html#error-events
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  formatLLMMessage,
  MessageIcons,
  createRule,
  AST_NODE_TYPES,
  propertyName,
  staticString,
  resolveModuleBinding,
} from '@interlace/eslint-devkit';

type MessageIds = 'unhandledEmitterError';

type RuleOptions = [];

/**
 * Module -> exports whose return value is a ClientRequest or ChildProcess that
 * can emit an unhandled `'error'`.
 *
 * `fork` and `spawn` emit `'error'` on a spawn failure (ENOENT, bad cwd);
 * `request`/`get` emit it on connect failure, reset and timeout. `exec` and
 * `execFile` are absent on purpose: see the file header.
 *
 * @protocol-constant Node core export names that return an EventEmitter which throws without an error listener; a fixed API surface, not a vocabulary a consumer could extend
 */
export const EMITTER_FACTORIES: Readonly<Record<string, ReadonlySet<string>>> =
  {
    http: new Set(['request', 'get']),
    https: new Set(['request', 'get']),
    child_process: new Set(['spawn', 'fork']),
  };

/**
 * Methods that register a listener.
 *
 * @protocol-constant The EventEmitter method names Node defines for registering a listener; a fixed API surface of the platform, not a tunable word list
 */
const LISTENER_METHODS: ReadonlySet<string> = new Set([
  'on',
  'once',
  'addListener',
  'prependListener',
  'prependOnceListener',
]);

/**
 * Methods on a ClientRequest that return the request itself, so a chain such as
 * `http.get(u).setTimeout(t).on('error', h)` still ends in the emitter.
 * Listener methods return `this` too.
 *
 * @protocol-constant Node's own ClientRequest methods that return the request itself; a fixed API surface of the platform, not a tunable word list
 */
const CHAINABLE_METHODS: ReadonlySet<string> = new Set([
  ...LISTENER_METHODS,
  'setTimeout',
  'end',
]);

function isErrorListenerCall(call: TSESTree.CallExpression): boolean {
  // Only ever called with a member call: the caller checked `call.callee`.
  const method = propertyName(call.callee as TSESTree.MemberExpression);
  return (
    method !== null &&
    LISTENER_METHODS.has(method) &&
    staticString(call.arguments[0]) === 'error'
  );
}

/** `x.pipe(<node>)`: the node is a pipe DESTINATION, which is not an escape. */
function isPipeDestination(node: TSESTree.Node): boolean {
  const parent = node.parent;
  return (
    parent?.type === AST_NODE_TYPES.CallExpression &&
    parent.arguments[0] === node &&
    parent.callee.type === AST_NODE_TYPES.MemberExpression &&
    propertyName(parent.callee) === 'pipe'
  );
}

type Verdict = 'handled' | 'escapes' | 'bare';

/**
 * Follow a value through member calls that return it. `handled` when one of
 * them registers an `'error'` listener; `escapes` when the value is used in a
 * way this rule cannot follow; `bare` when it is used and nothing listens.
 */
function judgeUse(node: TSESTree.Node): Verdict {
  let current: TSESTree.Node = node;
  for (;;) {
    const parent = current.parent as TSESTree.Node;
    if (isPipeDestination(current)) return 'bare';
    if (
      parent.type === AST_NODE_TYPES.MemberExpression &&
      parent.object === current
    ) {
      const call = parent.parent;
      if (
        call?.type === AST_NODE_TYPES.CallExpression &&
        call.callee === parent
      ) {
        if (isErrorListenerCall(call)) return 'handled';
        const method = propertyName(parent);
        if (method !== null && CHAINABLE_METHODS.has(method)) {
          current = call;
          continue;
        }
      }
      // `req.method`, `child.pid`, `req.end()` as the last link: a read of the
      // emitter that neither listens nor lets it go.
      return 'bare';
    }
    if (parent.type === AST_NODE_TYPES.ExpressionStatement) return 'bare';
    if (parent.type === AST_NODE_TYPES.ChainExpression) {
      current = parent;
      continue;
    }
    if (
      parent.type === AST_NODE_TYPES.TSNonNullExpression ||
      parent.type === AST_NODE_TYPES.TSAsExpression
    ) {
      current = parent;
      continue;
    }
    return 'escapes';
  }
}

export const requireEmitterErrorHandler = createRule<RuleOptions, MessageIds>({
  name: 'require-emitter-error-handler',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/require-emitter-error-handler.md',
      description:
        "Require an 'error' listener on the ClientRequest or ChildProcess returned by http.request, https.get, child_process.spawn and fork",
      cwe: 'CWE-248',
      cvss: 7.5,
    },
    messages: {
      unhandledEmitterError: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unhandled emitter error',
        cwe: 'CWE-248',
        description:
          "This ClientRequest or ChildProcess has no 'error' listener. An emitter that emits 'error' with none throws from the event loop, which is an uncaught exception: the process exits, and a surrounding try/catch cannot catch it. A refused connection or a missing binary is enough.",
        severity: 'HIGH',
        fix: "Attach emitter.on('error', handler) in the same function that creates it, before any I/O, or hand it to events.once() / stream.pipeline() which surface the failure.",
        documentationLink: 'https://cwe.mitre.org/data/definitions/248.html',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    /** The factory this call is, or undefined when it is not one. */
    function isEmitterFactory(node: TSESTree.CallExpression): boolean {
      const binding = resolveModuleBinding(
        node.callee,
        context.sourceCode.getScope(node),
      );
      if (binding === undefined || binding.path.length !== 1) return false;
      const [name] = binding.path as [string];
      return EMITTER_FACTORIES[binding.module]?.has(name) === true;
    }

    /**
     * Every reference to the binding except its initializer. A later write
     * (`req = other()`) is a reference whose parent is an assignment, which
     * `judgeUse` reads as an escape, so a reassigned binding stays silent
     * without a check of its own.
     */
    function readsOf(declarator: TSESTree.VariableDeclarator): TSESTree.Node[] {
      const variable = context.sourceCode
        .getDeclaredVariables(declarator)
        .find((v) => v.defs[0]?.node === declarator)!;
      return variable.references
        .filter((ref) => !ref.init)
        .map((ref) => ref.identifier);
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (!isEmitterFactory(node)) return;

        const parent = node.parent;
        let verdict: Verdict;
        if (
          parent?.type === AST_NODE_TYPES.VariableDeclarator &&
          parent.init === node
        ) {
          if (parent.id.type !== AST_NODE_TYPES.Identifier) return;
          verdict = 'bare';
          for (const read of readsOf(parent)) {
            const use = judgeUse(read);
            if (use === 'handled' || use === 'escapes') return;
          }
        } else {
          verdict = judgeUse(node);
        }
        if (verdict !== 'bare') return;
        context.report({ node, messageId: 'unhandledEmitterError' });
      },
    };
  },
});
