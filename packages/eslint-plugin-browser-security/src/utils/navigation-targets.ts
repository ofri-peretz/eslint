/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Where a navigation *goes*, and where its URL *came from* — the two questions
 * the "URL, auth & tracking" group keeps needing and that `utils/url-taint.ts`
 * deliberately stops short of.
 *
 * Two gaps this closes, both found by probing rather than by reading tests:
 *
 * 1. **The query-string reader is invisible.** `isAttackerSteerableUrl` treats
 *    every call result as opaque, which is right for `sanitize(x)` and wrong
 *    for the single most common open-redirect source in front-end code:
 *
 *    ```js
 *    const next = new URLSearchParams(location.search).get('next');
 *    window.location.href = next;                   // reported by NOBODY
 *    ```
 *
 *    `URLSearchParams.get`, `URL.searchParams` and the router hooks are a
 *    CLOSED, standard API surface whose whole job is to hand back a piece of
 *    the inbound URL. Passing steerability through them is not a guess — it is
 *    reading the spec. The opacity of an unknown call is untouched.
 *
 * 2. **A `Location` reached by a computed key is invisible.** `isLocationObject`
 *    matches `window.location` but not `window['location']`, so a bundler-mangled
 *    or defensively-written codebase drops out of every redirect rule at once.
 *
 * Nothing here decides anything from a name. The globals, the location
 * property names, the `URL`/`URLSearchParams` constructors and the router
 * modules are all matched by exact membership against closed sets; the router
 * binding is resolved to its import.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { isModuleBinding } from '@interlace/eslint-devkit';
import { isAttackerSteerableUrl } from './url-taint';
import { resolveInitializer } from './resolve-binding';

/**
 * Globals that expose a `Location`.
 *
 * Wider than `utils/global-object.ts`'s alias set on purpose: `top.location`
 * and `parent.location` are a different *window*, which makes reading them a
 * cross-origin access — but WRITING them is still a navigation the attacker
 * gets to steer, and framebusting code writes exactly those.
 */
const LOCATION_HOLDERS: ReadonlySet<string> = new Set([
  'window',
  'document',
  'self',
  'top',
  'parent',
  'globalThis',
]);

/** `location` properties that carry text somebody else chose. */
const STEERABLE_LOCATION_PROPS: ReadonlySet<string> = new Set([
  'href',
  'search',
  'hash',
  'pathname',
]);

/** The static string a property key denotes, computed or not. */
function staticKey(node: TSESTree.MemberExpression): string | null {
  if (!node.computed) {
    return node.property.type === 'Identifier' ? node.property.name : null;
  }
  return node.property.type === 'Literal' &&
    typeof node.property.value === 'string'
    ? node.property.value
    : null;
}

/**
 * Is this expression a `Location` object?
 *
 * Superset of `url-taint`'s `isLocationObject`: it also accepts the computed
 * spelling `window['location']`. The holder must still be a global that
 * actually owns a `Location` — `myApp.location` is a plain property and stays
 * out, which is what keeps `myapp.location.href = req.query.next` quiet.
 */
export function isLocationTarget(node: TSESTree.Node): boolean {
  if (node.type === 'Identifier') {
    return node.name === 'location';
  }
  return (
    node.type === 'MemberExpression' &&
    staticKey(node) === 'location' &&
    node.object.type === 'Identifier' &&
    LOCATION_HOLDERS.has(node.object.name)
  );
}

/**
 * Is this assignment target a whole-page navigation?
 *
 * Two spellings, one effect — the browser navigates the current document:
 *
 * ```js
 * window.location = next;        // replace the Location object
 * top.location.href = next;      // write its href
 * window['location'].href = next;
 * ```
 *
 * The bare `location = next` is deliberately NOT here: an unqualified
 * identifier assignment is far more often a local variable being set than the
 * global being navigated, and there is no evidence in the AST to tell them
 * apart.
 */
export function isLocationNavigationWrite(node: TSESTree.Node): boolean {
  if (node.type !== 'MemberExpression') return false;
  // `<holder>.location = x`
  if (isLocationTarget(node) && node.object.type === 'Identifier') return true;
  // `<Location>.href = x`
  return staticKey(node) === 'href' && isLocationTarget(node.object);
}

/**
 * Is this a `Location` method call that navigates?
 *
 * `assign` and `replace` are two of the most overloaded names in JavaScript —
 * `Object.assign`, `String.prototype.replace` — so the receiver has to be a
 * real `Location` or this is not a navigation.
 */
export function isLocationNavigationCall(
  node: TSESTree.CallExpression,
): boolean {
  const callee = node.callee;
  if (callee.type !== 'MemberExpression') return false;
  const method = staticKey(callee);
  return (
    (method === 'assign' || method === 'replace') && isLocationTarget(callee.object)
  );
}

/**
 * Is this a read of a `Location` property whose value the attacker chose?
 *
 * `location.origin`, `.protocol`, `.host` are deliberately absent — echoing
 * the CURRENT origin back cannot send anyone anywhere new. Same omission list
 * as `url-taint`, restated here because this accepts the computed holder.
 */
function isSteerableLocationRead(node: TSESTree.Node): boolean {
  if (node.type !== 'MemberExpression') return false;
  const key = staticKey(node);
  return (
    key !== null &&
    STEERABLE_LOCATION_PROPS.has(key) &&
    isLocationTarget(node.object)
  );
}

/** Router packages whose `useRouter()` returns a real URL navigator. */
const ROUTER_MODULES: readonly string[] = [
  'next/navigation',
  'next/router',
  'vue-router',
  'react-router',
  'react-router-dom',
  '@tanstack/react-router',
];

/** Packages whose `useSearchParams()` hands back the inbound query string. */
const SEARCH_PARAM_MODULES: readonly string[] = [
  'next/navigation',
  'react-router',
  'react-router-dom',
];

/**
 * Is `node` a call of `hook` imported from one of `modules`?
 *
 * The import is the evidence. A locally declared `function useRouter()` that
 * returns `{ push: console.log }` resolves to no module binding and is
 * correctly ignored — the spelling alone never counts.
 */
function isHookCallFrom(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
  hook: string,
  modules: readonly string[],
): boolean {
  if (node.type !== 'CallExpression' || node.callee.type !== 'Identifier') {
    return false;
  }
  if (node.callee.name !== hook) return false;
  const scope = sourceCode.getScope(node.callee);
  return modules.some((module) =>
    isModuleBinding(node.callee, scope, module, [hook]),
  );
}

/**
 * The kind of URL container this expression evaluates to, if any.
 *
 * `'params'` — a `URLSearchParams` built from steerable text, or the object a
 * router's `useSearchParams()` returns.
 * `'url'` — a `URL` parsed from steerable text.
 */
function urlContainerKind(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
  seen: Set<string>,
): 'params' | 'url' | null {
  switch (node.type) {
    case 'NewExpression': {
      if (node.callee.type !== 'Identifier') return null;
      const first = node.arguments[0];
      if (first === undefined || first.type === 'SpreadElement') return null;
      // `new URL(path, 'http://e.c')` parses a RELATIVE path against a fixed
      // base, so the base pins the origin and only the *first* argument can
      // carry steerable text into the result.
      if (node.callee.name === 'URLSearchParams') {
        return isSteerableUrlValue(first, sourceCode, seen) ? 'params' : null;
      }
      if (node.callee.name === 'URL') {
        return isSteerableUrlValue(first, sourceCode, seen) ? 'url' : null;
      }
      return null;
    }

    case 'MemberExpression': {
      // `new URL(location.href).searchParams`
      if (
        staticKey(node) === 'searchParams' &&
        urlContainerKind(node.object, sourceCode, seen) === 'url'
      ) {
        return 'params';
      }
      return null;
    }

    case 'CallExpression': {
      if (isHookCallFrom(node, sourceCode, 'useSearchParams', SEARCH_PARAM_MODULES)) {
        return 'params';
      }
      return null;
    }

    // `const params = useSearchParams()` and React Router's tuple form
    // `const [params] = useSearchParams()` both resolve here: the declarator's
    // initialiser is the hook call in either case, and `resolveInitializer`
    // refuses anything re-assigned or multiply declared. `seen` stops a
    // self-referential `const a = a` from recursing.
    case 'Identifier': {
      if (seen.has(node.name)) return null;
      seen.add(node.name);
      const init = resolveInitializer(node, sourceCode);
      return init === undefined ? null : urlContainerKind(init, sourceCode, seen);
    }

    default:
      return null;
  }
}

/** Readers on a `URLSearchParams` that return inbound query text verbatim. */
const PARAM_READERS: ReadonlySet<string> = new Set(['get', 'getAll']);

/** The function a name refers to, when the name resolves to exactly one. */
function resolveFunctionNode(
  identifier: TSESTree.Identifier,
  sourceCode: TSESLint.SourceCode,
):
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression
  | TSESTree.ArrowFunctionExpression
  | undefined {
  for (
    let scope: TSESLint.Scope.Scope | null = sourceCode.getScope(identifier);
    scope !== null;
    scope = scope.upper
  ) {
    const variable = scope.variables.find((v) => v.name === identifier.name);
    if (variable === undefined) continue;
    if (variable.defs.length !== 1) return undefined;
    const def = variable.defs[0];
    if (def.type === 'FunctionName') {
      // `declare function f(x): string` and a TS overload signature are
      // `TSDeclareFunction` / `TSEmptyBodyFunctionExpression` — they have NO
      // body, so there is nothing to read and no identity to prove.
      return def.node.type === 'FunctionDeclaration' ? def.node : undefined;
    }
    const init = resolveInitializer(identifier, sourceCode);
    if (
      init !== undefined &&
      (init.type === 'FunctionExpression' ||
        init.type === 'ArrowFunctionExpression')
    ) {
      return init;
    }
    return undefined;
  }
  return undefined;
}

/**
 * The argument index a knowable function hands straight back, if it does.
 *
 * `isAttackerSteerableUrl` treats every call as opaque, which is right for an
 * unknown `sanitizeRedirect(x)` and wrong for a helper we can READ:
 *
 * ```js
 * function normalize(value) { return value; }
 * location.assign(normalize(new URLSearchParams(location.search).get('next')));
 * ```
 *
 * `normalize` constrains nothing, and we can prove it constrains nothing —
 * the returned expression IS a parameter. Opacity is the correct default for
 * a black box, not a licence to ignore source we have in front of us. Only the
 * pure identity shape counts; a function that does anything else stays opaque.
 */
export function identityArgumentIndex(
  node: TSESTree.CallExpression,
  sourceCode: TSESLint.SourceCode,
): number | null {
  if (node.callee.type !== 'Identifier') return null;
  const fn = resolveFunctionNode(node.callee, sourceCode);
  if (fn === undefined) return null;

  const returned =
    fn.body.type === 'BlockStatement'
      ? fn.body.body.length === 1 &&
        fn.body.body[0].type === 'ReturnStatement'
        ? fn.body.body[0].argument
        : null
      : fn.body;
  if (returned === null || returned === undefined) return null;
  if (returned.type !== 'Identifier') return null;

  const index = fn.params.findIndex(
    (param) => param.type === 'Identifier' && param.name === returned.name,
  );
  return index === -1 ? null : index;
}

/**
 * True when an attacker can choose the **origin** this expression points at.
 *
 * Everything `isAttackerSteerableUrl` accepts, plus the standard URL-parsing
 * surface it treats as opaque. Use this in a navigation rule; use the plain
 * helper when you specifically want the narrower question.
 */
export function isSteerableUrlValue(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
  seen: Set<string> = new Set(),
): boolean {
  if (isAttackerSteerableUrl(node, sourceCode)) return true;
  // `window['location'].hash` — the computed holder url-taint cannot see.
  if (isSteerableLocationRead(node)) return true;

  switch (node.type) {
    case 'CallExpression': {
      // `params.get('next')` — only when `params` is provably a URLSearchParams
      // over inbound text. A `.get` on anything else stays opaque.
      const callee = node.callee;
      if (
        callee.type === 'MemberExpression' &&
        // `params['get']('next')` reads the same parameter `params.get` does.
        // This file already carries `staticKey` for exactly this; the test
        // never adopted it.
        PARAM_READERS.has(staticKey(callee) ?? '') &&
        urlContainerKind(callee.object, sourceCode, seen) === 'params'
      ) {
        return true;
      }
      // A local helper we can read to be the identity function passes the
      // value straight through; an unknown call stays opaque.
      const index = identityArgumentIndex(node, sourceCode);
      if (index !== null) {
        const argument = node.arguments[index];
        return (
          argument !== undefined &&
          argument.type !== 'SpreadElement' &&
          isSteerableUrlValue(argument, sourceCode, seen)
        );
      }
      return false;
    }

    case 'MemberExpression': {
      // `new URL(location.href).hash`, `parsed.pathname`.
      const key = staticKey(node);
      return (
        key !== null &&
        STEERABLE_LOCATION_PROPS.has(key) &&
        urlContainerKind(node.object, sourceCode, seen) === 'url'
      );
    }

    case 'Identifier': {
      if (seen.has(node.name)) return false;
      seen.add(node.name);
      const init = resolveInitializer(node, sourceCode);
      return init !== undefined && isSteerableUrlValue(init, sourceCode, seen);
    }

    // The concatenation rules are `url-taint`'s and are re-applied here so a
    // query-reader in the LEADING position still counts.
    case 'BinaryExpression':
      return (
        node.operator === '+' &&
        isSteerableUrlValue(node.left as TSESTree.Node, sourceCode, seen)
      );

    case 'TemplateLiteral':
      return (
        node.quasis[0].value.cooked === '' &&
        node.expressions.length > 0 &&
        isSteerableUrlValue(node.expressions[0], sourceCode, seen)
      );

    case 'LogicalExpression':
      return (
        isSteerableUrlValue(node.left, sourceCode, seen) ||
        isSteerableUrlValue(node.right, sourceCode, seen)
      );

    case 'ConditionalExpression':
      return (
        isSteerableUrlValue(node.consequent, sourceCode, seen) ||
        isSteerableUrlValue(node.alternate, sourceCode, seen)
      );

    default:
      return false;
  }
}

/**
 * Does this test prove the value is a SAME-ORIGIN relative path?
 *
 * The other half of an open-redirect fix. `isAnchoredHostGuard` handles the
 * allowlist form (`/^https:\/\/app\.acme\.io$/.test(next)`); this handles the
 * form OWASP actually recommends first — refuse anything that is not a
 * site-relative path:
 *
 * ```js
 * location.assign(next.startsWith('/') && !next.startsWith('//') ? next : '/');
 * ```
 *
 * Both halves are required, and that is the whole point. `next.startsWith('/')`
 * alone still accepts `//evil.test/login`, which every browser reads as a
 * protocol-relative absolute URL — a "guard" that is really the bug. So a
 * conjunction that only asserts the leading slash stays REPORTED.
 *
 * Matched on the AST: the receiver of the two `startsWith` calls must be the
 * same source text, and the arguments must be the literals `'/'` and `'//'`.
 * The regex spelling `/^\/[^/]/` and `/^\/(?!\/)/` are accepted as the single
 * conjunct that expresses both halves at once.
 */
export function isRelativePathGuard(
  test: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): boolean {
  const conjuncts: TSESTree.Node[] = [];
  const flatten = (node: TSESTree.Node): void => {
    if (node.type === 'LogicalExpression' && node.operator === '&&') {
      flatten(node.left);
      flatten(node.right);
      return;
    }
    conjuncts.push(node);
  };
  flatten(test);

  /** `<receiver>.startsWith(<literal>)`, negated or not. */
  const startsWith = (
    node: TSESTree.Node,
    negated: boolean,
  ): { receiver: string; prefix: string } | null => {
    let current = node;
    let seenNegation = false;
    while (current.type === 'UnaryExpression' && current.operator === '!') {
      seenNegation = !seenNegation;
      current = current.argument;
    }
    if (seenNegation !== negated) return null;
    if (
      current.type !== 'CallExpression' ||
      current.callee.type !== 'MemberExpression' ||
      staticKey(current.callee) !== 'startsWith'
    ) {
      return null;
    }
    const argument = current.arguments[0];
    if (
      argument === undefined ||
      argument.type !== 'Literal' ||
      typeof argument.value !== 'string'
    ) {
      return null;
    }
    return {
      receiver: sourceCode.getText(current.callee.object),
      prefix: argument.value,
    };
  };

  // The regex spelling says both halves in one conjunct.
  const rejectsBothViaRegex = conjuncts.some((conjunct) => {
    if (
      conjunct.type !== 'CallExpression' ||
      conjunct.callee.type !== 'MemberExpression' ||
      conjunct.callee.computed ||
      conjunct.callee.property.type !== 'Identifier' ||
      conjunct.callee.property.name !== 'test' ||
      conjunct.callee.object.type !== 'Literal' ||
      !('regex' in conjunct.callee.object) ||
      conjunct.callee.object.regex === undefined
    ) {
      return false;
    }
    const { pattern } = conjunct.callee.object.regex;
    return pattern.startsWith('^\\/[^/') || pattern.startsWith('^\\/(?!\\/)');
  });
  if (rejectsBothViaRegex) return true;

  const positives = conjuncts
    .map((conjunct) => startsWith(conjunct, false))
    .filter((hit): hit is { receiver: string; prefix: string } => hit !== null)
    .filter((hit) => hit.prefix === '/');
  if (positives.length === 0) return false;

  return conjuncts.some((conjunct) => {
    const hit = startsWith(conjunct, true);
    return (
      hit !== null &&
      hit.prefix === '//' &&
      positives.some((positive) => positive.receiver === hit.receiver)
    );
  });
}

/** The `URL` components that identify an origin. */
const ORIGIN_COMPONENTS: ReadonlySet<string> = new Set([
  'origin',
  'host',
  'hostname',
]);

/**
 * Does this test compare a PARSED origin against a fixed value?
 *
 * The remediation the WHATWG spec makes possible and every modern guide
 * recommends first:
 *
 * ```js
 * const parsed = new URL(next, location.origin);
 * if (parsed.origin === 'https://app.acme-corp.io') location.assign(next);
 * ```
 *
 * `new URL(…).origin` cannot be spoofed the way a `startsWith` prefix can —
 * `https://app.acme-corp.io.evil.test` parses to a different origin and fails.
 * The rule's old text scan looked for the literal spelling `url.hostname ===`,
 * so the identical check written on a binding called `parsed` was invisible and
 * the correct fix drew a HIGH-severity report.
 *
 * Only ever GRANTS validation: a shape it cannot prove leaves the caller
 * exactly where it was.
 */
export function isOriginEqualityGuard(
  test: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): boolean {
  /** `<expr>.origin` where `<expr>` is provably a parsed `URL`. */
  const isParsedOriginRead = (node: TSESTree.Node): boolean =>
    node.type === 'MemberExpression' &&
    ORIGIN_COMPONENTS.has(staticKey(node) ?? '') &&
    urlContainerKind(node.object, sourceCode, new Set()) === 'url';

  const visit = (node: TSESTree.Node, depth: number): boolean => {
    if (depth > 6) return false;
    switch (node.type) {
      case 'LogicalExpression':
        return visit(node.left, depth + 1) || visit(node.right, depth + 1);
      case 'BinaryExpression':
        if (node.operator !== '===' && node.operator !== '==') return false;
        return (
          isParsedOriginRead(node.left as TSESTree.Node) ||
          isParsedOriginRead(node.right)
        );
      default:
        return false;
    }
  };
  return visit(test, 0);
}

/**
 * Is this callee a function whose body we can actually read?
 *
 * The distinction that lets a redirect rule stop guessing from names. An
 * imported `isValidUrl` is a black box — deferring to it is a judgement call
 * about an unknown, and the conservative answer is to trust it. A LOCAL
 * `const isSafeUrl = (u) => u` is not unknown at all: we can see that it
 * validates nothing, and trusting it because of its spelling is precisely the
 * evasion an allowlist-by-name invites.
 */
function resolvesToKnowableFunction(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): boolean {
  if (node.type !== 'Identifier') return false;
  for (
    let scope: TSESLint.Scope.Scope | null = sourceCode.getScope(node);
    scope !== null;
    scope = scope.upper
  ) {
    const variable = scope.variables.find((v) => v.name === node.name);
    if (variable === undefined) continue;
    if (variable.defs.length !== 1) return false;
    if (variable.defs[0].type === 'FunctionName') return true;
    const init = resolveInitializer(node, sourceCode);
    return (
      init !== undefined &&
      (init.type === 'FunctionExpression' ||
        init.type === 'ArrowFunctionExpression')
    );
  }
  return false;
}

/**
 * Is this test an UNANALYZABLE predicate applied to the redirect target?
 *
 * The name-free replacement for the pattern list this rule used to carry:
 *
 * ```ts
 * /\b(validateUrl|validateRedirect|isValidUrl|isSafeUrl)\s*\(/   // by name
 * /\bstartsWith\s*\(\s*['"]/                                      // by spelling
 * /\b\w+\.(includes|has)\s*\(/                                    // anywhere nearby
 * ```
 *
 * Three things had to be true for that list to suppress, and none of them was
 * evidence: the function had a blessed NAME, the text appeared within five
 * statements, and nobody checked the result was used. `url.startsWith('https://')`
 * as a bare expression statement — a no-op whose value is discarded, and which
 * does not constrain the host either way — silenced the finding.
 *
 * What counts now: the target is PASSED IN to a predicate whose implementation
 * we cannot see. `ALLOWED.includes(next)` and `isValidUrl(next)` qualify.
 * `next.startsWith('https://trusted.acme.io')` does NOT — there the target is
 * the receiver, not the argument, and the prefix check is defeated by
 * `https://trusted.acme.io.evil.test`; if a prefix check is genuinely the fix,
 * `isRelativePathGuard` proves it. A predicate we CAN read has to prove
 * something on its own.
 */
export function isOpaquePredicateOverTarget(
  test: TSESTree.Node,
  target: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): boolean {
  const targetText = sourceCode.getText(target);

  const visit = (node: TSESTree.Node, depth: number): boolean => {
    if (depth > 6) return false;
    if (node.type === 'LogicalExpression') {
      return visit(node.left, depth + 1) || visit(node.right, depth + 1);
    }
    if (node.type !== 'CallExpression') return false;
    const receivesTarget = node.arguments.some(
      (argument) =>
        argument.type !== 'SpreadElement' &&
        sourceCode.getText(argument) === targetText,
    );
    if (!receivesTarget) return false;
    return !resolvesToKnowableFunction(node.callee, sourceCode);
  };

  return visit(test, 0);
}

/**
 * Is this navigation guarded by something that constrains its destination?
 *
 * Shared by every rule in the URL-navigation family, because an allowlist is
 * an allowlist whether the sink is `location.assign(x)`, `window.open(x)` or
 * `router.push(x)`. `require-url-validation` had NO validation awareness at
 * all — it reported both of its own documentation's remediations — and
 * `no-insecure-redirects` had a version that only ran on the call path.
 *
 * Four shapes count, and the first three PROVE something:
 *
 * 1. the target is `guard ? target : fallback` with a provable guard
 * 2. an enclosing `if` whose test proves the destination, or hands the target
 *    to a predicate we cannot read
 * 3. an earlier sibling `if (!guard) return;` in the same block
 * 4. nothing else — in particular, no text scan of nearby statements
 */
export function isGuardedDestination(
  node: TSESTree.Node,
  target: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
  provesSafe: (test: TSESTree.Node) => boolean,
): boolean {
  const guards = (test: TSESTree.Node): boolean =>
    provesSafe(test) || isOpaquePredicateOverTarget(test, target, sourceCode);

  if (target.type === 'ConditionalExpression' && provesSafe(target.test)) {
    return true;
  }

  const guardedByEarlyExit = (
    block: TSESTree.BlockStatement | TSESTree.Program,
    child: TSESTree.Node,
  ): boolean =>
    block.body.some((statement) => {
      if (statement.range[0] >= child.range[0]) return false;
      if (statement.type !== 'IfStatement') return false;
      if (
        statement.test.type !== 'UnaryExpression' ||
        statement.test.operator !== '!' ||
        !guards(statement.test.argument)
      ) {
        return false;
      }
      const branch = statement.consequent;
      return (
        branch.type === 'ReturnStatement' ||
        branch.type === 'ThrowStatement' ||
        (branch.type === 'BlockStatement' &&
          branch.body.some(
            (s) => s.type === 'ReturnStatement' || s.type === 'ThrowStatement',
          ))
      );
    });

  let child: TSESTree.Node = node;
  let current: TSESTree.Node | undefined = node.parent;
  let depth = 0;

  // Bounded: a navigation nested twenty levels inside guards it never
  // references is not guarded by them.
  while (current && depth < 20) {
    if (current.type === 'IfStatement' && guards(current.test)) return true;
    if (
      (current.type === 'BlockStatement' || current.type === 'Program') &&
      guardedByEarlyExit(current, child)
    ) {
      return true;
    }
    child = current;
    current = current.parent;
    depth++;
  }
  return false;
}

/**
 * Is `node` a binding that holds a framework router?
 *
 * `push` and `replace` are `Array.prototype` and `String.prototype` methods,
 * so matching `router.push(…)` on the spelling `router` would report
 * `queue.push(location.hash)`. The router has to be resolved to a
 * `useRouter()` from a known routing package, or it is not a navigation sink
 * at all. A router obtained some other way (a prop, a context read, an
 * injected singleton) is therefore a deliberate false negative — see the
 * `## Rule partition` note in require-url-validation.
 */
export function isRouterObject(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): boolean {
  if (node.type !== 'Identifier') return false;
  const init = resolveInitializer(node, sourceCode);
  return (
    init !== undefined && isHookCallFrom(init, sourceCode, 'useRouter', ROUTER_MODULES)
  );
}
