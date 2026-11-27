/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Give every gRPC client call a deadline
 * @description A gRPC call has no timeout unless the caller sets a
 * `deadline`. Against a slow or stalled server, each call without one holds
 * its stream, its memory and whatever the caller awaits, indefinitely; under
 * load those pile up until the client exhausts its resources (CWE-400).
 *
 * Strict only: a deadline can also be set by an interceptor or a wrapper the
 * file cannot see, so this is a best practice the code does not prove
 * missing, not a defect.
 *
 * Decided by structure. A client is a `new X(target, credentials)` whose
 * second argument is gRPC channel credentials (`credentials.createSsl()`,
 * `createInsecure()`, `combineChannelCredentials(…)`). A call on it is
 * reported when no argument is an options object carrying `deadline`, and
 * every argument the file cannot read sits where only the request can go.
 *
 * @see https://grpc.io/docs/guides/deadlines/
 */

import {
  TSESTree,
  createRule,
  formatLLMMessage,
  MessageIcons,
  propertyName,
  readObjectProperty,
} from '@interlace/eslint-devkit';

import { followConst, isNewMetadata } from '../../utils/grpc-credentials';
import { isFunction, referencesOf } from '../../utils/grpc-flow';
import type { SourceCode } from '../../utils/grpc-flow';

type MessageIds = 'missingDeadline';

/** Methods of gRPC's Client class that are not RPCs. */
const CLIENT_LIFECYCLE = new Set(['close', 'getChannel', 'waitForReady']);

/** What the file can tell about one call argument. */
type ArgKind = 'callback' | 'metadata' | 'deadline' | 'value' | 'unknown';

/** Is this `<..>credentials.<create…>(…)`: gRPC channel credentials? */
function isChannelCredentials(
  node: TSESTree.Node,
  sourceCode: SourceCode,
): boolean {
  const call = followConst(node, sourceCode);
  if (
    call.type !== 'CallExpression' ||
    call.callee.type !== 'MemberExpression'
  ) {
    return false;
  }
  const owner = call.callee.object;
  return (
    (owner.type === 'MemberExpression' &&
      propertyName(owner) === 'credentials') ||
    (owner.type === 'Identifier' && owner.name === 'credentials')
  );
}

function classify(arg: TSESTree.Node, sourceCode: SourceCode): ArgKind {
  const value = followConst(arg, sourceCode);
  if (isFunction(value)) return 'callback';
  if (isNewMetadata(value, sourceCode)) return 'metadata';
  if (value.type === 'ObjectExpression') {
    const read = readObjectProperty(value, 'deadline', sourceCode);
    // A spread the file cannot read may carry the deadline.
    if (read.kind === 'value') return 'deadline';
    return value.properties.some((p) => p.type === 'SpreadElement')
      ? 'unknown'
      : 'value';
  }
  if (value.type === 'Literal' || value.type === 'ArrayExpression') {
    return 'value';
  }
  return 'unknown';
}

/** Does this call provably go out with no deadline? */
function lacksDeadline(
  args: TSESTree.CallExpressionArgument[],
  sourceCode: SourceCode,
): boolean {
  const kinds = args.map((arg) => classify(arg, sourceCode));
  if (kinds.includes('deadline')) return false;
  const hasCallback = kinds.includes('callback');
  // One unreadable argument and no callback: a request, or a stream's options.
  if (!hasCallback && kinds.length === 1 && kinds[0] === 'unknown') {
    return false;
  }
  // Only the first argument, the request, may be unreadable.
  return kinds.every((kind, i) => kind !== 'unknown' || i === 0);
}

export const requireCallDeadline = createRule<[], MessageIds>({
  name: 'require-call-deadline',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-grpc-security/docs/rules/require-call-deadline.md',
      description: 'Give every gRPC client call a deadline',
      cwe: 'CWE-400',
      cvss: 5.3,
    },
    messages: {
      missingDeadline: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'gRPC Call Without a Deadline',
        cwe: 'CWE-400',
        owasp: 'A04:2021',
        cvss: 5.3,
        description:
          'A gRPC client call sets no deadline, so a slow or stalled server holds it, and everything waiting on it, indefinitely',
        severity: 'MEDIUM',
        compliance: ['SOC2'],
        fix: 'Pass call options with a deadline: `client.Get(req, { deadline: Date.now() + 5000 }, callback)`. Pick the deadline from the caller’s own time budget.',
        documentationLink: 'https://grpc.io/docs/guides/deadlines/',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  createOnce(context) {
    return {
      NewExpression(node): void {
        const { sourceCode } = context;
        const credentials = node.arguments[1];
        if (
          credentials === undefined ||
          !isChannelCredentials(credentials, sourceCode)
        ) {
          return;
        }
        const declarator = node.parent;
        if (
          declarator.type !== 'VariableDeclarator' ||
          declarator.id.type !== 'Identifier'
        ) {
          return;
        }
        const refs = referencesOf(declarator.id, declarator, sourceCode);
        if (refs.some((ref) => ref.isWrite() && !ref.init)) return;
        for (const { identifier } of refs) {
          const member = identifier.parent;
          const call = member?.parent;
          if (
            member?.type !== 'MemberExpression' ||
            member.object !== identifier ||
            call?.type !== 'CallExpression' ||
            call.callee !== member
          ) {
            continue;
          }
          const method = propertyName(member);
          if (method === null || CLIENT_LIFECYCLE.has(method)) continue;
          if (lacksDeadline(call.arguments, sourceCode)) {
            context.report({ node: call, messageId: 'missingDeadline' });
          }
        }
      },
    };
  },
});
