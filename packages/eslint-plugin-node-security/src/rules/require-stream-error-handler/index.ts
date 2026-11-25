/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: require-stream-error-handler
 * Detects `.pipe()` on a stream that has no `'error'` listener.
 * CWE-248: Uncaught Exception
 *
 * `.pipe()` forwards data and nothing else. It does not forward errors, and it
 * does not destroy the source when the destination fails. A stream that emits
 * `'error'` with no listener re-throws inside the EventEmitter, which in Node
 * is an uncaught exception: the process exits. One request for a missing file
 * takes the server down, so this is a remote denial of service that costs the
 * attacker a single request.
 *
 * ## What is reported
 *
 * A `.pipe()` whose source or destination is a stream this file can prove has
 * no handler:
 *
 *   1. A stream CONSTRUCTED INLINE in the pipe expression —
 *      `fs.createReadStream(p).pipe(res)`, `file.pipe(fs.createWriteStream(p))`.
 *      The value has no name, so no `'error'` listener can ever have been
 *      attached to it. This is not a heuristic: it is a property of the
 *      expression.
 *   2. A stream bound to a NAME that never appears with `.on('error')` /
 *      `.once('error')` / `.addListener('error')` anywhere in the file, and
 *      whose binding is a stream constructor.
 *
 * ## What is not reported
 *
 * `pipeline(a, b)` / `pipeline(a, b, cb)` from `stream` or `stream/promises`
 * destroys every stream and surfaces the failure through the callback or the
 * rejected promise. That is the documented fix, so the rule must not report the
 * thing it recommends. Only `.pipe()` member calls are visited, so a stream
 * constructed inline INSIDE a `pipeline(...)` argument is never seen.
 *
 * A source that is merely an identifier with no resolvable binding is silent:
 * the handler may be attached in another module, and "I could not prove this is
 * handled" is not a finding.
 *
 * @see https://cwe.mitre.org/data/definitions/248.html
 * @see https://nodejs.org/api/stream.html#readablepipedestination-options
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  formatLLMMessage,
  MessageIcons,
  createRule,
  AST_NODE_TYPES,
  isTestFilePath,
  propertyName,
  resolveModuleBinding,
} from '@interlace/eslint-devkit';

type MessageIds = 'unhandledStreamError';

export interface Options {
  /** Allow unhandled stream errors in test files. Default: true */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

/**
 * Calls that construct a stream.
 *
 * Deliberately the node-core constructors plus the two archive/compression
 * families that are the usual second half of a pipe. Matched on the method
 * name, so `fs.createReadStream` and a destructured `createReadStream` are the
 * same fact.
 */
const STREAM_CONSTRUCTORS: ReadonlySet<string> = new Set([
  'createReadStream',
  'createWriteStream',
  'createGzip',
  'createGunzip',
  'createDeflate',
  'createInflate',
  'createBrotliCompress',
  'createBrotliDecompress',
]);

/**
 * `node:stream` classes whose instances are streams. `new PassThrough()` is a
 * stream constructor exactly as `fs.createReadStream()` is.
 */
const STREAM_CLASSES: ReadonlySet<string> = new Set([
  'PassThrough',
  'Transform',
  'Readable',
  'Writable',
  'Duplex',
]);

/**
 * `node:stream` classes whose `fromWeb(webStream)` builds a node stream:
 * `Readable` and `Writable` have their own, and `Transform` and `PassThrough`
 * inherit `Duplex.fromWeb`, so `PassThrough.fromWeb(pair)` reaches the same
 * constructor.
 */
const STREAM_CLASSES_WITH_FROM_WEB: ReadonlySet<string> = new Set([
  'Readable',
  'Writable',
  'Duplex',
  'Transform',
  'PassThrough',
]);

/** Methods that register an event listener. */
const LISTENER_METHODS: ReadonlySet<string> = new Set([
  'on',
  'once',
  'addListener',
  'prependListener',
  'prependOnceListener',
]);

/** The method name this callee invokes, for `f()` and `o.f()`. */
export function calleeMethodName(callee: TSESTree.Node): string | undefined {
  if (callee.type === AST_NODE_TYPES.Identifier) return callee.name;
  if (callee.type === AST_NODE_TYPES.MemberExpression) {
    // `fs['createReadStream'](p)` opens the same unhandled stream.
    return propertyName(callee) ?? undefined;
  }
  return undefined;
}

/** Does this expression construct a stream right here? */
export function constructsStream(node: TSESTree.Node): boolean {
  if (node.type !== AST_NODE_TYPES.CallExpression) return false;
  const name = calleeMethodName(node.callee);
  return name !== undefined && STREAM_CONSTRUCTORS.has(name);
}

/**
 * Is this call's value returned to a caller that can listen on it? A function
 * passed as an argument is called by the callee, which may drop the result
 * (`[src].forEach(s => s.pipe(dest))`), so a callback does not count.
 */
function returnsToCaller(node: TSESTree.CallExpression): boolean {
  const parent = node.parent;
  let fn: TSESTree.Node | undefined;
  if (parent?.type === AST_NODE_TYPES.ReturnStatement) {
    fn = parent.parent;
    while (
      fn &&
      fn.type !== AST_NODE_TYPES.FunctionDeclaration &&
      fn.type !== AST_NODE_TYPES.FunctionExpression &&
      fn.type !== AST_NODE_TYPES.ArrowFunctionExpression
    ) {
      fn = fn.parent;
    }
  } else if (
    parent?.type === AST_NODE_TYPES.ArrowFunctionExpression &&
    parent.body === node
  ) {
    fn = parent;
  }
  if (!fn) return false;
  const holder = fn.parent;
  return !(
    (holder?.type === AST_NODE_TYPES.CallExpression ||
      holder?.type === AST_NODE_TYPES.NewExpression) &&
    holder.arguments.includes(fn as TSESTree.CallExpressionArgument)
  );
}

export const requireStreamErrorHandler = createRule<RuleOptions, MessageIds>({
  name: 'require-stream-error-handler',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/require-stream-error-handler.md',
      description:
        "Require an 'error' listener on streams passed to .pipe(), which does not forward errors",
      cwe: 'CWE-248',
      cvss: 7.5,
    },
    messages: {
      unhandledStreamError: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unhandled stream error',
        cwe: 'CWE-248',
        description:
          ".pipe() forwards data but not errors. A stream that emits 'error' with no listener throws inside the EventEmitter, which is an uncaught exception — the process exits. A single request for a missing or unreadable file is enough to stop the server.",
        severity: 'HIGH',
        fix: "Attach stream.on('error', handler) before piping, or use pipeline(), which destroys every stream and reports the failure.",
        documentationLink: 'https://cwe.mitre.org/data/definitions/248.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: true,
            description: 'Allow unhandled stream errors in test files',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: true,
    },
  ],
  createOnce(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    currentOptions,
  ) {
    let handled: Set<string>;
    let escaped: Set<string>;
    /** Destinations built in place that a chain-ending listener covers. */
    let handledNodes: Set<TSESTree.Node | null>;
    /** Bindings handed to the caller with `return name`. */
    let returned: Set<TSESLint.Scope.Variable>;

    function variableOf(
      identifier: TSESTree.Identifier,
    ): TSESLint.Scope.Variable | undefined {
      for (
        let scope: TSESLint.Scope.Scope | null =
          context.sourceCode.getScope(identifier);
        scope;
        scope = scope.upper
      ) {
        const variable = scope.set.get(identifier.name);
        if (variable) return variable;
      }
      return undefined;
    }
    let streamBindings: Set<string>;
    let pending: { node: TSESTree.CallExpression; offender: TSESTree.Node }[];

    /**
     * Is this expression a stream with no reachable `'error'` listener?
     *
     * Returns the node to blame, or null when there is nothing to say. A bare
     * identifier with no visible binding returns null on purpose: the handler
     * may live in another module, and unproven is not the same as unhandled.
     */
    function unhandledStream(node: TSESTree.Node): TSESTree.Node | null {
      // Constructed inline: it has no name, so nothing can have listened to it.
      if (constructsStreamHere(node))
        return handledNodes.has(node) ? null : node;
      if (node.type !== AST_NODE_TYPES.Identifier) return null;
      if (!streamBindings.has(node.name)) return null;
      if (handled.has(node.name) || escaped.has(node.name)) return null;
      // Returned BINDINGS, not names: a same-named stream in a sibling
      // function is a different variable and is still judged on its own.
      const variable = variableOf(node);
      if (variable !== undefined && returned.has(variable)) return null;
      return node;
    }

    /**
     * `constructsStream`, plus `new PassThrough()` and the other `node:stream`
     * classes — resolved to the module, so a local class that shares the name
     * is not a stream.
     */
    function constructsStreamHere(node: TSESTree.Node): boolean {
      if (constructsStream(node)) return true;
      // `Readable.fromWeb(body)` wraps a web stream in a node stream that
      // emits 'error' like any other. Without this the SOURCE of
      // `Readable.fromWeb(x).pipe(dest)` was invisible and only `dest` was
      // judged, so the report landed on the wrong stream.
      if (node.type === AST_NODE_TYPES.CallExpression) {
        const binding = resolveModuleBinding(
          node.callee,
          context.sourceCode.getScope(node),
        );
        return (
          binding?.module === 'stream' &&
          binding.path.length === 2 &&
          STREAM_CLASSES_WITH_FROM_WEB.has(binding.path[0] as string) &&
          binding.path[1] === 'fromWeb'
        );
      }
      if (node.type !== AST_NODE_TYPES.NewExpression) return false;
      const binding = resolveModuleBinding(
        node.callee,
        context.sourceCode.getScope(node),
      );
      const name = binding?.path.at(-1);
      return (
        binding?.module === 'stream' &&
        binding.path.length === 1 &&
        name !== undefined &&
        STREAM_CLASSES.has(name)
      );
    }

    /**
     * The name an `'error'` listener is attached to.
     *
     * `.on()` returns its emitter and `.pipe(dest)` returns `dest`, so in
     * `src.pipe(dest).on('finish', f).on('error', h)` the listener is on
     * `dest`. Reading only an identifier receiver missed that chain:
     * unzipper's `PullStream.js` pipes into a `Transform` and ends the chain
     * with `.on('error', reject)`, and the destination was reported as
     * having no listener.
     */
    function listenedStream(
      receiver: TSESTree.Node,
    ): string | TSESTree.Node | null {
      let current: TSESTree.Node = receiver;
      for (;;) {
        if (current.type === AST_NODE_TYPES.Identifier) return current.name;
        if (
          current.type !== AST_NODE_TYPES.CallExpression ||
          current.callee.type !== AST_NODE_TYPES.MemberExpression
        ) {
          return null;
        }
        const method = propertyName(current.callee);
        if (method === 'pipe') {
          const destination = current.arguments[0];
          if (destination === undefined) return null;
          // A name for a binding; the node itself for a destination built in
          // place (`src.pipe(fs.createWriteStream(p)).on('error', h)`).
          return destination.type === AST_NODE_TYPES.Identifier
            ? destination.name
            : destination;
        }
        if (method === null || !LISTENER_METHODS.has(method)) return null;
        current = current.callee.object;
      }
    }

    return {
      before() {
        const [options = {}] = currentOptions();
        const { allowInTests = true } = options as Options;
        if (allowInTests && isTestFilePath(context.filename)) {
          return false;
        }

        /** Names that appear with an `'error'` listener anywhere in this file. */
        handled = new Set<string>();
        /**
         * Names handed to a call other than `.pipe()`: `attachHandlers(s)`,
         * `pipeline(s, res)`. The callee may attach the listener, and
         * unproven is not unhandled.
         */
        escaped = new Set<string>();
        handledNodes = new Set();
        returned = new Set();
        /** Names bound to a stream constructor. */
        streamBindings = new Set<string>();
        /** Pipes to judge at Program:exit, once every listener is known. */
        pending = [];
        return true;
      },
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (
          node.init !== null &&
          node.id.type === AST_NODE_TYPES.Identifier &&
          constructsStreamHere(node.init)
        ) {
          streamBindings.add(node.id.name);
        }
      },

      // `return entry` hands the stream to the caller, who owns its listeners:
      // the same "unproven is not unhandled" as passing it to another call.
      // unzipper's `Open/unzip.js` builds a PassThrough, forwards its sources'
      // errors into it with `entry.emit('error', e)`, pipes into it, and
      // returns it — the consumer is who listens.
      ReturnStatement(node: TSESTree.ReturnStatement) {
        if (node.argument?.type !== AST_NODE_TYPES.Identifier) return;
        const variable = variableOf(node.argument);
        if (variable === undefined) return;
        // The function that OWNS the binding must be the one returning it: a
        // `return entry` in a nested function nobody calls hands nothing
        // over. And the binding must be assigned once, or the returned value
        // may not be the one that was piped into.
        let owner: TSESTree.Node | undefined = node.parent;
        while (
          owner !== undefined &&
          owner.type !== AST_NODE_TYPES.FunctionDeclaration &&
          owner.type !== AST_NODE_TYPES.FunctionExpression &&
          owner.type !== AST_NODE_TYPES.ArrowFunctionExpression
        ) {
          owner = owner.parent;
        }
        if (
          owner === variable.scope.variableScope.block &&
          variable.references.filter((reference) => reference.isWrite())
            .length <= 1
        ) {
          returned.add(variable);
        }
      },

      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;
        const isPipe =
          callee.type === AST_NODE_TYPES.MemberExpression &&
          propertyName(callee) === 'pipe';
        if (!isPipe) {
          for (const argument of node.arguments) {
            if (argument.type === AST_NODE_TYPES.Identifier) {
              escaped.add(argument.name);
            }
          }
        }
        if (callee.type !== AST_NODE_TYPES.MemberExpression) return;
        // `stream['on']('error', h)` attaches the same handler.
        const method = propertyName(callee);
        if (method === null) return;

        // `s.on('error', …)` — record the name as handled.
        if (LISTENER_METHODS.has(method)) {
          const event = node.arguments[0];
          if (
            event?.type === AST_NODE_TYPES.Literal &&
            event.value === 'error'
          ) {
            const listened = listenedStream(callee.object);
            if (typeof listened === 'string') handled.add(listened);
            else handledNodes.add(listened);
          }
          return;
        }

        if (method !== 'pipe') return;
        pending.push({ node, offender: node });
      },

      'Program:exit'() {
        for (const { node } of pending) {
          const callee = node.callee as TSESTree.MemberExpression;
          const source = unhandledStream(callee.object);
          const destinationArg = node.arguments[0];
          // A spread destination (`src.pipe(...dests)`) is neither a call
          // nor an identifier, so unhandledStream already says null.
          // `return src.pipe(dest)` hands `dest` to the caller: `.pipe()`
          // returns its destination, and the caller is where the listener goes.
          // NestJS's adapters build a checking Transform and return the pipe
          // into it (`platform-express/adapters/express-adapter.ts:829`); the
          // caller attaches the error handler. The SOURCE is not handed back,
          // so it is still judged here.
          const destination =
            destinationArg === undefined || returnsToCaller(node)
              ? null
              : unhandledStream(destinationArg);
          const offender = source ?? destination;
          if (offender === null) continue;
          context.report({
            node: offender,
            messageId: 'unhandledStreamError',
          });
        }
      },
    };
  },
});

export type { Options as RequireStreamErrorHandlerOptions };
