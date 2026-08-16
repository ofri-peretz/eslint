/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: require-postmessage-origin-check
 * Detects postMessage listeners without origin validation
 * CWE-346: Origin Validation Error
 *
 * @see https://cwe.mitre.org/data/definitions/346.html
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage#security_concerns
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  formatLLMMessage,
  MessageIcons,
  createRule,
} from '@interlace/eslint-devkit';
import { isAnchoredRegexpTest } from '../../utils/regexp-anchoring';

type MessageIds = 'missingOriginCheck';

export interface Options {
  /** Allow in test files. Default: false */
  allowInTests?: boolean;
}

/*
 * `trustedOrigins` was removed. It was declared in the schema and documented
 * as "origins accepted without an explicit check", but `create()` never
 * destructured it, so no value a user supplied could reach any decision. It
 * had no coherent meaning either: this rule asks whether an origin check
 * EXISTS, and which origins that check then accepts is the application's
 * business, not the linter's.
 */

type RuleOptions = [Options?];

/**
 * Receivers whose `message` event carries no origin to validate.
 *
 * CWE-346 here is about `window.postMessage`: a frame can be addressed by any
 * other frame, so the receiver must ask *who sent this*. A `MessageEvent`
 * delivered by a WebSocket, an EventSource, a Worker or a BroadcastChannel has
 * no `origin` to ask about — the channel itself is the peer identity, fixed at
 * construction by the URL or the channel name. Demanding `event.origin` there
 * is a category error, not a missed check, and there is no code that would
 * satisfy it.
 *
 * Shopify/cli
 * `packages/ui-extensions-server-kit/src/ExtensionServerClient/ExtensionServerClient.ts:163`
 * is exactly this: `this.connection?.addEventListener('message', …)` where
 * `connection` is declared `WebSocket` and assigned `new WebSocket(url)`.
 *
 * `no-innerhtml` gates `write`/`writeln` on a document receiver for the same
 * reason — the method name alone does not identify the sink.
 */
const NON_WINDOW_RECEIVERS = new Set([
  'WebSocket',
  'EventSource',
  'Worker',
  'SharedWorker',
  'BroadcastChannel',
  'MessagePort',
  'MessageChannel',
]);

/**
 * A stable name for a receiver expression, or `undefined` when it has none.
 *
 * `ws`, `this.connection` and `client.socket` are nameable; `sockets[i]` and
 * `getSocket()` are not, and an unnameable receiver is simply left to the
 * default (report), since we can prove nothing about it.
 */
function receiverKey(node: TSESTree.Node): string | undefined {
  if (node.type === 'Identifier') return node.name;
  if (
    node.type === 'MemberExpression' &&
    !node.computed &&
    node.property.type === 'Identifier'
  ) {
    if (node.object.type === 'ThisExpression') {
      return `this.${node.property.name}`;
    }
    if (node.object.type === 'Identifier') {
      return `${node.object.name}.${node.property.name}`;
    }
  }
  return undefined;
}

/** The constructor name a type annotation names, if it names one directly. */
function annotatedTypeName(
  annotation: TSESTree.TSTypeAnnotation | undefined,
): string | undefined {
  const type = annotation?.typeAnnotation;
  if (
    type?.type === 'TSTypeReference' &&
    type.typeName.type === 'Identifier'
  ) {
    return type.typeName.name;
  }
  return undefined;
}

/**
 * Check if a function body contains origin validation
 */
function hasOriginCheck(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): boolean {
  const text = sourceCode.getText(node);

  // Common origin validation patterns
  const originPatterns = [
    /event\.origin\s*[!=]==?\s*/,
    /e\.origin\s*[!=]==?\s*/,
    /\.origin\s*[!=]==?\s*/,
    /origin\s*[!=]==?\s*/,
    /checkOrigin/i,
    /validateOrigin/i,
    /isAllowedOrigin/i,
    /trustedOrigins/i,
    /allowedOrigins/i,
  ];

  return originPatterns.some((pattern) => pattern.test(text));
}

export const requirePostmessageOriginCheck = createRule<
  RuleOptions,
  MessageIds
>({
  name: 'require-postmessage-origin-check',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/require-postmessage-origin-check.md',
      description: 'Require origin validation in postMessage event listeners',
      cwe: 'CWE-346',
      cvss: 7.5,
    },
    messages: {
      missingOriginCheck: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing postMessage Origin Validation',
        cwe: 'CWE-346',
        description:
          'postMessage listener lacks origin check. Malicious sites can send messages that will be processed.',
        severity: 'HIGH',
        fix: "Add origin validation: if (event.origin !== 'https://trusted-domain.com') return;",
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage#security_concerns',
      }),

    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: false,
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const { allowInTests = false } = options as Options;

    const filename = context.filename;
    const isTestFile =
      allowInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (isTestFile) {
      return {};
    }

    const sourceCode = context.sourceCode;

    /**
     * Handlers the text patterns above found no origin check in, held back
     * until `Program:exit`.
     *
     * `ALLOWED_ORIGIN.test(event.origin)` is an origin check that spells the
     * word `origin` only as a property read, so none of the `origin ===` text
     * patterns match it and every regexp-guarded listener was reported. The
     * check may also be written after the point ESLint visits the listener, so
     * the verdict has to wait until the whole program has been walked.
     */
    const unverified: Array<{
      handler: TSESTree.Node;
      /** Name of the object `addEventListener` was called on, when nameable. */
      receiver: string | undefined;
    }> = [];

    /**
     * Receiver names this file proves are not a window — see
     * NON_WINDOW_RECEIVERS. Collected across the whole program because the
     * `new WebSocket(…)` that answers for `this.connection` sits 39 lines
     * BELOW the listener in Shopify's ExtensionServerClient.
     */
    const nonWindowReceivers = new Set<string>();

    function rememberIfNonWindow(key: string | undefined, typeName?: string) {
      if (key === undefined || typeName === undefined) return;
      if (NON_WINDOW_RECEIVERS.has(typeName)) nonWindowReceivers.add(key);
    }

    /** Ranges of `ALLOWED.test(x.origin)` calls with a fully anchored pattern. */
    const anchoredOriginTests: Array<readonly [number, number]> = [];

    /** Is this argument an `.origin` read — `event.origin`, `e.origin`? */
    function isOriginRead(node: TSESTree.Node): boolean {
      return (
        node.type === 'MemberExpression' &&
        !node.computed &&
        node.property.type === 'Identifier' &&
        node.property.name === 'origin'
      );
    }

    return {
      // `class C { connection!: WebSocket }` — the declared type names the
      // receiver even when the assignment is out of reach.
      PropertyDefinition(node: TSESTree.PropertyDefinition) {
        if (node.key.type !== 'Identifier') return;
        rememberIfNonWindow(
          `this.${node.key.name}`,
          annotatedTypeName(node.typeAnnotation),
        );
      },

      // `const ws: WebSocket = …`
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (node.id.type !== 'Identifier') return;
        rememberIfNonWindow(node.id.name, annotatedTypeName(node.id.typeAnnotation));
      },

      // `const ws = new WebSocket(url)` / `this.connection = new WebSocket(url)`
      NewExpression(node: TSESTree.NewExpression) {
        if (node.callee.type !== 'Identifier') return;
        const typeName = node.callee.name;
        const parent = node.parent as TSESTree.Node | undefined;
        if (parent?.type === 'VariableDeclarator' && parent.init === node) {
          // A destructuring pattern names no receiver, and `receiverKey`
          // answers `undefined` for it.
          rememberIfNonWindow(receiverKey(parent.id), typeName);
          return;
        }
        if (parent?.type === 'AssignmentExpression' && parent.right === node) {
          rememberIfNonWindow(receiverKey(parent.left), typeName);
        }
      },

      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;

        if (
          node.arguments.length === 1 &&
          isOriginRead(node.arguments[0]) &&
          isAnchoredRegexpTest(node, sourceCode)
        ) {
          anchoredOriginTests.push([node.range[0], node.range[1]]);
        }

        // Check for addEventListener('message', handler) or window.addEventListener('message', handler)
        let isMessageListener = false;
        /** The object the listener was attached to, when it has a name. */
        let receiver: string | undefined;

        // window.addEventListener('message', ...) or this.addEventListener('message', ...)
        if (
          callee.type === 'MemberExpression' &&
          callee.property.type === 'Identifier' &&
          callee.property.name === 'addEventListener'
        ) {
          const eventArg = node.arguments[0];
          if (
            eventArg &&
            eventArg.type === 'Literal' &&
            eventArg.value === 'message'
          ) {
            isMessageListener = true;
            receiver = receiverKey(callee.object);
            // `new WebSocket(url).addEventListener('message', …)` — the
            // receiver names its own type and needs no binding to resolve.
            if (
              callee.object.type === 'NewExpression' &&
              callee.object.callee.type === 'Identifier' &&
              NON_WINDOW_RECEIVERS.has(callee.object.callee.name)
            ) {
              return;
            }
          }
        }

        // Direct addEventListener('message', ...) - global scope
        if (
          callee.type === 'Identifier' &&
          callee.name === 'addEventListener'
        ) {
          const eventArg = node.arguments[0];
          if (
            eventArg &&
            eventArg.type === 'Literal' &&
            eventArg.value === 'message'
          ) {
            isMessageListener = true;
          }
        }

        if (!isMessageListener) {
          return;
        }

        // Get the handler function
        const handlerArg = node.arguments[1];
        if (!handlerArg) {
          return;
        }

        // Check if handler has origin validation
        if (
          handlerArg.type === 'FunctionExpression' ||
          handlerArg.type === 'ArrowFunctionExpression'
        ) {
          if (!hasOriginCheck(handlerArg, sourceCode)) {
            unverified.push({ handler: handlerArg, receiver });
          }
        }

        // Handler is a reference (variable) - can't analyze
        if (handlerArg.type === 'Identifier') {
          // Could add more sophisticated analysis here
          // For now, we skip variable references as they may be validated elsewhere
        }
      },

      'Program:exit'() {
        for (const { handler, receiver } of unverified) {
          // A WebSocket / EventSource / Worker / BroadcastChannel message has
          // no origin to check — see NON_WINDOW_RECEIVERS.
          if (receiver !== undefined && nonWindowReceivers.has(receiver)) {
            continue;
          }
          const guarded = anchoredOriginTests.some(
            ([start, end]) =>
              start >= handler.range[0] && end <= handler.range[1],
          );
          if (guarded) continue;
          context.report({
            node: handler,
            messageId: 'missingOriginCheck',
          });
        }
      },
    };
  },
});
