/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-missing-security-headers
 * Detects missing security headers in HTTP responses
 * CWE-693: Protection Mechanism Failure
 *
 * ## Rule partition
 *
 * `Content-Security-Policy` is demanded by TWO rules in this package, and on
 * one realistic Express handler both fired for the same defect at once — this
 * rule at CVSS 7.5 under CWE-693, `require-csp-headers` at CVSS 6.5 under
 * CWE-1021. Two CWEs, one defect, so the package's CWE-keyed duplicate
 * detector never registered the pair at all.
 *
 * - **this rule** owns any scope that explicitly SETS response headers — by
 *   call or as a declared block — and omits a required one.
 * - **`require-csp-headers`** owns a document emitted where NO response header
 *   is set at all, which this rule structurally cannot see because it has no
 *   call or block to trigger on.
 *
 * The deferral lived on the other side, in `require-csp-headers`, and has been
 * WITHDRAWN: this rule is deprecated and out of every preset, so a live rule
 * deferring to it left a header-setting handler with no CSP reported by
 * nobody. `require-csp-headers` now reports every document without a CSP;
 * enabling this rule explicitly adds its broader finding beside that one.
 * Pinned by `../require-csp-headers/partition-matrix.test.ts`.
 *
 * @see https://cwe.mitre.org/data/definitions/693.html
 * @see https://owasp.org/www-project-secure-headers/
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  formatLLMMessage,
  MessageIcons,
  isTestFilePath,
  staticString,
  namesOneOf,
  objectKeyName,
  propertyName,
} from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { resolveInitializer } from '../../utils/resolve-binding';

type MessageIds = 'missingSecurityHeader';

export interface Options {
  /** Required security headers. Default: ['Content-Security-Policy', 'X-Frame-Options', 'X-Content-Type-Options'] */
  requiredHeaders?: string[];

  /** Ignore in test files. Default: true */
  ignoreInTests?: boolean;
}

type RuleOptions = [Options?];

const DEFAULT_REQUIRED_HEADERS = [
  'Content-Security-Policy',
  'X-Frame-Options',
  'X-Content-Type-Options',
];

/**
 * Headers whose presence says nothing about serving a document — transport, caching and
 * redirect concerns. A scope that sets ONLY these is not rendering markup.
 */
const NON_DOCUMENT_HEADERS = new Set(
  [
    'Set-Cookie',
    'Cache-Control',
    'Location',
    'Content-Disposition',
    'ETag',
    'Last-Modified',
    'Expires',
    'Vary',
  ].map((h) => h.toLowerCase()),
);

/**
 * Response headers this rule can recognise by name.
 *
 * Needed because `set` is in the trigger list and `set` is one of the most
 * common method names in JavaScript. Before this existed the rule reported
 *
 * ```js
 * featureFlags.set('newCheckout', true);   // "Missing security headers:
 *                                          //  Content-Security-Policy, …"
 * ```
 *
 * at CVSS 7.5, on a feature-flag map. `setHeader` and `header` are distinctive
 * enough to stand alone — `setHeader` is Node's ServerResponse API and
 * `header` is Express's — but `set` needs a second piece of evidence, and the
 * only one available at the call site is the header it names. Exact membership
 * against a closed list, never a substring test.
 */
const KNOWN_RESPONSE_HEADERS: ReadonlySet<string> = new Set(
  [
    // Security
    'Content-Security-Policy',
    'Content-Security-Policy-Report-Only',
    'X-Frame-Options',
    'X-Content-Type-Options',
    'X-XSS-Protection',
    'Strict-Transport-Security',
    'Referrer-Policy',
    'Permissions-Policy',
    'Feature-Policy',
    'Cross-Origin-Opener-Policy',
    'Cross-Origin-Embedder-Policy',
    'Cross-Origin-Resource-Policy',
    'X-Permitted-Cross-Domain-Policies',
    'X-DNS-Prefetch-Control',
    'X-Download-Options',
    'Origin-Agent-Cluster',
    'Report-To',
    'Reporting-Endpoints',
    'Clear-Site-Data',
    // CORS
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Credentials',
    'Access-Control-Allow-Methods',
    'Access-Control-Allow-Headers',
    'Access-Control-Expose-Headers',
    'Access-Control-Max-Age',
    'Timing-Allow-Origin',
    // Entity / transport / caching
    'Content-Type',
    'Content-Length',
    'Content-Encoding',
    'Content-Language',
    'Content-Disposition',
    'Content-Range',
    'Cache-Control',
    'Pragma',
    'Expires',
    'ETag',
    'Last-Modified',
    'Age',
    'Vary',
    'Location',
    'Set-Cookie',
    'Server',
    'Retry-After',
    'Link',
    'Accept-Ranges',
    'Transfer-Encoding',
    'WWW-Authenticate',
  ].map((h) => h.toLowerCase()),
);

/** Methods that name an HTTP header on sight, with no further evidence needed. */
const UNAMBIGUOUS_HEADER_METHODS: ReadonlySet<string> = new Set([
  'setHeader',
  'header',
]);

/**
 * The call names a header, but not one this rule can read.
 *
 * Distinct from "this is not a header call at all". A scope containing
 * `res.setHeader(name, value)` may well set all three required headers —
 * `Object.entries(SECURITY_HEADERS).forEach(([k, v]) => res.setHeader(k, v))`
 * is how most codebases apply them — and reporting it says "you are missing
 * the headers you are in the act of setting". An unknown is not an absence.
 */
const DYNAMIC_HEADER_NAME = Symbol('dynamic header name');

type HeaderName = string | typeof DYNAMIC_HEADER_NAME;

/**
 * Extract the header name a call sets.
 *
 * A constant is resolved through SCOPE, not read off the identifier's
 * spelling: `const FRAME_HEADER = 'X-Frame-Options'` is the normal way to
 * write this once there is more than one handler, and treating it as unknown
 * lost the header entirely.
 */
function extractHeaderName(
  node: TSESTree.CallExpression,
  sourceCode: TSESLint.SourceCode,
): HeaderName | null {
  const arg = node.arguments[0];
  if (arg === undefined) return null;
  const folded = staticStringValue(arg, sourceCode);
  if (folded !== null) return folded;
  const viaParameter = parameterLiterals(arg, sourceCode);
  if (viaParameter.length === 1) return viaParameter[0];
  return DYNAMIC_HEADER_NAME;
}

/**
 * The string this expression is KNOWN to be, folded through scope.
 *
 * Handles the two indirections real header tables use: a `const` holding the
 * name, and an entry reached by index out of a `const` array. Everything else
 * returns `null`, because a rule that guesses a value it cannot fold is back
 * to deciding by spelling.
 *
 * Followed as far as the aliases go. A hop budget of four gave up on a longer
 * `const` chain and made the scope unjudgeable; `seen` is what stops a cycle
 * (`const a = b; const b = a;`) instead.
 */
function staticStringValue(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
  seen = new Set<TSESTree.Node>(),
): string | null {
  if (seen.has(node)) return null;
  seen.add(node);
  if (node.type === 'Literal') {
    return typeof node.value === 'string' ? node.value : null;
  }
  if (node.type === 'Identifier') {
    const init = resolveInitializer(node, sourceCode);
    return init === undefined
      ? null
      : staticStringValue(init, sourceCode, seen);
  }
  if (node.type === 'MemberExpression') {
    const element = elementAt(
      foldToArray(node.object, sourceCode, seen),
      node.property,
    );
    return element == null
      ? null
      : staticStringValue(element, sourceCode, seen);
  }
  return null;
}

/** The array literal an expression is known to be, resolved through scope. */
function foldToArray(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
  seen: Set<TSESTree.Node>,
): TSESTree.ArrayExpression | null {
  if (seen.has(node)) return null;
  seen.add(node);
  if (node.type === 'ArrayExpression') return node;
  if (node.type === 'Identifier') {
    const init = resolveInitializer(node, sourceCode);
    return init === undefined ? null : foldToArray(init, sourceCode, seen);
  }
  if (node.type === 'MemberExpression') {
    const element = elementAt(
      foldToArray(node.object, sourceCode, seen),
      node.property,
    );
    return element == null ? null : foldToArray(element, sourceCode, seen);
  }
  return null;
}

/**
 * The element a literal index names, read the way the runtime reads it.
 *
 * A property key is a string: `T[0]`, `T['0']` and `T[0n]` are the same
 * element, while `T['01']` and `T.x` name none. A dotted member's key is an
 * Identifier, not a Literal, so it answers here too.
 */
function elementAt(
  array: TSESTree.ArrayExpression | null,
  index: TSESTree.Node,
): TSESTree.ArrayExpression['elements'][number] | undefined {
  if (array === null || index.type !== 'Literal') return undefined;
  const key = String(index.value);
  const position = Number(key);
  return String(position) === key ? array.elements[position] : undefined;
}

/**
 * The header names a PARAMETER is ever called with.
 *
 * `function setSecurityHeader(res, name, value) { res.setHeader(name, value); }`
 * is the commonest way a codebase applies headers once there is more than one
 * handler, and inside that helper the name is genuinely unknown. It is not
 * unknown at the call sites. Read from the scope manager: find the parameter's
 * position, then every call to the enclosing function in this file.
 *
 * Returns every distinct literal found — `[]` when any call site passes
 * something unfoldable, since one unknown call site makes the whole set
 * unknowable.
 */
function parameterLiterals(
  arg: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): string[] {
  // A non-Identifier argument is referenced by nothing, so it resolves to no
  // parameter.
  const variable = sourceCode
    .getScope(arg)
    .references.find((ref) => ref.identifier === arg)?.resolved;
  const def = variable?.defs[0];
  if (def === undefined || def.type !== 'Parameter') return [];

  const fn = def.node;
  // -1 for a destructured or defaulted parameter, and `arguments[-1]` is
  // undefined at every call site, so it reads as unknowable below.
  const position = fn.params.indexOf(def.name as TSESTree.Parameter);

  // The function is reachable by the name it declares, or by the `const` it
  // is bound to. An anonymous function elsewhere declares only its
  // parameters, none of which is ever called.
  const owner = fn.parent.type === 'VariableDeclarator' ? fn.parent : fn;

  const names = new Set<string>();
  for (const declared of sourceCode.getDeclaredVariables(owner)) {
    for (const reference of declared.references) {
      const call = reference.identifier.parent;
      // A `new` passes its arguments exactly as a call does.
      if (!('callee' in call) || call.callee !== reference.identifier) {
        continue;
      }
      const passed = call.arguments[position];
      if (passed === undefined) return [];
      const value = staticStringValue(passed, sourceCode);
      if (value === null) return [];
      names.add(value);
    }
  }
  return [...names];
}

/**
 * Is this call setting an HTTP response header?
 *
 * `requiredHeaders` joins the closed list so a project that configures a
 * header we have never heard of still gets `res.set('X-Whatever', …)`
 * recognised for it.
 */
function isHeaderSet(
  node: TSESTree.CallExpression,
  requiredHeaders: readonly string[],
  sourceCode: TSESLint.SourceCode,
): boolean {
  if (node.callee.type !== 'MemberExpression') return false;
  // `res['setHeader'](…)` sets the same header `res.setHeader(…)` does.
  const method = propertyName(node.callee);
  if (method === null) return false;
  if (UNAMBIGUOUS_HEADER_METHODS.has(method)) return true;
  if (method !== 'set') return false;

  const extracted = extractHeaderName(node, sourceCode);
  if (extracted === null || extracted === DYNAMIC_HEADER_NAME) return false;
  const name = extracted.toLowerCase();
  return (
    KNOWN_RESPONSE_HEADERS.has(name) ||
    requiredHeaders.some((h) => h.toLowerCase() === name)
  );
}

/** Is this value an AST node rather than a location, a range or a raw string? */
function isNode(value: unknown): value is TSESTree.Node {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { type?: unknown }).type === 'string'
  );
}

/**
 * Media types that produce a DOCUMENT the browser will parse as markup.
 *
 * Closed set. CSP, X-Frame-Options and X-Content-Type-Options all govern a
 * rendered document; on `application/json` there is nothing for them to do.
 */
const DOCUMENT_MEDIA_TYPES: ReadonlySet<string> = new Set([
  'text/html',
  'application/xhtml+xml',
  'image/svg+xml',
]);

/** Read the media type out of a Content-Type value, parameters discarded. */
function isDocumentMediaType(contentType: string): boolean {
  const mediaType = contentType.split(';')[0].trim().toLowerCase();
  return DOCUMENT_MEDIA_TYPES.has(mediaType);
}

const FUNCTION_TYPES: ReadonlySet<string> = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
]);

/**
 * The function a header call belongs to, or the Program at module level: the
 * scope whose headers are judged together, and judged once.
 */
function enclosingScope(node: TSESTree.Node): TSESTree.Node {
  let current = node;
  while (!FUNCTION_TYPES.has(current.type) && current.parent) {
    current = current.parent;
  }
  return current;
}

/**
 * Check if all security headers are set in the current scope
 */
function checkFunctionForSecurityHeaders(
  scopeNode: TSESTree.Node,
  requiredHeaders: string[],
  context: TSESLint.RuleContext<MessageIds, RuleOptions>,
): string[] {
  // Lowercased. HTTP header names are case-insensitive (RFC 9110 §5.1) and
  // HTTP/2 requires them lowercase on the wire, so `res.setHeader(
  // 'content-security-policy', …)` is the SAME header as the Title-Case
  // spelling. Comparing case-sensitively made a handler that set all three
  // correctly report "Missing security headers: Content-Security-Policy,
  // X-Frame-Options, X-Content-Type-Options" at CVSS 7.5 — the rule flagging
  // its own remediation.
  const setHeaders = new Set<string>();
  let scopeIsOpaque = false;
  /** The Content-Type this scope declares, when it declares one statically. */
  let declaredContentType: string | null = null;

  // Collect all setHeader calls in this scope
  function collectHeaders(astNode: TSESTree.Node): void {
    if (
      astNode.type === 'CallExpression' &&
      isHeaderSet(astNode, requiredHeaders, context.sourceCode)
    ) {
      const headerName = extractHeaderName(astNode, context.sourceCode);
      if (headerName === DYNAMIC_HEADER_NAME) {
        scopeIsOpaque = true;
      } else if (headerName !== null) {
        setHeaders.add(headerName.toLowerCase());
        if (headerName.toLowerCase() === 'content-type') {
          const value = astNode.arguments[1];
          declaredContentType =
            value === undefined
              ? null
              : staticStringValue(value, context.sourceCode);
        }
      }
    }

    // Every child, not a hand-picked four.
    //
    // This walk used to descend only through Program / function bodies /
    // BlockStatement / ExpressionStatement, so a header set inside an `if`, a
    // `for` or a `try` was INVISIBLE. Both of the shapes that hides are
    // ordinary:
    //
    //   if (process.env.NODE_ENV === 'production') res.setHeader('X-Frame-Options', …)
    //   for (const [n, v] of Object.entries(HEADERS)) res.setHeader(n, v)
    //
    // In the first the rule demanded a header that was three lines below it;
    // in the second it never reached the call that would have marked the scope
    // unreadable, and demanded all three.
    for (const key of Object.keys(astNode)) {
      if (key === 'parent') continue;
      const child = (astNode as unknown as Record<string, unknown>)[key];
      if (Array.isArray(child)) {
        for (const item of child) {
          if (isNode(item)) collectHeaders(item);
        }
      } else if (isNode(child)) {
        collectHeaders(child);
      }
    }
  }

  collectHeaders(scopeNode);

  // The scope sets a header whose name this rule cannot read, so it cannot
  // enumerate what the scope sets and must not claim anything is absent.
  if (scopeIsOpaque) {
    return [];
  }

  // CSP / X-Frame-Options / X-Content-Type-Options protect a RENDERED DOCUMENT. If the only
  // headers this scope touches are transport/caching concerns, there is no document to frame
  // or inject into and demanding them is noise — the rule fired on a plain
  // `res.setHeader('Set-Cookie', ...)` helper that renders nothing.
  //
  // Deliberately narrow: an EARLIER attempt required proof of a `res.send`/`render` call in
  // scope, which broke 9 tests. A RuleTester snippet sets a header without sending anything
  // because the snippet is truncated, not because the handler serves no document — absence
  // of a send call is not evidence of absence of a document.
  if (
    setHeaders.size > 0 &&
    [...setHeaders].every((h) => NON_DOCUMENT_HEADERS.has(h))
  ) {
    return [];
  }

  // The scope SAYS what it is serving. A Content-Type that is not a document
  // settles the question outright: a JSON API response has nothing to frame,
  // nothing to MIME-sniff into script and nothing for a policy to govern.
  if (
    declaredContentType !== null &&
    !isDocumentMediaType(declaredContentType)
  ) {
    return [];
  }

  // Return missing headers — compared case-insensitively, see above.
  return requiredHeaders.filter(
    (header) => !setHeaders.has(header.toLowerCase()),
  );
}

/**
 * Header names declared as DATA rather than as a sequence of calls.
 *
 * Two shapes, both of which ship the identical wire result and neither of
 * which has a `setHeader` call for the rule to trigger on:
 *
 * ```js
 * new Response(html, { headers: { 'X-Frame-Options': 'DENY' } })   // ResponseInit
 * { source: '/(.*)', headers: [{ key: 'X-Frame-Options', value: 'DENY' }] }  // Next.js
 * ```
 *
 * Returns `null` when this `headers` property is not a RESPONSE header block —
 * a `fetch(url, { headers })` is a request, and demanding a Content-Security-
 * Policy on an outgoing request is nonsense.
 */
function declaredResponseHeaders(
  property: TSESTree.Property,
): DeclaredBlock | null {
  // `'headers'` and `['headers']` name the same option.
  if (objectKeyName(property) !== 'headers') return null;

  const value = property.value;

  // Next.js config: an array of `{ key, value }` pairs. No request API takes
  // this shape, so it needs no further proof of being a response.
  if (value.type === 'ArrayExpression') {
    const names: string[] = [];
    let contentType: TSESTree.Node | null = null;
    for (const element of value.elements) {
      if (element === null || element.type !== 'ObjectExpression') continue;
      for (const entry of element.properties) {
        // `key`, `'key'` and `['key']` are the same entry field.
        if (entry.type !== 'Property' || objectKeyName(entry) !== 'key') {
          continue;
        }
        const staticText = staticString(entry.value);
        if (staticText !== null) {
          names.push(staticText);
          if (staticText.toLowerCase() === 'content-type') {
            contentType =
              element.properties.find(
                (p): p is TSESTree.Property =>
                  p.type === 'Property' && objectKeyName(p) === 'value',
              )?.value ?? null;
          }
        }
      }
    }
    // An empty list is judged like any block: it names no document header,
    // and reportDeclaredBlock leaves a block with no names alone.
    return { names, contentType };
  }

  if (value.type !== 'ObjectExpression') return null;
  const init = property.parent;
  if (init.type !== 'ObjectExpression' || !isResponseInit(init)) return null;

  return objectHeaderNames(value);
}

/**
 * The header names an object literal declares, or `null` when it cannot be
 * enumerated.
 *
 * A spread makes it unenumerable. `{ ...SECURE_DEFAULTS, 'X-Request-Id': id }`
 * shows one thin key while shipping three strong ones, and treating the
 * visible keys as the whole block reports a response that is already correct.
 */
/** A header block declared as DATA: the names it sets, and its media type. */
interface DeclaredBlock {
  readonly names: readonly string[];
  /** The `Content-Type` value expression, when the block declares one. */
  readonly contentType: TSESTree.Node | null;
}

function objectHeaderNames(
  object: TSESTree.ObjectExpression,
): DeclaredBlock | null {
  const names: string[] = [];
  let contentType: TSESTree.Node | null = null;
  for (const entry of object.properties) {
    if (entry.type === 'SpreadElement') return null;
    // `['X-Frame-Options']` names the header `'X-Frame-Options'` does.
    const name =
      entry.key.type === 'Identifier' && !entry.computed
        ? entry.key.name
        : staticString(entry.key);
    if (name === null) {
      // A key chosen at runtime may be any header; a numeric one names none.
      if (entry.computed) return null;
      continue;
    }
    names.push(name);
    // Read in the SAME pass. A second loop over the same block would have to
    // re-handle spreads and computed keys that this one has already rejected,
    // and those branches would be unreachable by construction.
    if (name.toLowerCase() === 'content-type') contentType = entry.value;
  }
  return { names, contentType };
}

/**
 * `res.writeHead(status, headers)` — Node's own API, which sets the entire
 * block in one call and so has no `setHeader` for the rule to trigger on.
 * Exact membership against a closed API name.
 */
function writeHeadHeaders(
  node: TSESTree.CallExpression,
): TSESTree.ObjectExpression | null {
  if (
    node.callee.type !== 'MemberExpression' ||
    // `res['writeHead'](200, headers)` writes the same head.
    propertyName(node.callee) !== 'writeHead'
  ) {
    return null;
  }
  const block = node.arguments.find(
    (arg): arg is TSESTree.ObjectExpression => arg.type === 'ObjectExpression',
  );
  return block ?? null;
}

/** Fields only a `ResponseInit` carries. */
const RESPONSE_ONLY_FIELDS: ReadonlySet<string> = new Set([
  'status',
  'statusText',
]);

/** Response constructors whose second argument is a `ResponseInit`. */
const RESPONSE_FACTORIES: ReadonlySet<string> = new Set([
  'json',
  'next',
  'redirect',
  'rewrite',
  'error',
]);

/**
 * Is this object literal a `ResponseInit` rather than a `RequestInit`?
 *
 * Proven from the AST: it is the init of a `new Response(…)` or of a
 * `NextResponse.json(…)`-style factory, or it carries a `status` /
 * `statusText` sibling, which only a response has.
 */
function isResponseInit(init: TSESTree.ObjectExpression): boolean {
  const hasResponseOnlyField = init.properties.some(
    (p) =>
      p.type === 'Property' &&
      // `'status'` and `['status']` are the same field.
      namesOneOf(objectKeyName(p), RESPONSE_ONLY_FIELDS),
  );
  if (hasResponseOnlyField) return true;

  // An ObjectExpression always has a parent — only `Program` has none.
  const call = init.parent;
  if (call.type !== 'NewExpression' && call.type !== 'CallExpression') {
    return false;
  }
  const callee = call.callee;
  if (callee.type === 'Identifier') return callee.name === 'Response';
  if (
    callee.type === 'MemberExpression' &&
    callee.object.type === 'Identifier'
  ) {
    // `NextResponse['json'](…)` builds the same response.
    return (
      namesOneOf(propertyName(callee), RESPONSE_FACTORIES) &&
      (callee.object.name === 'Response' ||
        callee.object.name === 'NextResponse')
    );
  }
  return false;
}

export const noMissingSecurityHeaders = createRule<RuleOptions, MessageIds>({
  name: 'no-missing-security-headers',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    deprecated: true,
    replacedBy: ['@see eslint-plugin-express-security/require-helmet'],
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/no-missing-security-headers.md',
      description: 'Detects missing security headers in HTTP responses',
      cwe: 'CWE-693',
      cvss: 7.5,
    },
    messages: {
      missingSecurityHeader: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing security headers',
        cwe: 'CWE-693',
        description: 'Missing security headers: {{headers}}',
        severity: 'HIGH',
        fix: 'Set security headers: Content-Security-Policy, X-Frame-Options, X-Content-Type-Options',
        documentationLink: 'https://owasp.org/www-project-secure-headers/',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          requiredHeaders: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_REQUIRED_HEADERS,
            description: 'Security headers a response must set',
          },
          ignoreInTests: {
            type: 'boolean',
            default: true,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      requiredHeaders: DEFAULT_REQUIRED_HEADERS,
      ignoreInTests: true,
    },
  ],
  createOnce(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    currentOptions,
  ) {
    let requiredHeaders: string[];
    let ignoreInTests: boolean;
    let reportedScopes: Set<TSESTree.Node>;

    /**
     * Check for response header setting
     */
    function checkCallExpression(node: TSESTree.CallExpression) {
      // res.setHeader / res.header always; res.set only when it names a header
      // — see isHeaderSet.
      if (!isHeaderSet(node, requiredHeaders, context.sourceCode)) {
        return;
      }

      const scope = enclosingScope(node);

      // Only check once per scope
      if (reportedScopes.has(scope)) {
        return;
      }

      const missing = checkFunctionForSecurityHeaders(
        scope,
        requiredHeaders,
        context,
      );

      // Mark as checked either way
      reportedScopes.add(scope);

      if (missing.length > 0) {
        context.report({
          node,
          messageId: 'missingSecurityHeader',
          data: {
            headers: missing.join(', '),
          },
        });
      }
    }

    /**
     * A header block written as DATA — a `ResponseInit` or a Next.js config
     * entry. Same defect, same required set, no call to trigger on.
     */
    function reportDeclaredBlock(node: TSESTree.Node, block: DeclaredBlock) {
      const contentType =
        block.contentType === null
          ? null
          : staticStringValue(block.contentType, context.sourceCode);
      const present = new Set(block.names.map((h) => h.toLowerCase()));
      if ([...present].every((h) => NON_DOCUMENT_HEADERS.has(h))) return;
      if (contentType !== null && !isDocumentMediaType(contentType)) return;

      const missing = requiredHeaders.filter(
        (header) => !present.has(header.toLowerCase()),
      );
      if (missing.length > 0) {
        context.report({
          node,
          messageId: 'missingSecurityHeader',
          data: { headers: missing.join(', ') },
        });
      }
    }

    function checkDeclaredHeaders(node: TSESTree.Property) {
      const declared = declaredResponseHeaders(node);
      if (declared === null) return;
      reportDeclaredBlock(node, declared);
    }

    return {
      before() {
        const [options = {}] = currentOptions();
        // The merged `defaultOptions` supply every field.
        ({ requiredHeaders, ignoreInTests } = (options ||
          {}) as Required<Options>);

        const filename = context.filename;
        const isTestFile = ignoreInTests && isTestFilePath(filename);

        if (isTestFile) {
          return false;
        }

        reportedScopes = new Set<TSESTree.Node>();
        return true;
      },
      CallExpression(node: TSESTree.CallExpression) {
        const block = writeHeadHeaders(node);
        if (block !== null) {
          const declared = objectHeaderNames(block);
          if (declared !== null) reportDeclaredBlock(node, declared);
          return;
        }
        checkCallExpression(node);
      },
      Property: checkDeclaredHeaders,
    };
  },
});
