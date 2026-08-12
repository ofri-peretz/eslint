/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Can an attacker steer where this URL expression *points*?
 *
 * The question every redirect / deep-link rule actually needs to answer, and
 * the one three rules in this package were getting wrong by asking a different
 * one: "does the surrounding text mention `window.location`?".
 *
 * That text test read the **sink** as if it were the **source**. In
 * `window.location.assign(requestUrl)` the substring `window.location` is the
 * navigation API being called, not user input flowing in — so every single
 * `location.assign(…)` / `location.replace(…)` in the corpus matched,
 * 12 of 12, none of them with an attacker-controlled argument.
 *
 * Three ideas make the answer honest:
 *
 * 1. **Only the argument counts.** Taint flows into the sink; the sink's own
 *    name is not evidence about it.
 * 2. **Only the readable parts of `location` are sources.** `location.href`,
 *    `.search`, `.hash` and `.pathname` carry whatever the attacker put in the
 *    address bar. `location.origin`, `.protocol`, `.host`, `.hostname` and
 *    `.port` are the *current* origin — echoing them back cannot send a user
 *    anywhere but where they already are, so they are not open-redirect
 *    sources. `origin` alone accounts for a corpus finding
 *    (`window.location.origin + '/' + query`).
 * 3. **Only the leading position of a concatenation sets the origin.** An open
 *    redirect needs control of the *scheme and host* of the target. In
 *    `issuerOrigin + '/login/x' + toQueryString({redirectUrl})` the origin is
 *    fixed by the first operand; nothing appended later can retarget it. So a
 *    concatenation is steerable only when its leftmost operand is, and a
 *    template literal only when it opens with an interpolation.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { resolveInitializer } from './resolve-binding';

/**
 * `location` properties whose value is chosen by whoever crafted the inbound
 * URL. The omissions are deliberate — see idea 2 above.
 */
const STEERABLE_LOCATION_PROPS: ReadonlySet<string> = new Set([
  'href',
  'search',
  'hash',
  'pathname',
]);

/** Globals that expose a `Location` under `.location`. */
const LOCATION_HOLDERS: ReadonlySet<string> = new Set([
  'window',
  'document',
  'self',
  'top',
  'parent',
  'globalThis',
]);

/** Server-request members that hold client-supplied data. */
const REQUEST_INPUT_PROPS: ReadonlySet<string> = new Set([
  'query',
  'body',
  'params',
]);

/**
 * Is this expression a `Location` object — `location`, `window.location`,
 * `document.location`, …?
 *
 * Exported because `no-insecure-redirects` needs the same test to decide
 * whether an `.assign(…)` / `.replace(…)` call is a *navigation* at all.
 */
export function isLocationObject(node: TSESTree.Node): boolean {
  if (node.type === 'Identifier') {
    return node.name === 'location';
  }
  return (
    node.type === 'MemberExpression' &&
    !node.computed &&
    node.property.type === 'Identifier' &&
    node.property.name === 'location' &&
    node.object.type === 'Identifier' &&
    LOCATION_HOLDERS.has(node.object.name)
  );
}

/**
 * `req.query.next`, `request.body.url`, `req.params.path`.
 *
 * The base identifier must actually be the request. Matching any `.body.x`
 * would swallow `response.body.data`, which is not client input.
 */
function isRequestInput(node: TSESTree.MemberExpression): boolean {
  let current: TSESTree.Node = node;
  let sawInputProp = false;
  while (current.type === 'MemberExpression') {
    if (
      !current.computed &&
      current.property.type === 'Identifier' &&
      REQUEST_INPUT_PROPS.has(current.property.name)
    ) {
      sawInputProp = true;
    }
    current = current.object;
  }
  return (
    sawInputProp &&
    current.type === 'Identifier' &&
    (current.name === 'req' || current.name === 'request')
  );
}

/**
 * String operations that reshape a URL without changing who controls it.
 *
 * `location.hash.slice(1)` is *the* canonical open-redirect source; treating a
 * call as opaque would have made stripping the leading `#` a sanitiser. None
 * of these can constrain the origin of the result.
 */
const STEERABILITY_PRESERVING_METHODS: ReadonlySet<string> = new Set([
  'slice',
  'substring',
  'substr',
  'trim',
  'trimStart',
  'trimEnd',
  'toString',
  'toLowerCase',
  'toUpperCase',
  'normalize',
  'valueOf',
]);

/** Global decoders that likewise pass control straight through. */
const STEERABILITY_PRESERVING_FUNCTIONS: ReadonlySet<string> = new Set([
  'decodeURI',
  'decodeURIComponent',
  'unescape',
  'String',
]);

/** A member read that yields attacker-supplied URL text. */
function isSteerableMember(node: TSESTree.MemberExpression): boolean {
  if (node.computed || node.property.type !== 'Identifier') {
    return isRequestInput(node);
  }
  const property = node.property.name;
  if (STEERABLE_LOCATION_PROPS.has(property) && isLocationObject(node.object)) {
    return true;
  }
  // `document.URL` and `document.referrer` are the two other DOM sources that
  // hand you a URL somebody else chose.
  if (
    (property === 'URL' || property === 'referrer') &&
    node.object.type === 'Identifier' &&
    node.object.name === 'document'
  ) {
    return true;
  }
  return isRequestInput(node);
}

/**
 * True when `node` evaluates to a URL whose **origin** an attacker can choose.
 *
 * `seen` guards the identifier-resolution recursion against `const a = a`
 * style cycles; callers never pass it.
 */
export function isAttackerSteerableUrl(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
  seen: Set<string> = new Set(),
): boolean {
  switch (node.type) {
    case 'MemberExpression':
      return isSteerableMember(node);

    case 'Identifier': {
      if (seen.has(node.name)) return false;
      seen.add(node.name);
      const init = resolveInitializer(node, sourceCode);
      return (
        init !== undefined && isAttackerSteerableUrl(init, sourceCode, seen)
      );
    }

    // `a + b` — only `a` can decide the scheme and host of the result.
    case 'BinaryExpression':
      return (
        node.operator === '+' &&
        isAttackerSteerableUrl(node.left as TSESTree.Node, sourceCode, seen)
      );

    // Same rule for templates: steerable only when the literal opens with the
    // interpolation, i.e. `${target}` and not `https://fixed.example/${path}`.
    case 'TemplateLiteral':
      return (
        node.quasis[0].value.cooked === '' &&
        node.expressions.length > 0 &&
        isAttackerSteerableUrl(node.expressions[0], sourceCode, seen)
      );

    // `location.hash.slice(1)`, `decodeURIComponent(location.search)`.
    case 'CallExpression': {
      const callee = node.callee;
      if (
        callee.type === 'MemberExpression' &&
        !callee.computed &&
        callee.property.type === 'Identifier' &&
        STEERABILITY_PRESERVING_METHODS.has(callee.property.name)
      ) {
        return isAttackerSteerableUrl(callee.object, sourceCode, seen);
      }
      if (
        callee.type === 'Identifier' &&
        STEERABILITY_PRESERVING_FUNCTIONS.has(callee.name) &&
        node.arguments.length > 0
      ) {
        return isAttackerSteerableUrl(node.arguments[0], sourceCode, seen);
      }
      // Any other call is opaque: a value passed INTO a function is not the
      // value that comes back out. `toQueryString({redirectUrl})` and
      // `setUrlQueryParams(urlObj, …)` are corpus findings that depend on this.
      return false;
    }

    case 'ConditionalExpression':
      return (
        isAttackerSteerableUrl(node.consequent, sourceCode, seen) ||
        isAttackerSteerableUrl(node.alternate, sourceCode, seen)
      );

    // `maybeTarget || location.hash` — either arm can be the result.
    case 'LogicalExpression':
      return (
        isAttackerSteerableUrl(node.left, sourceCode, seen) ||
        isAttackerSteerableUrl(node.right, sourceCode, seen)
      );

    default:
      // Literals, call results, `new URL(…)`, spreads. A value *passed into* a
      // function is not the value that comes back out, so call expressions are
      // deliberately opaque rather than transparent.
      return false;
  }
}
