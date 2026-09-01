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

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, isModuleBinding } from '@interlace/eslint-devkit';
import { isGlobalObject } from './global-object';

/** The Fetch API, matched exactly — bare or qualified by a global alias. */
const FETCH_NAMES: ReadonlySet<string> = new Set(['fetch']);

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
export function isRequestCallSiteUrl(
  node: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
): boolean {
  const argument = argumentAncestor(node);
  const call = argument.parent;
  return (
    call?.type === AST_NODE_TYPES.CallExpression &&
    call.arguments[0] === argument &&
    isRequestCall(call, scope)
  );
}

/**
 * Is this call one of the request APIs `require-https-only` owns?
 *
 * Split out from `isRequestCallSiteUrl` so the OWNER can key on
 * `CallExpression` while the rules that DEFER key on the string node they were
 * already visiting. Same predicate, so the two cannot drift — and the owner no
 * longer has to visit every `Literal` in the program to find the handful that
 * sit in a `fetch`.
 */
export function isRequestCall(
  call: TSESTree.CallExpression,
  scope: TSESLint.Scope.Scope,
): boolean {
  const callee = call.callee;
  // `fetch`, `window.fetch`, `self.fetch` and `globalThis.fetch` are the same
  // function. Matching only the bare identifier made the qualified spellings
  // invisible — and the qualified spelling is what instrumented, polyfilled and
  // worker code actually writes (`self.fetch` is the ONLY one available inside
  // a Worker). Found by the corpus: `window.fetch('http://metrics…')` fell
  // through to `no-http-urls`, so a proven cleartext request was reported as a
  // hardcoded string.
  if (isGlobalObject(callee, FETCH_NAMES)) {
    return true;
  }
  if (
    callee.type !== AST_NODE_TYPES.MemberExpression ||
    // `axios['get'](u)` issues the same request. `propertyNameOf` is right
    // there in this file; these two gates never reached for it.
    !AXIOS_HTTP_METHODS.has(propertyNameOf(callee) ?? '')
  ) {
    return false;
  }
  return isAxiosClient(callee.object, scope);
}

/**
 * Does this receiver denote the axios client?
 *
 * TWO independent signals, because either alone loses cases the other catches:
 *
 * 1. **A resolved module binding.** `import http from 'axios'` and
 *    `const client = require('axios')` are the same client under a different
 *    spelling, and a rule that matched the identifier missed both. Found by the
 *    corpus: `http.get('http://api…')` — a plain import rename, not an exotic
 *    shape — went unreported.
 * 2. **The bare identifier `axios`.** The conventional spelling, and the only
 *    signal available when the import is not in the file at all (a global
 *    script tag, an ambient declaration, a snippet). This is exact membership
 *    against a closed API surface, not a substring test.
 *
 * The two are unioned rather than one replacing the other: dropping (2) for the
 * "purer" (1) would have silently un-reported every codebase that does not
 * import axios in the same file, which is a recall loss dressed up as rigour.
 */
function isAxiosClient(receiver: TSESTree.Node, scope: TSESLint.Scope.Scope): boolean {
  if (isModuleBinding(receiver, scope, 'axios')) {
    return true;
  }
  return receiver.type === AST_NODE_TYPES.Identifier && receiver.name === 'axios';
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
    if (callee.type === AST_NODE_TYPES.MemberExpression) {
      const method = propertyNameOf(callee);
      if (
        SUBRESOURCE_LOADERS.has(method ?? '') &&
        parent.arguments.includes(value as TSESTree.CallExpressionArgument)
      ) {
        return true;
      }
      // The attribute NAME is argument 0 and the URL is argument 1, so the
      // element stays unknown — but `setAttribute('src', …)` names the
      // subresource property outright, which is the same evidence as `.src =`.
      if (
        method === 'setAttribute' &&
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

/**
 * `rel` values that make a `<link>` FETCH something.
 *
 * `<link rel="canonical" href="http://…">` declares an identity — it is
 * metadata for crawlers and issues no request at all, so it cannot be mixed
 * content and there is no remediation to offer. Same for `alternate`, `author`,
 * `me`, `license`. Keying on the element+attribute pair alone reported every
 * canonical tag in every server-rendered app, which is a false positive on a
 * line that is not even a URL the browser touches.
 *
 * `rel` is a space-separated token list (`rel="shortcut icon"`), so any token
 * matching is enough.
 *
 * @see https://html.spec.whatwg.org/multipage/links.html#linkTypes
 */
const FETCHING_LINK_RELS: ReadonlySet<string> = new Set([
  'stylesheet',
  'preload',
  'modulepreload',
  'prefetch',
  'prerender',
  'icon',
  'apple-touch-icon',
  'apple-touch-startup-image',
  'mask-icon',
  'manifest',
  'preconnect',
  'dns-prefetch',
]);

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
  if (attributes === undefined || !attributes.has(attributeName)) {
    return false;
  }
  // `<link href>` is the one pair where the element and attribute are not
  // enough: whether a request happens is decided by `rel`.
  if (name.name === 'link') {
    return hasFetchingRel(element);
  }
  return true;
}

/** Does this `<link>` carry a `rel` that causes a fetch? */
function hasFetchingRel(element: TSESTree.JSXOpeningElement): boolean {
  for (const attribute of element.attributes) {
    if (
      attribute.type !== AST_NODE_TYPES.JSXAttribute ||
      attribute.name.type !== AST_NODE_TYPES.JSXIdentifier ||
      attribute.name.name !== 'rel'
    ) {
      continue;
    }
    const value = attribute.value;
    const rel =
      value?.type === AST_NODE_TYPES.Literal && typeof value.value === 'string'
        ? value.value
        : undefined;
    // A dynamic `rel={x}` is unknowable, and a missing one means the link does
    // nothing. Both fail closed to "not a subresource": `no-http-urls` still
    // reports the cleartext URL, so declining here costs the family no
    // coverage, while guessing would cost every canonical tag.
    if (rel === undefined) {
      return false;
    }
    return rel
      .toLowerCase()
      .split(/\s+/)
      .some((token) => FETCHING_LINK_RELS.has(token));
  }
  return false;
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
