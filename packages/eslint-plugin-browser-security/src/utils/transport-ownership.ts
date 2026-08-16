/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Who owns a cleartext URL string.
 *
 * Six rules in this package match `http://` or `ws://` in a string, and before
 * this file they all matched the SAME string. One line —
 * `fetch("http://api.acme-corp.io")` — drew four reports at three severities
 * under two CWEs, which is one fact told four times. Measured:
 *
 * | shape                                   | reports before |
 * |-----------------------------------------|---------------:|
 * | `fetch("http://…")`                     |              4 |
 * | `const API_BASE = "http://…"`           |              3 |
 * | `new WebSocket("ws://…")`               |              3 |
 *
 * The family now partitions the same way the innerHTML family does — by the
 * SHAPE that carries the strongest evidence, with the most specific rule
 * owning it and the general rule deferring. Deferral is only sound when the
 * owner provably covers the shape, so the boundary lives HERE, in one
 * predicate both sides call, rather than being restated in each rule where the
 * two definitions can drift apart.
 *
 * The partition:
 *
 * | shape                                    | owner                       |
 * |------------------------------------------|-----------------------------|
 * | URL argument of `fetch` / `axios.<verb>`  | `require-https-only`        |
 * | `http://` in a subresource position       | `detect-mixed-content`      |
 * | any other hardcoded `http://` URL         | `no-http-urls`              |
 * | URL argument of `new WebSocket(…)`        | `require-websocket-wss`     |
 * | any other `ws://` URL                     | `no-insecure-websocket`     |
 * | `ftp:` `tcp:` `mongodb:` `redis:` `mysql:`| `no-unencrypted-transmission`|
 *
 * @see https://cwe.mitre.org/data/definitions/319.html
 * @see https://cwe.mitre.org/data/definitions/311.html
 */

import type { TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES } from '@interlace/eslint-devkit';

/** HTTP verbs axios exposes as methods. A closed API surface, matched exactly. */
const AXIOS_HTTP_METHODS: ReadonlySet<string> = new Set([
  'get',
  'post',
  'put',
  'delete',
  'patch',
  'head',
  'options',
]);

/**
 * Climb from a string node to the expression that is actually an argument.
 *
 * A `Literal` is its own argument. A `TemplateElement` sits inside a
 * `TemplateLiteral`, and a concatenated URL sits inside a `+` chain — both are
 * still one URL being built for one call. Only these two shapes are traversed:
 * anything else (a call, a conditional, a member read) means the string's value
 * stopped being syntactically identifiable as the argument, and guessing past
 * that point is how a deferral turns into a coverage hole.
 */
function argumentAncestor(node: TSESTree.Node): TSESTree.Node {
  let current = node;
  let parent = current.parent;
  while (
    parent !== undefined &&
    (parent.type === AST_NODE_TYPES.TemplateLiteral ||
      (parent.type === AST_NODE_TYPES.BinaryExpression && parent.operator === '+'))
  ) {
    current = parent;
    parent = current.parent;
  }
  return current;
}

/**
 * Is this string the URL argument of a request call `require-https-only` owns?
 *
 * `fetch(url, init)` and `axios.<verb>(url, …)` both take the URL first. Both
 * are proof that a request is MADE, which is strictly more than "a string that
 * looks like a URL exists" — so this is the shape that gets the specific
 * finding, and `no-http-urls` / `no-unencrypted-transmission` /
 * `detect-mixed-content` all stand down on it.
 */
export function isRequestCallSiteUrl(node: TSESTree.Node): boolean {
  const argument = argumentAncestor(node);
  const call = argument.parent;
  if (call?.type !== AST_NODE_TYPES.CallExpression || call.arguments[0] !== argument) {
    return false;
  }
  const callee = call.callee;
  if (callee.type === AST_NODE_TYPES.Identifier) {
    return callee.name === 'fetch';
  }
  return (
    callee.type === AST_NODE_TYPES.MemberExpression &&
    !callee.computed &&
    callee.object.type === AST_NODE_TYPES.Identifier &&
    callee.object.name === 'axios' &&
    callee.property.type === AST_NODE_TYPES.Identifier &&
    AXIOS_HTTP_METHODS.has(callee.property.name)
  );
}

/**
 * Is this string the URL argument of `new WebSocket(…)`?
 *
 * `require-websocket-wss` owns it because it is the only one of the two
 * websocket rules that can FIX it — it ships an autofix and a suggestion that
 * rewrite `ws://` to `wss://` in place. `no-insecure-websocket` reported the
 * same constructor with no fix attached, so the pair cost the user a second
 * diagnostic and gave nothing back for it.
 */
export function isWebSocketConstructorUrl(node: TSESTree.Node): boolean {
  const argument = argumentAncestor(node);
  const call = argument.parent;
  return (
    call?.type === AST_NODE_TYPES.NewExpression &&
    call.callee.type === AST_NODE_TYPES.Identifier &&
    call.callee.name === 'WebSocket' &&
    call.arguments[0] === argument
  );
}

/**
 * JSX elements whose named attribute triggers a SUBRESOURCE load.
 *
 * This is the spec's own list, not a guess: these are the fetches a browser
 * blocks as mixed content when the document is HTTPS.
 *
 * `<a href>` is deliberately ABSENT. A link is a navigation, not a
 * subresource — the browser neither blocks nor warns on it, so calling it
 * mixed content describes behaviour that does not happen. It stays with
 * `no-http-urls`, where "hardcoded cleartext URL" is the true and actionable
 * statement.
 *
 * @see https://w3c.github.io/webappsec-mixed-content/
 */
const SUBRESOURCE_ATTRIBUTES: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  ['img', new Set(['src', 'srcSet', 'srcset'])],
  ['image', new Set(['src', 'href', 'xlinkHref'])],
  ['script', new Set(['src'])],
  ['link', new Set(['href'])],
  ['iframe', new Set(['src'])],
  ['frame', new Set(['src'])],
  ['embed', new Set(['src'])],
  ['object', new Set(['data'])],
  ['video', new Set(['src', 'poster'])],
  ['audio', new Set(['src'])],
  ['source', new Set(['src', 'srcSet', 'srcset'])],
  ['track', new Set(['src'])],
  ['input', new Set(['src'])],
  // A form POSTing over cleartext from an HTTPS page is "mixed form action",
  // which browsers warn on by name.
  ['form', new Set(['action'])],
]);

/**
 * DOM properties that are subresource URLs whatever element carries them.
 *
 * `el.src = "http://…"` is a subresource on every element that has a `src` —
 * img, script, iframe, audio, video, source, track, embed, input. There is no
 * element where assigning `.src` is a navigation, so the property alone is
 * sufficient evidence and no type information is needed.
 *
 * `.href` is NOT here: on `<a>` it navigates and on `<link>` it loads. Without
 * knowing the element the two are indistinguishable, and claiming the loading
 * one would report anchors as mixed content.
 */
const SUBRESOURCE_PROPERTIES: ReadonlySet<string> = new Set([
  'src',
  'srcset',
  'poster',
]);

/** Worker/document APIs whose first argument is fetched as a subresource. */
const SUBRESOURCE_LOADERS: ReadonlySet<string> = new Set(['importScripts']);

/**
 * Is this `http://` string written where a browser would load it as a
 * subresource of the current document?
 *
 * That — and only that — is mixed content. The predicate used to be "a string
 * Literal starting with `http://`", which is every hardcoded HTTP URL in the
 * program, so every finding restated one `no-http-urls` had already made. The
 * rule was demoted out of `recommended` for exactly that reason. Narrowing the
 * predicate to the thing the rule is NAMED for gives it territory no sibling
 * covers, which is what makes the demotion reversible.
 */
export function isSubresourcePosition(node: TSESTree.Node): boolean {
  const value = argumentAncestor(node);
  // Every node a visitor hands us is reached from Program, so it always has a
  // parent — only Program itself does not, and Program is never a string node.
  // Asserting beats an unreachable branch in a package held to 100% coverage.
  const parent = value.parent as TSESTree.Node;

  // <img src="http://…" />  —  element-aware, because <a href> is not this.
  if (
    parent.type === AST_NODE_TYPES.JSXAttribute &&
    parent.value === value &&
    parent.name.type === AST_NODE_TYPES.JSXIdentifier
  ) {
    return isSubresourceJsxAttribute(parent, parent.name.name);
  }
  // <img src={"http://…"} /> — the expression container is one hop further out.
  if (
    parent.type === AST_NODE_TYPES.JSXExpressionContainer &&
    parent.parent?.type === AST_NODE_TYPES.JSXAttribute &&
    parent.parent.name.type === AST_NODE_TYPES.JSXIdentifier
  ) {
    return isSubresourceJsxAttribute(parent.parent, parent.parent.name.name);
  }

  // el.src = "http://…"  /  el['src'] = "http://…"
  if (
    parent.type === AST_NODE_TYPES.AssignmentExpression &&
    parent.right === value &&
    parent.left.type === AST_NODE_TYPES.MemberExpression &&
    SUBRESOURCE_PROPERTIES.has(propertyNameOf(parent.left) ?? '')
  ) {
    return true;
  }

  // el.setAttribute('src', "http://…")  /  importScripts("http://…")
  if (parent.type === AST_NODE_TYPES.CallExpression) {
    const callee = parent.callee;
    if (
      callee.type === AST_NODE_TYPES.Identifier &&
      SUBRESOURCE_LOADERS.has(callee.name) &&
      parent.arguments.includes(value as TSESTree.CallExpressionArgument)
    ) {
      return true;
    }
    if (
      callee.type === AST_NODE_TYPES.MemberExpression &&
      !callee.computed &&
      callee.property.type === AST_NODE_TYPES.Identifier
    ) {
      if (
        SUBRESOURCE_LOADERS.has(callee.property.name) &&
        parent.arguments.includes(value as TSESTree.CallExpressionArgument)
      ) {
        return true;
      }
      // The attribute NAME is argument 0 and the URL is argument 1, so the
      // element stays unknown — but `setAttribute('src', …)` names the
      // subresource property outright, which is the same evidence as `.src =`.
      if (
        callee.property.name === 'setAttribute' &&
        parent.arguments[1] === value &&
        parent.arguments[0]?.type === AST_NODE_TYPES.Literal &&
        typeof parent.arguments[0].value === 'string' &&
        SUBRESOURCE_PROPERTIES.has(parent.arguments[0].value.toLowerCase())
      ) {
        return true;
      }
    }
  }

  return false;
}

/** Does `attributeName` load a subresource on the element this attribute is on? */
function isSubresourceJsxAttribute(
  attribute: TSESTree.JSXAttribute,
  attributeName: string,
): boolean {
  // A JSXAttribute's parent is exactly JSXOpeningElement in the grammar, so
  // the check is not a branch any fixture can take.
  const element = attribute.parent as TSESTree.JSXOpeningElement;
  const name = element.name;
  if (name.type !== AST_NODE_TYPES.JSXIdentifier) {
    return false;
  }
  // Host elements are lowercase; `<Image src=…>` is a component whose prop may
  // be anything at all, so there is no subresource to claim.
  const attributes = SUBRESOURCE_ATTRIBUTES.get(name.name);
  return attributes !== undefined && attributes.has(attributeName);
}

/** The static property name of a member expression, computed or not. */
function propertyNameOf(member: TSESTree.MemberExpression): string | undefined {
  if (!member.computed && member.property.type === AST_NODE_TYPES.Identifier) {
    return member.property.name;
  }
  if (
    member.computed &&
    member.property.type === AST_NODE_TYPES.Literal &&
    typeof member.property.value === 'string'
  ) {
    return member.property.value;
  }
  return undefined;
}
