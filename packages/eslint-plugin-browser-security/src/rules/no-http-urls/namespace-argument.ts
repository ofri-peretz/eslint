/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, propertyName } from '@interlace/eslint-devkit';

/**
 * DOM and XML methods whose FIRST argument is a namespace URI. The platform
 * defines them (`getElementsByTagNameNS(ns, local)`, `createElementNS(ns, q)`),
 * so a string in that position is an identifier by what the call does with it,
 * whatever authority minted it.
 */
const NAMESPACE_FIRST_ARGUMENT: ReadonlySet<string> = new Set([
  'createElementNS',
  'createAttributeNS',
  'createDocument',
  'getElementsByTagNameNS',
  'getAttributeNS',
  'getAttributeNodeNS',
  'hasAttributeNS',
  'removeAttributeNS',
  'setAttributeNS',
  'isDefaultNamespace',
  'lookupPrefix',
]);

function isNamespaceArgumentOf(node: TSESTree.Node): boolean {
  const call = node.parent;
  return (
    call?.type === AST_NODE_TYPES.CallExpression &&
    call.arguments[0] === node &&
    call.callee.type === AST_NODE_TYPES.MemberExpression &&
    NAMESPACE_FIRST_ARGUMENT.has(propertyName(call.callee) ?? '')
  );
}

/**
 * Is this string handed to a DOM namespace method, directly or through a
 * `const` that is used nowhere else?
 *
 * `utils/media/xmp.ts` in element-web declares
 * `const GCONTAINER = 'http://ns.google.com/photos/1.0/container/'` and reads
 * `getAttributeNS(GCONTAINER, 'Mime')`. The URI is compared with the namespace
 * the parser recorded and never fetched, and `https://` would match nothing.
 *
 * A binding counts only when EVERY read of it is such an argument: one `fetch`
 * of the same constant makes it a destination again.
 */
export function isNamespaceArgument(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): boolean {
  // A template is one string however many chunks it has.
  let value = node;
  while (value.parent?.type === AST_NODE_TYPES.TemplateLiteral) {
    value = value.parent;
  }
  if (isNamespaceArgumentOf(value)) return true;
  const declarator = value.parent;
  if (
    declarator?.type !== AST_NODE_TYPES.VariableDeclarator ||
    declarator.init !== value ||
    declarator.id.type !== AST_NODE_TYPES.Identifier
  ) {
    return false;
  }
  const reads = sourceCode
    .getDeclaredVariables(declarator)
    .flatMap((variable) => variable.references)
    .filter((ref) => !ref.init);
  return (
    reads.length > 0 &&
    reads.every((ref) => ref.isRead() && isNamespaceArgumentOf(ref.identifier))
  );
}
