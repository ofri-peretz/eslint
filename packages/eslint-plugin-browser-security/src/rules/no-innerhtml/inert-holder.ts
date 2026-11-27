/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Is this sink's receiver a holder that cannot run or load anything?
 *
 * `innerHTML` is dangerous because the parsed nodes live in a document that
 * loads images and fires handlers. Three receivers have no such document, and
 * all three are provable from the file alone:
 *
 *   - a `<template>` element: its content belongs to an inert document, so
 *     `<img src=x onerror=...>` never loads;
 *   - an element or `body` of a document built by `createHTMLDocument()` or
 *     `new DOMParser().parseFromString()`: no browsing context, same result;
 *   - a `<style>` element: its content is raw text, so no markup is created.
 *
 * Inertness is lost the moment a node leaves the holder and is attached to the
 * live page. A holder is therefore inert only while EVERY use of its binding
 * reads a string back out (`textContent`, `innerHTML`, an attribute value).
 * Passing it as an argument, appending it, returning it or aliasing it makes
 * the holder escape, and the sink reports as before.
 *
 * @source triliumnext/trilium `parseTitle`, `htmlToText`; tldraw `stripHtml`;
 *         element-web `serialize.ts`: parse into a detached holder, read text.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { propertyName, staticString } from '@interlace/eslint-devkit';

/** Properties that step from a holder to a node still inside the holder. */
const TRANSIT: ReadonlySet<string> = new Set([
  'content',
  'body',
  'head',
  'documentElement',
]);

/**
 * Operations that keep everything inside the holder: reads that produce a
 * string or boolean, and the sibling sink that only writes more markup into it.
 */
const STAYS_INSIDE: ReadonlySet<string> = new Set([
  'textContent',
  'innerText',
  'innerHTML',
  'outerHTML',
  'getAttribute',
  'hasAttribute',
  'tagName',
  'nodeName',
  'insertAdjacentHTML',
]);

function isMethodCall(node: TSESTree.Node, names: readonly string[]): boolean {
  if (node.type !== 'CallExpression') return false;
  if (node.callee.type !== 'MemberExpression') return false;
  // A computed callee names nothing (`null`), which no list contains.
  return names.includes(propertyName(node.callee) as string);
}

/** The single value a binding holds, and the binding itself. */
function bindingOf(
  identifier: TSESTree.Identifier,
  sourceCode: TSESLint.SourceCode,
): { variable: TSESLint.Scope.Variable; init: TSESTree.Expression } | null {
  for (
    let scope: TSESLint.Scope.Scope | null = sourceCode.getScope(identifier);
    scope !== null;
    scope = scope.upper
  ) {
    const variable = scope.variables.find((v) => v.name === identifier.name);
    if (variable === undefined) continue;
    const def = variable.defs[0];
    if (variable.defs.length !== 1 || def.type !== 'Variable') return null;
    const declarator = def.node;
    if (declarator.id.type !== 'Identifier' || declarator.init == null) {
      return null;
    }
    if (variable.references.filter((ref) => ref.isWrite()).length > 1) {
      return null;
    }
    return { variable, init: declarator.init };
  }
  return null;
}

/** A document nothing is loaded into: `createHTMLDocument` or `DOMParser`. */
function isInertDocument(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): boolean {
  if (isMethodCall(node, ['createHTMLDocument', 'createDocument'])) return true;
  if (!isMethodCall(node, ['parseFromString'])) return false;
  let parser = (
    (node as TSESTree.CallExpression).callee as TSESTree.MemberExpression
  ).object;
  if (parser.type === 'Identifier') {
    const bound = bindingOf(parser, sourceCode);
    if (bound === null) return false;
    parser = bound.init;
  }
  return (
    parser.type === 'NewExpression' &&
    parser.callee.type === 'Identifier' &&
    parser.callee.name === 'DOMParser'
  );
}

/** Does this expression create a `<template>`, a `<style>`, or an inert document? */
function createsHolder(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): 'template' | 'style' | 'document' | 'element' | null {
  if (isInertDocument(node, sourceCode)) return 'document';
  if (!isMethodCall(node, ['createElement'])) return null;
  const call = node as TSESTree.CallExpression;
  const tag = staticString(call.arguments[0]);
  if (tag === 'template') return 'template';
  if (tag === 'style') return 'style';
  // An element made by an inert document belongs to it.
  const owner = (call.callee as TSESTree.MemberExpression).object;
  const ownerDocument =
    owner.type === 'Identifier' ? bindingOf(owner, sourceCode)?.init : owner;
  return ownerDocument !== undefined &&
    isInertDocument(ownerDocument, sourceCode)
    ? 'element'
    : null;
}

/** Does every use of this node read a string back out of the holder? */
function onlyReadsStrings(node: TSESTree.Node): boolean {
  const parent = node.parent as TSESTree.Node;
  if (parent.type !== 'MemberExpression' || parent.object !== node) {
    return false;
  }
  // A computed key names nothing (`null`), which no set contains.
  const name = propertyName(parent) as string;
  if (STAYS_INSIDE.has(name)) return true;
  if (TRANSIT.has(name)) return onlyReadsStrings(parent);
  if (name !== 'querySelector') return false;
  const call = parent.parent as TSESTree.Node;
  return call.type === 'CallExpression' && call.callee === parent
    ? onlyReadsStrings(call)
    : false;
}

/**
 * Is `receiver` (the object whose `innerHTML` is assigned) an inert holder?
 *
 * `holder.innerHTML = x`, `holder.content.innerHTML = x` and
 * `doc.body.innerHTML = x` all arrive here with the object written to.
 */
export function isInertHolder(
  receiver: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): boolean {
  let base = receiver;
  while (
    base.type === 'MemberExpression' &&
    TRANSIT.has(propertyName(base) as string)
  ) {
    base = base.object;
  }
  // `document.createElement('template').innerHTML = x`: nothing can read it
  // again, so nothing can carry a node out.
  if (base.type === 'CallExpression') {
    return createsHolder(base, sourceCode) !== null;
  }
  if (base.type !== 'Identifier') return false;
  const bound = bindingOf(base, sourceCode);
  if (bound === null) return false;
  const kind = createsHolder(bound.init, sourceCode);
  if (kind === null) return false;
  if (kind === 'style') return true;
  return bound.variable.references.every(
    (ref) => ref.init === true || onlyReadsStrings(ref.identifier),
  );
}
