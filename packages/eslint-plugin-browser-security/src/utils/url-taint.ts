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
 * 4. **A URL parser is not a sanitiser.** `new URLSearchParams(location.search)`
 *    and `new URL(location.href)` are *containers*: they hold the inbound text,
 *    they do not neutralise it. Treating every call as opaque (idea 3's
 *    deliberate conservatism) made the single commonest open-redirect source in
 *    front-end code — `new URLSearchParams(location.search).get('next')` —
 *    invisible to every rule in this family at once. Constructor and reader are
 *    now matched as a pair, so the *content* of the container is what decides,
 *    never the spelling of the variable it was stored in.
 *
 *    The CONTAINER itself is deliberately not steerable — only what is read out
 *    of it. `const { origin } = new URL(location.href)` binds the one property
 *    that carries nothing an attacker chose, and a container that answered
 *    "steerable" on its own turned that line into a finding in every consumer
 *    whose own binding resolution does not distinguish a pattern from a name.
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
    const property = staticProperty(current);
    if (property !== null && REQUEST_INPUT_PROPS.has(property)) {
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
export const STEERABILITY_PRESERVING_METHODS: ReadonlySet<string> = new Set([
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
export const STEERABILITY_PRESERVING_FUNCTIONS: ReadonlySet<string> = new Set([
  'decodeURI',
  'decodeURIComponent',
  'unescape',
  'String',
]);

/**
 * The property name of a member access, however it is spelled.
 *
 * `location['search']` is the same read as `location.search`, and every member
 * test in this family compared `property.type === 'Identifier'` first — so one
 * bracket made the source disappear from all five rules at once.
 */
function staticProperty(node: TSESTree.MemberExpression): string | null {
  if (!node.computed) {
    return node.property.type === 'Identifier' ? node.property.name : null;
  }
  return node.property.type === 'Literal' &&
    typeof node.property.value === 'string'
    ? node.property.value
    : null;
}

/**
 * The initialiser a name is bound to, but only when the binding is a plain
 * identifier.
 *
 * `resolveInitializer` hands back the whole initialiser for a destructuring
 * declaration, so `const { origin } = new URL(location.href)` resolved `origin`
 * to the `URL` — and once a `URL` container became steerable in its own right,
 * that turned the one same-origin property into a finding. A pattern binds a
 * PART of the initialiser, and this file cannot say which part.
 */
export function resolveBoundInitializer(
  identifier: TSESTree.Identifier,
  sourceCode: TSESLint.SourceCode,
): TSESTree.Expression | undefined {
  const init = resolveInitializer(identifier, sourceCode);
  if (init === undefined) return undefined;
  const declarator = init.parent;
  if (
    declarator?.type === 'VariableDeclarator' &&
    declarator.id.type !== 'Identifier'
  ) {
    return undefined;
  }
  return init;
}

/** A member read that yields attacker-supplied URL text. */
function isSteerableMember(node: TSESTree.MemberExpression): boolean {
  const property = staticProperty(node);
  if (property === null) {
    return isRequestInput(node);
  }
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

/* -------------------------------------------------------------------------- */
/* URL containers — the parser is not a sanitiser                             */
/* -------------------------------------------------------------------------- */

/**
 * What kind of URL object an expression denotes, or `null` for anything else.
 *
 * `'url'` is a `URL` built over inbound text; `'params'` is a `URLSearchParams`
 * over it. The two are tracked separately because they answer the origin
 * question differently: a `URL` stringifies back to a full absolute URL and so
 * IS steerable on its own, while a `URLSearchParams` stringifies to a query
 * string that can never set a scheme or a host — only the values *read out* of
 * it can.
 */
type UrlContainerKind = 'url' | 'params';

const URL_CONSTRUCTORS: ReadonlySet<string> = new Set(['URL']);
const PARAMS_CONSTRUCTORS: ReadonlySet<string> = new Set(['URLSearchParams']);

/** Readers that hand back one attacker-chosen value out of a `URLSearchParams`. */
const PARAMS_READERS: ReadonlySet<string> = new Set(['get', 'getAll']);

/** Methods that stringify a `URL` back to the absolute URL it was built from. */
const URL_STRINGIFIERS: ReadonlySet<string> = new Set([
  'toString',
  'toJSON',
  'valueOf',
]);

/**
 * Is this identifier the environment's global of that name, rather than a local
 * of the author's?
 *
 * `class URL { … }` or `function URLSearchParams(…)` in the file under lint is
 * not the WHATWG constructor, and reading it as one would be exactly the
 * spelling-based verdict this file exists to avoid.
 */
function isUnshadowedGlobal(
  node: TSESTree.Node,
  names: ReadonlySet<string>,
  sourceCode: TSESLint.SourceCode,
): boolean {
  if (node.type !== 'Identifier' || !names.has(node.name)) return false;
  for (
    let scope: TSESLint.Scope.Scope | null = sourceCode.getScope(node);
    scope !== null;
    scope = scope.upper
  ) {
    const variable = scope.variables.find((v) => v.name === node.name);
    // A global-scope entry with no definition is the environment's.
    if (variable !== undefined) return variable.defs.length === 0;
  }
  return true;
}

/**
 * `new URLSearchParams(location.search)`, `new URL(location.href)`,
 * `new URL(location.href).searchParams`, and any `const` alias of those.
 *
 * The constructor argument must itself be steerable. `new URLSearchParams({q: 1})`
 * and `new URL('/x', 'https://fixed.example')` hold nothing an attacker wrote,
 * so they are not containers of anything and return `null`.
 */
function urlContainerKind(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
  seen: Set<string>,
): UrlContainerKind | null {
  switch (node.type) {
    case 'NewExpression': {
      const [argument] = node.arguments;
      if (argument === undefined || argument.type === 'SpreadElement') {
        return null;
      }
      if (!isAttackerSteerableUrl(argument, sourceCode, seen)) return null;
      if (isUnshadowedGlobal(node.callee, PARAMS_CONSTRUCTORS, sourceCode)) {
        return 'params';
      }
      if (isUnshadowedGlobal(node.callee, URL_CONSTRUCTORS, sourceCode)) {
        return 'url';
      }
      return null;
    }

    case 'MemberExpression': {
      // `new URL(location.href).searchParams` — a params view onto a URL.
      if (staticProperty(node) !== 'searchParams') {
        return null;
      }
      return urlContainerKind(node.object, sourceCode, seen) === 'url'
        ? 'params'
        : null;
    }

    case 'Identifier': {
      if (seen.has(node.name)) return null;
      seen.add(node.name);
      const init = resolveBoundInitializer(node, sourceCode);
      return init === undefined
        ? null
        : urlContainerKind(init, sourceCode, seen);
    }

    default:
      return null;
  }
}

/**
 * `params.get('next')` — the value an attacker put in one query key, and
 * `parsed.pathname` / `parsed.toString()` — the readable parts of a `URL`.
 */
function isUrlContainerRead(
  node: TSESTree.CallExpression | TSESTree.MemberExpression,
  sourceCode: TSESLint.SourceCode,
  seen: Set<string>,
): boolean {
  // A COPY of the cycle guard, never the caller's own.
  //
  // `seen` records the identifiers already being resolved on the current path.
  // Asking "is this receiver a URL container?" walks the same bindings, and
  // answering "no" left their names in the caller's set — so the very next
  // question about the same binding short-circuited to `false`.
  // `const raw = window.location.hash; const t = raw.slice(1); location.replace(t)`
  // stopped being a finding, because the container probe on `raw` poisoned the
  // passthrough walk that ran immediately after it.
  const probe = new Set(seen);
  if (node.type === 'CallExpression') {
    const callee = node.callee;
    if (callee.type !== 'MemberExpression') return false;
    const reader = staticProperty(callee);
    if (reader === null) return false;
    const kind = urlContainerKind(callee.object, sourceCode, probe);
    if (kind === 'params') return PARAMS_READERS.has(reader);
    return kind === 'url' && URL_STRINGIFIERS.has(reader);
  }
  const property = staticProperty(node);
  return (
    property !== null &&
    STEERABLE_LOCATION_PROPS.has(property) &&
    urlContainerKind(node.object, sourceCode, probe) === 'url'
  );
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
      // `new URL(location.href).pathname` — `//evil.test` is a legal pathname,
      // and assigning it navigates off-origin.
      return (
        isSteerableMember(node) || isUrlContainerRead(node, sourceCode, seen)
      );


    case 'Identifier': {
      if (seen.has(node.name)) return false;
      seen.add(node.name);
      const init = resolveBoundInitializer(node, sourceCode);
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
      // Checked FIRST: `parsedUrl.toString()` is both a container read and a
      // passthrough-method call, and the passthrough branch would recurse into
      // the container — which is deliberately not steerable on its own — and
      // answer "no" before the container read was ever considered.
      if (isUrlContainerRead(node, sourceCode, seen)) return true;
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
      // Literals, spreads, `new Something(…)` that is not a URL container. A
      // value *passed into* an unknown function is not the value that comes
      // back out, so those call expressions stay opaque.
      return false;
  }
}
