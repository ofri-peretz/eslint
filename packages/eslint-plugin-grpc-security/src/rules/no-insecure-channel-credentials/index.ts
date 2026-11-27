/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Do not send credentials over a plaintext gRPC channel
 * @description `credentials.createInsecure()` builds a channel without TLS.
 * Calls on it that carry an `authorization`, `cookie` or API-key header, or a
 * `Bearer` value, send that secret in cleartext to anyone on the path
 * (CWE-319).
 *
 * Decided by the credential flow, never by the target's host name: a client
 * constructed with insecure channel credentials (`new Client(target,
 * creds)`), a `Metadata` the file builds and fills with a credential header,
 * and a call on that client that passes the metadata. A plaintext channel to a
 * sidecar that carries no secret is not reported.
 *
 * @see https://grpc.io/docs/guides/auth/
 */

import {
  TSESTree,
  createRule,
  formatLLMMessage,
  MessageIcons,
  propertyName,
} from '@interlace/eslint-devkit';

import {
  followConst,
  isCredentialHeader,
  isInsecureCredentials,
  isNewMetadata,
} from '../../utils/grpc-credentials';
import { referencesOf } from '../../utils/grpc-flow';
import type { SourceCode } from '../../utils/grpc-flow';

type MessageIds = 'insecureChannel';

const HEADER_SETTERS = new Set(['add', 'set']);

/** References to the binding `declarator` declares, or none if it is ever reassigned. */
function stableReferences(
  declarator: TSESTree.Node,
  sourceCode: SourceCode,
): TSESTree.Identifier[] {
  if (
    declarator.type !== 'VariableDeclarator' ||
    declarator.id.type !== 'Identifier'
  ) {
    return [];
  }
  const refs = referencesOf(declarator.id, declarator, sourceCode);
  if (refs.some((ref) => ref.isWrite() && !ref.init)) return [];
  return refs.map((ref) => ref.identifier as TSESTree.Identifier);
}

/** Is this argument a Metadata the file fills with a credential header? */
function carriesCredential(
  arg: TSESTree.Node,
  sourceCode: SourceCode,
): boolean {
  const created = followConst(arg, sourceCode);
  if (arg.type !== 'Identifier' || !isNewMetadata(created, sourceCode)) {
    return false;
  }
  return stableReferences(created.parent as TSESTree.Node, sourceCode).some(
    (id) => {
      const member = id.parent;
      const call = member?.parent;
      return (
        member?.type === 'MemberExpression' &&
        member.object === id &&
        HEADER_SETTERS.has(propertyName(member) ?? '') &&
        call?.type === 'CallExpression' &&
        call.callee === member &&
        isCredentialHeader(call.arguments[0], call.arguments[1], sourceCode)
      );
    },
  );
}

export const noInsecureChannelCredentials = createRule<[], MessageIds>({
  name: 'no-insecure-channel-credentials',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-grpc-security/docs/rules/no-insecure-channel-credentials.md',
      description: 'Do not send credentials over a plaintext gRPC channel',
      cwe: 'CWE-319',
      cvss: 7.4,
    },
    messages: {
      insecureChannel: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Credentials Sent Over a Plaintext gRPC Channel',
        cwe: 'CWE-319',
        owasp: 'A02:2021',
        cvss: 7.4,
        description:
          'A client built with credentials.createInsecure() sends metadata carrying a credential, so the secret crosses the network in cleartext',
        severity: 'HIGH',
        compliance: ['SOC2', 'PCI-DSS', 'ISO27001'],
        fix: 'Build the channel with credentials.createSsl() (or combineChannelCredentials(createSsl(), callCredentials)) whenever a call carries a token, cookie or API key.',
        documentationLink: 'https://grpc.io/docs/guides/auth/',
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
          !isInsecureCredentials(credentials, 'credentials', sourceCode)
        ) {
          return;
        }
        const sendsSecret = stableReferences(node.parent, sourceCode).some(
          (client) => {
            const member = client.parent;
            const call = member?.parent;
            return (
              member?.type === 'MemberExpression' &&
              member.object === client &&
              call?.type === 'CallExpression' &&
              call.callee === member &&
              call.arguments.some((arg) => carriesCredential(arg, sourceCode))
            );
          },
        );
        if (sendsSecret) {
          context.report({ node: credentials, messageId: 'insecureChannel' });
        }
      },
    };
  },
});
