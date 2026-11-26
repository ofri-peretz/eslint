/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Do not authorize a gRPC caller by an identity read from metadata
 * @description gRPC metadata is HTTP/2 headers, and the client sets every one
 * of them. A backend that takes "who is calling" from a header a gateway is
 * supposed to set (`x-authenticated-user`, `x-forwarded-user`) trusts the
 * client the moment the backend is reachable another way: a debug port, an
 * SSRF, a sidecar that forwards client headers. That is CWE-290.
 *
 * Decided by flow, never by the header's name. A value is reported when:
 *
 * - it comes from `.get(…)` on a gRPC handler's call metadata: the `metadata`
 *   of the first parameter of a method in the object registered with
 *   `.addService(…)`, followed through consts, destructuring and same-file
 *   helpers whose call sites pass it;
 * - it travels unchanged in substance (consts, `String()`, templates, string
 *   methods, `??`, ternaries, `await`, the return of same-file functions, and
 *   their parameters at the call sites that pass it) — a lookup keyed by it (`TOKENS[h]`) or a call that takes it
 *   (`verify(h)`) resolves it into something else and ends the flow;
 * - and it lands on one side of an equality check, inside an `if` or ternary
 *   test, whose other side is a field of a per-request record (`acc.owner`).
 *   A comparison with `process.env.X` or a module-level constant is a
 *   credential check, not an identity, and stays silent.
 *
 * @see https://grpc.io/docs/guides/auth/
 */

import {
  TSESTree,
  createRule,
  formatLLMMessage,
  isGlobalReference,
  MessageIcons,
  propertyName,
  variableOf,
} from '@interlace/eslint-devkit';

import {
  MAX_HOPS,
  callSitesOf,
  definitionOf,
  functionOf,
  isCallMetadata,
  isFunction,
  returnsOf,
} from '../../utils/grpc-flow';
import type { FunctionNode, SourceCode } from '../../utils/grpc-flow';

type MessageIds = 'identityFromMetadata';
const EQUALITY = new Set(['===', '!==', '==', '!=']);

/**
 * The metadata reads (`md.get(…)` calls) an expression's value is made of,
 * followed backwards through the shapes that keep a value what it was.
 */
function metadataOrigins(
  node: TSESTree.Node,
  sourceCode: SourceCode,
  hops: number,
  seen: Set<TSESTree.Node>,
): TSESTree.CallExpression[] {
  if (hops <= 0 || seen.has(node)) return [];
  seen.add(node);
  const next = (child: TSESTree.Node) =>
    metadataOrigins(child, sourceCode, hops - 1, seen);

  switch (node.type) {
    case 'Identifier': {
      const def = definitionOf(node, sourceCode);
      if (def?.type === 'Parameter') {
        // `function norm(u) { return u.trim(); }`: what the call sites pass.
        const fn = def.node as FunctionNode;
        const index = fn.params.indexOf(def.name as TSESTree.Parameter);
        return callSitesOf(fn, sourceCode).flatMap((call) =>
          call.arguments[index] ? next(call.arguments[index]) : [],
        );
      }
      if (def?.type !== 'Variable') return [];
      // `const h = …` and `const [h] = …` both hold (a part of) the value.
      const { init } = def.node as TSESTree.VariableDeclarator;
      return init ? next(init) : [];
    }
    case 'MemberExpression':
      // `h[0]`, `h.trim` — a part of the value is still the value. The key of
      // a lookup (`TOKENS[h]`) is not followed: the result is the table's.
      return next(node.object);
    case 'ChainExpression':
    case 'TSAsExpression':
    case 'TSNonNullExpression':
      return next(node.expression);
    case 'AwaitExpression':
      return next(node.argument);
    case 'TemplateLiteral':
      return node.expressions.flatMap(next);
    case 'LogicalExpression':
      return [...next(node.left), ...next(node.right)];
    case 'ConditionalExpression':
      return [...next(node.consequent), ...next(node.alternate)];
    case 'CallExpression': {
      const { callee } = node;
      if (callee.type === 'MemberExpression') {
        if (
          propertyName(callee) === 'get' &&
          isCallMetadata(callee.object, sourceCode, MAX_HOPS)
        ) {
          return [node];
        }
        // `h.trim()`, `h.toLowerCase()`: a method of the value returns the value.
        return next(callee.object);
      }
      if (isFunction(callee)) return returnsOf(callee).flatMap(next);
      if (callee.type !== 'Identifier') return [];
      // `String(h)` keeps the value; any other global call resolves it.
      if (callee.name === 'String' && isGlobalReference(callee, sourceCode)) {
        return node.arguments.flatMap(next);
      }
      const fn = functionOf(callee, sourceCode);
      return fn ? returnsOf(fn).flatMap(next) : [];
    }
    default:
      return [];
  }
}

/** The root identifier of `a.b.c`, or undefined for `this.x`, `f().x`, … */
function rootOf(node: TSESTree.Node): TSESTree.Node {
  let current = node;
  while (current.type === 'MemberExpression') current = current.object;
  return current;
}

/**
 * Is this the field of a record the handler looked up for this request
 * (`acc.owner`), as opposed to a secret or a config value?
 */
function isRecordField(
  node: TSESTree.Node,
  sourceCode: SourceCode,
  hops: number = MAX_HOPS,
): boolean {
  if (hops <= 0) return false;
  if (node.type === 'Identifier') {
    // `const owner = acc.owner; if (owner !== user)`
    const def = definitionOf(node, sourceCode);
    const init =
      def?.type === 'Variable'
        ? (def.node as TSESTree.VariableDeclarator).init
        : null;
    return init !== null && isRecordField(init, sourceCode, hops - 1);
  }
  if (node.type !== 'MemberExpression') return false;
  const root = rootOf(node);
  // `(await db.find(id)).owner`, `load(id).owner`: a record fetched for this call.
  if (root.type === 'AwaitExpression' || root.type === 'CallExpression') {
    return true;
  }
  if (root.type !== 'Identifier') return false;
  const variable = variableOf(root, sourceCode);
  // `process.env.X`, and any other global, is configuration.
  if (variable === undefined || variable.defs.length === 0) {
    return root.name !== 'process';
  }
  // So is anything bound at module level: a constant, an import.
  return variable.scope.type !== 'module' && variable.scope.type !== 'global';
}

/** Is `node` inside the test of an `if` or a ternary? */
function decidesABranch(node: TSESTree.Node): boolean {
  let child: TSESTree.Node = node;
  let parent = node.parent;
  // Climb the expression the comparison sits in, up to its statement.
  while (
    parent != null &&
    !isFunction(parent) &&
    !parent.type.endsWith('Statement')
  ) {
    if (parent.type === 'ConditionalExpression' && parent.test === child) {
      return true;
    }
    child = parent;
    parent = parent.parent;
  }
  return parent?.type === 'IfStatement' && parent.test === child;
}

export const noIdentityFromMetadata = createRule<[], MessageIds>({
  name: 'no-identity-from-metadata',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-grpc-security/docs/rules/no-identity-from-metadata.md',
      description:
        'Do not authorize a gRPC caller by an identity read from metadata',
      cwe: 'CWE-290',
      cvss: 8.1,
    },
    messages: {
      identityFromMetadata: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'gRPC Caller Identity Taken From Client-Set Metadata',
        cwe: 'CWE-290',
        owasp: 'A07:2021',
        cvss: 8.1,
        description:
          'A value read from call metadata reaches an authorization check as the caller’s identity, and any client can set any metadata header',
        severity: 'HIGH',
        compliance: ['SOC2', 'ISO27001'],
        fix: 'Authenticate every call in the backend: resolve the caller from a credential you verify (a signed token, an mTLS peer certificate), never from a header a gateway is supposed to set. If a gateway hop must carry identity, authenticate the hop (mTLS) or sign the header.',
        documentationLink: 'https://grpc.io/docs/guides/auth/',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  createOnce(context) {
    let reported = new Set<TSESTree.Node>();
    return {
      before() {
        reported = new Set();
        return true;
      },
      BinaryExpression(node): void {
        if (!EQUALITY.has(node.operator)) return;
        if (!decidesABranch(node)) return;
        const { sourceCode } = context;
        const sides: Array<[TSESTree.Node, TSESTree.Node]> = [
          [node.left, node.right],
          [node.right, node.left],
        ];
        for (const [identity, other] of sides) {
          if (!isRecordField(other, sourceCode)) continue;
          for (const read of metadataOrigins(
            identity,
            sourceCode,
            MAX_HOPS,
            new Set(),
          )) {
            if (reported.has(read)) continue;
            reported.add(read);
            context.report({ node: read, messageId: 'identityFromMetadata' });
          }
        }
      },
    };
  },
});
