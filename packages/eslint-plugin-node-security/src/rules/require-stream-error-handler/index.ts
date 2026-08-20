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
  'createReadStream', 'createWriteStream',
  'createGzip', 'createGunzip', 'createDeflate', 'createInflate',
  'createBrotliCompress', 'createBrotliDecompress',
]);

/** Methods that register an event listener. */
const LISTENER_METHODS: ReadonlySet<string> = new Set([
  'on', 'once', 'addListener', 'prependListener', 'prependOnceListener',
]);

/** The method name this callee invokes, for `f()` and `o.f()`. */
export function calleeMethodName(callee: TSESTree.Node): string | undefined {
  if (callee.type === AST_NODE_TYPES.Identifier) return callee.name;
  if (
    callee.type === AST_NODE_TYPES.MemberExpression &&
    !callee.computed &&
    callee.property.type === AST_NODE_TYPES.Identifier
  ) {
    return callee.property.name;
  }
  return undefined;
}

/** Does this expression construct a stream right here? */
export function constructsStream(node: TSESTree.Node): boolean {
  if (node.type !== AST_NODE_TYPES.CallExpression) return false;
  const name = calleeMethodName(node.callee);
  return name !== undefined && STREAM_CONSTRUCTORS.has(name);
}

export const requireStreamErrorHandler = createRule<RuleOptions, MessageIds>({
  name: 'require-stream-error-handler',
  meta: {
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
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const { allowInTests = true } = options as Options;
    if (allowInTests && isTestFilePath(context.filename)) {
      return {};
    }

    /** Names that appear with an `'error'` listener anywhere in this file. */
    const handled = new Set<string>();
    /** Names bound to a stream constructor. */
    const streamBindings = new Set<string>();
    /** Pipes to judge at Program:exit, once every listener is known. */
    const pending: { node: TSESTree.CallExpression; offender: TSESTree.Node }[] = [];

    /**
     * Is this expression a stream with no reachable `'error'` listener?
     *
     * Returns the node to blame, or null when there is nothing to say. A bare
     * identifier with no visible binding returns null on purpose: the handler
     * may live in another module, and unproven is not the same as unhandled.
     */
    function unhandledStream(node: TSESTree.Node): TSESTree.Node | null {
      // Constructed inline: it has no name, so nothing can have listened to it.
      if (constructsStream(node)) return node;
      if (node.type !== AST_NODE_TYPES.Identifier) return null;
      if (!streamBindings.has(node.name)) return null;
      if (handled.has(node.name)) return null;
      return node;
    }

    return {
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (
          node.init !== null &&
          node.id.type === AST_NODE_TYPES.Identifier &&
          constructsStream(node.init)
        ) {
          streamBindings.add(node.id.name);
        }
      },

      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;
        if (
          callee.type !== AST_NODE_TYPES.MemberExpression ||
          callee.computed ||
          callee.property.type !== AST_NODE_TYPES.Identifier
        ) {
          return;
        }
        const method = callee.property.name;

        // `s.on('error', …)` — record the name as handled.
        if (LISTENER_METHODS.has(method)) {
          const event = node.arguments[0];
          if (
            event?.type === AST_NODE_TYPES.Literal &&
            event.value === 'error' &&
            callee.object.type === AST_NODE_TYPES.Identifier
          ) {
            handled.add(callee.object.name);
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
          const destination =
            destinationArg === undefined ||
            destinationArg.type === AST_NODE_TYPES.SpreadElement
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
