/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Do not send a caught error's stack or message to the gRPC client
 * @description A gRPC status's `details` travel to the client. Filled from a
 * caught error, they carry what the error carried: a stack trace with file
 * paths and dependency versions, a database error quoting the query, an
 * upstream URL. That is CWE-209.
 *
 * Decided by structure. The sink is what a gRPC handler was given: its
 * callback (`cb({ details })`), or its call object (`call.emit('error', …)`,
 * `call.destroy(…)`). The source is a caught error by binding: a
 * `catch (e)` parameter, or the parameter of a `.catch(e => …)` callback. The
 * rule follows `e.stack`, `e.message`, `String(e)`, `e.toString()`,
 * templates, `+`, `||`, ternaries and consts. Passing the caught error itself
 * (`cb(e)`) is not reported: gRPC then sends its message, which an
 * application often writes for the client on purpose.
 *
 * @see https://grpc.io/docs/guides/error/
 */

import {
  TSESTree,
  createRule,
  formatLLMMessage,
  isGlobalReference,
  MessageIcons,
  propertyName,
  readObjectProperty,
  resolveObjectLiteral,
} from '@interlace/eslint-devkit';

import {
  MAX_HOPS,
  definitionOf,
  isFunction,
  isHandler,
} from '../../utils/grpc-flow';
import type { FunctionNode, SourceCode } from '../../utils/grpc-flow';

type MessageIds = 'errorDetailLeak';

/** The parts of an error that are its text. */
const ERROR_TEXT = new Set(['stack', 'message']);

/** Is `id` a caught error: `catch (e)` or `.catch((e) => …)`? */
function isCaughtError(
  id: TSESTree.Identifier,
  sourceCode: SourceCode,
): boolean {
  const def = definitionOf(id, sourceCode);
  if (def?.type === 'CatchClause') return true;
  if (def?.type !== 'Parameter') return false;
  const fn = def.node as FunctionNode;
  const call = fn.parent;
  return (
    fn.params[0] === def.name &&
    call.type === 'CallExpression' &&
    call.arguments[0] === fn &&
    call.callee.type === 'MemberExpression' &&
    propertyName(call.callee) === 'catch'
  );
}

/** Does this value carry a caught error's text? */
function carriesCaughtError(
  node: TSESTree.Node,
  sourceCode: SourceCode,
  hops: number = MAX_HOPS,
): boolean {
  if (hops <= 0) return false;
  const carries = (child: TSESTree.Node) =>
    carriesCaughtError(child, sourceCode, hops - 1);
  switch (node.type) {
    case 'Identifier': {
      if (isCaughtError(node, sourceCode)) return true;
      const def = definitionOf(node, sourceCode);
      const init =
        def?.type === 'Variable'
          ? (def.node as TSESTree.VariableDeclarator).init
          : null;
      return init !== null && carries(init);
    }
    case 'MemberExpression': {
      const key = propertyName(node);
      return key !== null && ERROR_TEXT.has(key) && carries(node.object);
    }
    case 'CallExpression': {
      const { callee } = node;
      // `e.toString()`
      if (callee.type === 'MemberExpression') {
        return propertyName(callee) === 'toString' && carries(callee.object);
      }
      // `String(e)`
      return (
        callee.type === 'Identifier' &&
        callee.name === 'String' &&
        isGlobalReference(callee, sourceCode) &&
        node.arguments.some(carries)
      );
    }
    case 'TemplateLiteral':
      return node.expressions.some(carries);
    case 'BinaryExpression':
      return (
        node.operator === '+' && (carries(node.left) || carries(node.right))
      );
    case 'LogicalExpression':
      return carries(node.left) || carries(node.right);
    case 'ConditionalExpression':
      return carries(node.consequent) || carries(node.alternate);
    default:
      return false;
  }
}

/** The handler parameter at `index` that `id` is bound to, if any. */
function isHandlerParam(
  id: TSESTree.Node,
  index: number,
  sourceCode: SourceCode,
): boolean {
  if (id.type !== 'Identifier') return false;
  const def = definitionOf(id, sourceCode);
  if (def?.type !== 'Parameter') return false;
  const fn = def.node as TSESTree.Node;
  return (
    isFunction(fn) && fn.params[index] === def.name && isHandler(fn, sourceCode)
  );
}

/** The status object a call hands to the client, if this call is a sink. */
function sentStatus(
  call: TSESTree.CallExpression,
  sourceCode: SourceCode,
): TSESTree.Node | undefined {
  const { callee } = call;
  // `cb(status)`: the second parameter of a unary or client-streaming handler.
  if (isHandlerParam(callee, 1, sourceCode)) return call.arguments[0];
  if (
    callee.type !== 'MemberExpression' ||
    !isHandlerParam(callee.object, 0, sourceCode)
  ) {
    return undefined;
  }
  const method = propertyName(callee);
  // `call.destroy(status)`
  if (method === 'destroy') return call.arguments[0];
  // `call.emit('error', status)`
  const [event, status] = call.arguments;
  return method === 'emit' &&
    event?.type === 'Literal' &&
    event.value === 'error'
    ? status
    : undefined;
}

export const noErrorDetailLeak = createRule<[], MessageIds>({
  name: 'no-error-detail-leak',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-grpc-security/docs/rules/no-error-detail-leak.md',
      description:
        "Do not send a caught error's stack or message to the gRPC client",
      cwe: 'CWE-209',
      cvss: 5.3,
    },
    messages: {
      errorDetailLeak: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Caught Error Sent to the gRPC Client',
        cwe: 'CWE-209',
        owasp: 'A05:2021',
        cvss: 5.3,
        description:
          "A gRPC status sent to the client is built from a caught error's stack or message, which can carry file paths, queries and internal hosts",
        severity: 'MEDIUM',
        compliance: ['SOC2', 'ISO27001'],
        fix: "Log the caught error server-side and send a fixed message: `cb({ code: grpc.status.INTERNAL, details: 'internal error' })`. Map the errors you expect to their own status codes and messages.",
        documentationLink: 'https://grpc.io/docs/guides/error/',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  createOnce(context) {
    return {
      CallExpression(node): void {
        const { sourceCode } = context;
        const status = sentStatus(node, sourceCode);
        if (status === undefined) return;
        const object = resolveObjectLiteral(status, sourceCode);
        if (object === undefined) return;
        for (const key of ['details', 'message']) {
          const read = readObjectProperty(object, key, sourceCode);
          if (read.kind !== 'value') continue;
          if (!carriesCaughtError(read.node, sourceCode)) continue;
          context.report({ node: read.node, messageId: 'errorDetailLeak' });
        }
      },
    };
  },
});
