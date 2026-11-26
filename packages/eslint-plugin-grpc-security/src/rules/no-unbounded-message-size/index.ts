/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Keep gRPC message size limits bounded
 * @description `grpc.max_receive_message_length` and
 * `grpc.max_send_message_length` cap how much one message may hold. gRPC
 * defaults the receive cap to 4 MiB. Setting it to -1 removes the cap, and a
 * cap of gigabytes lets one request make the process allocate that much: a
 * single client can exhaust the server's memory (CWE-770).
 *
 * The keys are gRPC's own channel-argument names, so matching them exactly is
 * structure. The value is evaluated, not guessed: a literal, unary minus,
 * arithmetic (`* + - / ** <<`), a `const`, `Infinity` and `Number.MAX_*` are read; anything
 * else (configuration, a call) cannot be judged here and stays silent.
 *
 * @see https://grpc.github.io/grpc/core/group__grpc__arg__keys.html
 */

import {
  TSESTree,
  createRule,
  formatLLMMessage,
  isGlobalReference,
  MessageIcons,
  objectKeyName,
  propertyName,
} from '@interlace/eslint-devkit';

import { MAX_HOPS, definitionOf } from '../../utils/grpc-flow';
import type { SourceCode } from '../../utils/grpc-flow';

type MessageIds = 'unboundedMessageSize';

/** The two channel arguments that cap a message. */
const SIZE_KEYS = new Set([
  'grpc.max_receive_message_length',
  'grpc.max_send_message_length',
]);

/** Above this, a limit is a limit in name only. */
const MAX_REASONABLE_BYTES = 100 * 1024 * 1024;

/** `Number.<name>` constants the evaluator knows. */
const NUMBER_CONSTANTS: Readonly<Record<string, number>> = {
  MAX_SAFE_INTEGER: Number.MAX_SAFE_INTEGER,
  MAX_VALUE: Number.MAX_VALUE,
  POSITIVE_INFINITY: Number.POSITIVE_INFINITY,
};

/** The number an expression always evaluates to, or undefined. */
function evaluate(
  node: TSESTree.Node,
  sourceCode: SourceCode,
  hops: number = MAX_HOPS,
): number | undefined {
  if (hops <= 0) return undefined;
  const value = (child: TSESTree.Node) => evaluate(child, sourceCode, hops - 1);
  switch (node.type) {
    case 'Literal':
      return typeof node.value === 'number' ? node.value : undefined;
    case 'UnaryExpression': {
      const operand = value(node.argument);
      if (operand === undefined) return undefined;
      return node.operator === '-'
        ? -operand
        : node.operator === '+'
          ? operand
          : undefined;
    }
    case 'BinaryExpression': {
      const left = value(node.left);
      const right = value(node.right);
      if (left === undefined || right === undefined) return undefined;
      switch (node.operator) {
        case '*':
          return left * right;
        case '+':
          return left + right;
        case '-':
          return left - right;
        case '/':
          return left / right;
        case '**':
          return left ** right;
        case '<<':
          return left * 2 ** right;
        default:
          return undefined;
      }
    }
    case 'TSAsExpression':
      return value(node.expression);
    case 'Identifier': {
      if (node.name === 'Infinity' && isGlobalReference(node, sourceCode)) {
        return Infinity;
      }
      const def = definitionOf(node, sourceCode);
      const init =
        def?.type === 'Variable'
          ? (def.node as TSESTree.VariableDeclarator).init
          : null;
      return init ? value(init) : undefined;
    }
    case 'MemberExpression': {
      const key = propertyName(node);
      return node.object.type === 'Identifier' &&
        node.object.name === 'Number' &&
        isGlobalReference(node.object, sourceCode) &&
        key !== null
        ? NUMBER_CONSTANTS[key]
        : undefined;
    }
    default:
      return undefined;
  }
}

/** Is this a value that leaves the message size unbounded? */
function isUnbounded(node: TSESTree.Node, sourceCode: SourceCode): boolean {
  const size = evaluate(node, sourceCode);
  if (size === undefined || Number.isNaN(size)) return false;
  return size < 0 || size > MAX_REASONABLE_BYTES;
}

export const noUnboundedMessageSize = createRule<[], MessageIds>({
  name: 'no-unbounded-message-size',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-grpc-security/docs/rules/no-unbounded-message-size.md',
      description: 'Keep gRPC message size limits bounded',
      cwe: 'CWE-770',
      cvss: 7.5,
    },
    messages: {
      unboundedMessageSize: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'gRPC Message Size Limit Removed',
        cwe: 'CWE-770',
        owasp: 'A04:2021',
        cvss: 7.5,
        description:
          'A gRPC message size limit is set to -1 (no limit) or above 100 MiB, so one message can make the process allocate that much memory',
        severity: 'HIGH',
        compliance: ['SOC2', 'ISO27001'],
        fix: 'Set the limit to the largest message the service actually needs (gRPC defaults receive to 4 MiB). Stream large payloads in chunks instead of raising the cap.',
        documentationLink:
          'https://grpc.github.io/grpc/core/group__grpc__arg__keys.html',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  createOnce(context) {
    return {
      Property(node): void {
        const key = objectKeyName(node);
        if (key === null || !SIZE_KEYS.has(key)) return;
        if (!isUnbounded(node.value, context.sourceCode)) return;
        context.report({ node: node.value, messageId: 'unboundedMessageSize' });
      },
      AssignmentExpression(node): void {
        // `options['grpc.max_receive_message_length'] = -1`
        if (node.left.type !== 'MemberExpression') return;
        const key = propertyName(node.left);
        if (key === null || !SIZE_KEYS.has(key)) return;
        if (!isUnbounded(node.right, context.sourceCode)) return;
        context.report({ node: node.right, messageId: 'unboundedMessageSize' });
      },
    };
  },
});
