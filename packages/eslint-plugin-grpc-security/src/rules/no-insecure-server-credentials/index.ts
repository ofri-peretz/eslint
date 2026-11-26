/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Do not serve plaintext gRPC on every interface
 * @description `ServerCredentials.createInsecure()` turns TLS off: every
 * message, credential and token crosses the network in cleartext (CWE-319).
 * Bound to a wildcard address, that server is reachable from every network
 * the host sits on.
 *
 * Reported only where the bind address proves exposure: a wildcard host
 * (`0.0.0.0`, `[::]`, `::`) or a bare port. Loopback and unix sockets are
 * network semantics, not guesses, and are left alone because the rule only
 * reports what the address itself proves: anything else, a named host or a
 * host from configuration, is a deployment fact the file does not hold.
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
  isInsecureCredentials,
  staticPrefix,
} from '../../utils/grpc-credentials';
import type { SourceCode } from '../../utils/grpc-flow';

type MessageIds = 'insecureServer';

const BIND_METHODS = new Set(['bindAsync', 'bind']);
const WILDCARD_HOSTS = new Set(['', '0.0.0.0', '::']);

/** Does this bind address prove the server listens on every interface? */
function isWildcardAddress(
  node: TSESTree.Node,
  sourceCode: SourceCode,
): boolean {
  const { text, complete } = staticPrefix(node, sourceCode);
  let host: string | undefined;
  if (text.startsWith('[')) {
    const end = text.indexOf(']');
    host = end < 0 ? undefined : text.slice(1, end);
  } else if (text.includes(':')) {
    host = text.slice(0, text.indexOf(':'));
  } else if (complete && /^\d+$/.test(text)) {
    // `'50051'`: a port alone.
    host = '';
  }
  return host !== undefined && WILDCARD_HOSTS.has(host);
}

export const noInsecureServerCredentials = createRule<[], MessageIds>({
  name: 'no-insecure-server-credentials',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-grpc-security/docs/rules/no-insecure-server-credentials.md',
      description: 'Do not serve plaintext gRPC on every interface',
      cwe: 'CWE-319',
      cvss: 7.4,
    },
    messages: {
      insecureServer: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Plaintext gRPC Server on Every Interface',
        cwe: 'CWE-319',
        owasp: 'A02:2021',
        cvss: 7.4,
        description:
          'A gRPC server with ServerCredentials.createInsecure() is bound to a wildcard address, so every network the host is on can read and alter its traffic',
        severity: 'HIGH',
        compliance: ['SOC2', 'PCI-DSS', 'ISO27001'],
        fix: 'Serve TLS with ServerCredentials.createSsl(rootCerts, keyCertPairs), or bind the plaintext server to loopback or a unix socket and put a TLS-terminating proxy in front of it.',
        documentationLink: 'https://grpc.io/docs/guides/auth/',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  createOnce(context) {
    return {
      CallExpression(node): void {
        const { callee } = node;
        if (callee.type !== 'MemberExpression') return;
        const method = propertyName(callee);
        if (method === null || !BIND_METHODS.has(method)) return;
        const [address, credentials] = node.arguments;
        if (address === undefined || credentials === undefined) return;
        const { sourceCode } = context;
        if (
          !isInsecureCredentials(credentials, 'ServerCredentials', sourceCode)
        ) {
          return;
        }
        if (!isWildcardAddress(address, sourceCode)) return;
        context.report({ node: address, messageId: 'insecureServer' });
      },
    };
  },
});
