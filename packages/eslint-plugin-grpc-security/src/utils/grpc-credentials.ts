/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview gRPC credential shapes, read from the API's own names.
 *
 * `ServerCredentials.createInsecure()` and `credentials.createInsecure()` are
 * the two places gRPC drops TLS; `Metadata` is the class that carries headers.
 * Those are the library's identifiers, matched exactly on the export path a
 * binding resolves to (or the member chain a wrapper re-exports), never a
 * substring of a local name.
 */

import {
  TSESTree,
  propertyName,
  resolveModuleBinding,
} from '@interlace/eslint-devkit';

import { MAX_HOPS, definitionOf } from './grpc-flow';
import type { SourceCode } from './grpc-flow';

/**
 * Headers whose value is a credential by definition: RFC 9110's
 * `authorization` and `proxy-authorization`, RFC 6265's `cookie`, and the
 * de facto `x-api-key`.
 */
export const CREDENTIAL_HEADERS: ReadonlySet<string> = new Set([
  'authorization',
  'proxy-authorization',
  'cookie',
  'x-api-key',
]);

/** RFC 6750's scheme, at the start of a header value. */
const BEARER = /^bearer\s/i;

/** Follow `const x = <expr>` to `<expr>`, bounded. */
export function followConst(
  node: TSESTree.Node,
  sourceCode: SourceCode,
  hops: number = MAX_HOPS,
): TSESTree.Node {
  if (hops <= 0 || node.type !== 'Identifier') return node;
  const def = definitionOf(node, sourceCode);
  const declarator =
    def?.type === 'Variable'
      ? (def.node as TSESTree.VariableDeclarator)
      : undefined;
  return declarator?.init && declarator.id === def?.name
    ? followConst(declarator.init, sourceCode, hops - 1)
    : node;
}

/**
 * Does `node` name gRPC's `<owner>` export: `grpc.<owner>`, a wrapper's
 * `x.<owner>`, or an identifier bound to the `<owner>` export of a module?
 */
function namesExport(
  node: TSESTree.Node,
  owner: string,
  sourceCode: SourceCode,
): boolean {
  if (node.type === 'MemberExpression') return propertyName(node) === owner;
  if (node.type !== 'Identifier') return false;
  const binding = resolveModuleBinding(node, sourceCode.getScope(node));
  return binding?.path.at(-1) === owner;
}

/** Is this `<owner>.createInsecure()`, after following consts? */
export function isInsecureCredentials(
  node: TSESTree.Node,
  owner: 'ServerCredentials' | 'credentials',
  sourceCode: SourceCode,
): boolean {
  const call = followConst(node, sourceCode);
  return (
    call.type === 'CallExpression' &&
    call.callee.type === 'MemberExpression' &&
    propertyName(call.callee) === 'createInsecure' &&
    namesExport(call.callee.object, owner, sourceCode)
  );
}

/** Is this `new <..>Metadata()`? */
export function isNewMetadata(
  node: TSESTree.Node,
  sourceCode: SourceCode,
): boolean {
  return (
    node.type === 'NewExpression' &&
    namesExport(node.callee, 'Metadata', sourceCode)
  );
}

/** The part of a string expression the file fixes, and whether that is all of it. */
export interface StaticText {
  text: string;
  complete: boolean;
}

/** Read a string expression's statically known prefix. */
export function staticPrefix(
  node: TSESTree.Node,
  sourceCode: SourceCode,
  hops: number = MAX_HOPS,
): StaticText {
  const unknown: StaticText = { text: '', complete: false };
  if (hops <= 0) return unknown;
  const read = (child: TSESTree.Node) =>
    staticPrefix(child, sourceCode, hops - 1);
  switch (node.type) {
    case 'Literal':
      return typeof node.value === 'string' || typeof node.value === 'number'
        ? { text: String(node.value), complete: true }
        : unknown;
    case 'TemplateLiteral': {
      let text = '';
      for (const [i, quasi] of node.quasis.entries()) {
        text += quasi.value.raw;
        const expression = node.expressions[i];
        if (expression === undefined) break;
        const part = read(expression);
        text += part.text;
        if (!part.complete) return { text, complete: false };
      }
      return { text, complete: true };
    }
    case 'BinaryExpression': {
      if (node.operator !== '+') return unknown;
      const left = read(node.left);
      if (!left.complete) return left;
      const right = read(node.right);
      return { text: left.text + right.text, complete: right.complete };
    }
    case 'Identifier': {
      const followed = followConst(node, sourceCode, 1);
      return followed === node ? unknown : read(followed);
    }
    default:
      return unknown;
  }
}

/** Does this header name or value prove a credential? */
export function isCredentialHeader(
  name: TSESTree.Node | undefined,
  value: TSESTree.Node | undefined,
  sourceCode: SourceCode,
): boolean {
  const key = name ? staticPrefix(name, sourceCode) : undefined;
  if (key?.complete && CREDENTIAL_HEADERS.has(key.text.toLowerCase())) {
    return true;
  }
  return (
    value !== undefined && BEARER.test(staticPrefix(value, sourceCode).text)
  );
}
