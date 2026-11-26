/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Do not log gRPC metadata that carries credentials
 * @description gRPC metadata carries the caller's credentials: the bearer
 * token, the session cookie, the API key. Logging the whole metadata, its
 * `getMap()` / `toJSON()`, or a credential header's value writes those secrets
 * into every log store, aggregator and support export downstream (CWE-532).
 *
 * The anchor is the Metadata API: a gRPC handler's `call.metadata` (or `{
 * metadata }`), or a `new Metadata()` the file builds. The credential header
 * set is the HTTP definition (`authorization`, `proxy-authorization`,
 * `cookie`, `x-api-key`). The logger is the global `console`, or a receiver
 * bound to a logging library's export (`pino()`, `winston.createLogger()`, an
 * imported `loglevel`).
 *
 * @see https://owasp.org/Top10/A09_2021-Security_Logging_and_Monitoring_Failures/
 */

import {
  TSESTree,
  createRule,
  formatLLMMessage,
  isGlobalReference,
  MessageIcons,
  propertyName,
  resolveModuleBinding,
} from '@interlace/eslint-devkit';

import {
  CREDENTIAL_HEADERS,
  followConst,
  isNewMetadata,
  staticPrefix,
} from '../../utils/grpc-credentials';
import { MAX_HOPS, isCallMetadata } from '../../utils/grpc-flow';
import type { SourceCode } from '../../utils/grpc-flow';

type MessageIds = 'credentialLogged';

/** Logging libraries whose exports, or whose factories' results, are loggers. */
const LOGGING_LIBRARIES = new Set([
  'pino',
  'winston',
  'bunyan',
  'log4js',
  'loglevel',
  'consola',
  'signale',
]);

/** Metadata methods that return every header. */
const DUMPS = new Set(['getMap', 'toJSON', 'toHttp2Headers']);

function fromLoggingLibrary(
  node: TSESTree.Node,
  sourceCode: SourceCode,
): boolean {
  const binding = resolveModuleBinding(node, sourceCode.getScope(node));
  return binding !== undefined && LOGGING_LIBRARIES.has(binding.module);
}

/** Is this the receiver of a logging call? */
function isLogger(node: TSESTree.Node, sourceCode: SourceCode): boolean {
  if (node.type !== 'Identifier') return false;
  if (node.name === 'console' && isGlobalReference(node, sourceCode)) {
    return true;
  }
  if (fromLoggingLibrary(node, sourceCode)) return true;
  // `const logger = pino()`, `const log = winston.createLogger({})`
  const init = followConst(node, sourceCode);
  return (
    init.type === 'CallExpression' &&
    fromLoggingLibrary(init.callee, sourceCode)
  );
}

/** Is this a Metadata object: a handler's call metadata, or one the file builds? */
function isMetadata(node: TSESTree.Node, sourceCode: SourceCode): boolean {
  return (
    isCallMetadata(node, sourceCode, MAX_HOPS) ||
    isNewMetadata(followConst(node, sourceCode), sourceCode)
  );
}

/** `md.getMap()`, `md.toJSON()`: every header at once. */
function isDump(node: TSESTree.Node, sourceCode: SourceCode): boolean {
  const call = followConst(node, sourceCode);
  return (
    call.type === 'CallExpression' &&
    call.callee.type === 'MemberExpression' &&
    DUMPS.has(propertyName(call.callee) ?? '') &&
    isMetadata(call.callee.object, sourceCode)
  );
}

function isCredentialName(
  node: TSESTree.Node | undefined,
  sourceCode: SourceCode,
): boolean {
  if (node === undefined) return false;
  const { text, complete } = staticPrefix(node, sourceCode);
  return complete && CREDENTIAL_HEADERS.has(text.toLowerCase());
}

/** `md.get('authorization')`: one credential header's values. */
function isCredentialGet(node: TSESTree.Node, sourceCode: SourceCode): boolean {
  const call = followConst(node, sourceCode);
  return (
    call.type === 'CallExpression' &&
    call.callee.type === 'MemberExpression' &&
    propertyName(call.callee) === 'get' &&
    isMetadata(call.callee.object, sourceCode) &&
    isCredentialName(call.arguments[0], sourceCode)
  );
}

/** Does this logged value contain a credential from gRPC metadata? */
function leaks(
  node: TSESTree.Node,
  sourceCode: SourceCode,
  hops: number = MAX_HOPS,
): boolean {
  if (hops <= 0) return false;
  const any = (children: ReadonlyArray<TSESTree.Node | null>) =>
    children.some(
      (child) => child !== null && leaks(child, sourceCode, hops - 1),
    );
  if (isMetadata(node, sourceCode) || isDump(node, sourceCode)) return true;
  if (isCredentialGet(node, sourceCode)) return true;
  switch (node.type) {
    case 'Identifier': {
      const init = followConst(node, sourceCode);
      return init !== node && any([init]);
    }
    case 'MemberExpression': {
      // `md.getMap().authorization`, `md.getMap()['cookie']`
      if (isDump(node.object, sourceCode)) {
        return CREDENTIAL_HEADERS.has((propertyName(node) ?? '').toLowerCase());
      }
      // `md.get('authorization')[0]`
      return (
        node.computed &&
        node.property.type === 'Literal' &&
        typeof node.property.value === 'number' &&
        isCredentialGet(node.object, sourceCode)
      );
    }
    case 'CallExpression': {
      // `String(x)`, `JSON.stringify(x)`
      const { callee } = node;
      const wraps =
        (callee.type === 'Identifier' &&
          callee.name === 'String' &&
          isGlobalReference(callee, sourceCode)) ||
        (callee.type === 'MemberExpression' &&
          callee.object.type === 'Identifier' &&
          callee.object.name === 'JSON' &&
          isGlobalReference(callee.object, sourceCode) &&
          propertyName(callee) === 'stringify');
      return wraps && any(node.arguments);
    }
    case 'ObjectExpression':
      return any(
        node.properties.map((p) =>
          p.type === 'Property' ? p.value : p.argument,
        ),
      );
    case 'ArrayExpression':
      return any(node.elements);
    case 'TemplateLiteral':
      return any(node.expressions);
    case 'SpreadElement':
      return any([node.argument]);
    case 'ConditionalExpression':
      return any([node.consequent, node.alternate]);
    case 'LogicalExpression':
      return any([node.left, node.right]);
    case 'BinaryExpression':
      return node.operator === '+' && any([node.left, node.right]);
    default:
      return false;
  }
}

export const noCredentialMetadataLogging = createRule<[], MessageIds>({
  name: 'no-credential-metadata-logging',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-grpc-security/docs/rules/no-credential-metadata-logging.md',
      description: 'Do not log gRPC metadata that carries credentials',
      cwe: 'CWE-532',
      cvss: 6.5,
    },
    messages: {
      credentialLogged: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'gRPC Credentials Written to Logs',
        cwe: 'CWE-532',
        owasp: 'A09:2021',
        cvss: 6.5,
        description:
          'A log call receives gRPC metadata (the whole object, a dump of it, or a credential header), which writes the caller’s token, cookie or API key into the logs',
        severity: 'MEDIUM',
        compliance: ['SOC2', 'PCI-DSS', 'ISO27001'],
        fix: 'Log only the headers you need, by name, and never authorization, cookie or API-key values. If the logger takes whole objects, configure its redaction (pino `redact`, winston format) for those keys.',
        documentationLink:
          'https://owasp.org/Top10/A09_2021-Security_Logging_and_Monitoring_Failures/',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  createOnce(context) {
    return {
      CallExpression(node): void {
        const { callee } = node;
        const { sourceCode } = context;
        if (callee.type !== 'MemberExpression') return;
        if (!isLogger(callee.object, sourceCode)) return;
        for (const arg of node.arguments) {
          if (leaks(arg, sourceCode)) {
            context.report({ node: arg, messageId: 'credentialLogged' });
          }
        }
      },
    };
  },
});
