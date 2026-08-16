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
 * The deferral lives on the other side, in `require-csp-headers`, and is
 * pinned by `../require-csp-headers/partition-matrix.test.ts`.
 *
 * @see https://cwe.mitre.org/data/definitions/693.html
 * @see https://owasp.org/www-project-secure-headers/
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { resolveInitializer } from '../../utils/resolve-binding';

type MessageIds =
  | 'missingSecurityHeader';

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
  const folded = staticStringValue(arg, sourceCode, 0);
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
 */
function staticStringValue(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
  depth: number,
): string | null {
  // A header table is `HEADERS[0][0]` at worst; deeper is not a header table.
  if (depth > 4) return null;

  if (node.type === 'Literal') {
    return typeof node.value === 'string' ? node.value : null;
  }
  if (node.type === 'Identifier') {
    const init = resolveInitializer(node, sourceCode);
    return init === undefined
      ? null
      : staticStringValue(init, sourceCode, depth + 1);
  }
  if (node.type === 'MemberExpression' && node.computed) {
    const index = node.property;
    if (index.type !== 'Literal' || typeof index.value !== 'number') return null;
    const container = foldToArray(node.object, sourceCode, depth + 1);
    const element = container?.elements[index.value];
    return element == null
      ? null
      : staticStringValue(element, sourceCode, depth + 1);
  }
  return null;
}

/** The array literal an expression is known to be, resolved through scope. */
function foldToArray(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
  depth: number,
): TSESTree.ArrayExpression | null {
  if (depth > 4) return null;
  if (node.type === 'ArrayExpression') return node;
  if (node.type === 'Identifier') {
    const init = resolveInitializer(node, sourceCode);
    return init === undefined ? null : foldToArray(init, sourceCode, depth + 1);
  }
  if (node.type === 'MemberExpression' && node.computed) {
    const index = node.property;
    if (index.type !== 'Literal' || typeof index.value !== 'number') return null;
    const outer = foldToArray(node.object, sourceCode, depth + 1);
    const element = outer?.elements[index.value];
    return element == null ? null : foldToArray(element, sourceCode, depth + 1);
  }
  return null;
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
  if (arg.type !== 'Identifier') return [];

  const variable = sourceCode
    .getScope(arg)
    .references.find((ref) => ref.identifier === arg)?.resolved;
  const def = variable?.defs[0];
  if (def === undefined || def.type !== 'Parameter') return [];

  const fn = def.node;
  const position = fn.params.indexOf(def.name as TSESTree.Parameter);
  if (position === -1) return [];

  // The function must be reachable by name for its call sites to be findable.
  const declarator =
    fn.type === 'FunctionDeclaration'
      ? fn
      : fn.parent?.type === 'VariableDeclarator'
        ? fn.parent
        : undefined;
  if (declarator === undefined) return [];

  const names = new Set<string>();
  for (const declared of sourceCode.getDeclaredVariables(declarator)) {
    for (const reference of declared.references) {
      const call = reference.identifier.parent;
      if (call?.type !== 'CallExpression' || call.callee !== reference.identifier) {
        continue;
      }
      const passed = call.arguments[position];
      if (passed === undefined) return [];
      const value = staticStringValue(passed, sourceCode, 0);
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
  if (
    node.callee.type !== 'MemberExpression' ||
    node.callee.computed ||
    node.callee.property.type !== 'Identifier'
  ) {
    return false;
  }
  const method = node.callee.property.name;
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

/**
 * Check if all security headers are set in the current scope
 */
function checkFunctionForSecurityHeaders(
  node: TSESTree.CallExpression,
  requiredHeaders: string[],
  context: TSESLint.RuleContext<MessageIds, RuleOptions>
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

  // Find the function that contains this setHeader call
  let current: TSESTree.Node | null = node;
  let scopeNode: TSESTree.Node | null = null;

  while (current) {
    if (current.type === 'FunctionDeclaration' ||
        current.type === 'FunctionExpression' ||
        current.type === 'ArrowFunctionExpression') {
      scopeNode = current;
      break;
    }
    current = (current as TSESTree.Node & { parent?: TSESTree.Node }).parent ?? null;
  }

  // If no function found, use the program scope (for test cases)
  if (!scopeNode) {
    scopeNode = context.sourceCode.ast;
  }

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
              : staticStringValue(value, context.sourceCode, 0);
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

  // scopeNode is always set: either the enclosing function or (fallback
  // above) the Program node itself.
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
  if (setHeaders.size > 0 && [...setHeaders].every((h) => NON_DOCUMENT_HEADERS.has(h))) {
    return [];
  }

  // The scope SAYS what it is serving. A Content-Type that is not a document
  // settles the question outright: a JSON API response has nothing to frame,
  // nothing to MIME-sniff into script and nothing for a policy to govern.
  if (declaredContentType !== null && !isDocumentMediaType(declaredContentType)) {
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
  if (property.computed) return null;
  const key = property.key;
  const keyName =
    key.type === 'Identifier'
      ? key.name
      : key.type === 'Literal' && typeof key.value === 'string'
        ? key.value
        : null;
  if (keyName !== 'headers') return null;

  const value = property.value;

  // Next.js config: an array of `{ key, value }` pairs. No request API takes
  // this shape, so it needs no further proof of being a response.
  if (value.type === 'ArrayExpression') {
    const names: string[] = [];
    let contentType: TSESTree.Node | null = null;
    for (const element of value.elements) {
      if (element === null || element.type !== 'ObjectExpression') continue;
      for (const entry of element.properties) {
        if (entry.type !== 'Property' || entry.computed) continue;
        const entryKey =
          entry.key.type === 'Identifier' ? entry.key.name : null;
        if (entryKey !== 'key') continue;
        if (entry.value.type === 'Literal' && typeof entry.value.value === 'string') {
          names.push(entry.value.value);
          if (entry.value.value.toLowerCase() === 'content-type') {
            contentType =
              element.properties.find(
                (p): p is TSESTree.Property =>
                  p.type === 'Property' &&
                  !p.computed &&
                  p.key.type === 'Identifier' &&
                  p.key.name === 'value',
              )?.value ?? null;
          }
        }
      }
    }
    return names.length > 0 ? { names, contentType } : null;
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
    if (entry.computed) return null;
    const name =
      entry.key.type === 'Literal' && typeof entry.key.value === 'string'
        ? entry.key.value
        : entry.key.type === 'Identifier'
          ? entry.key.name
          : null;
    if (name === null) continue;
    names.push(name);
    // Read in the SAME pass. A second loop over the same block would have to
    // re-handle spreads and computed keys that this one has already rejected,
    // and those branches would be unreachable by construction.
    if (name.toLowerCase() === 'content-type') contentType = entry.value;
  }
  return names.length > 0 ? { names, contentType } : null;
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
    node.callee.computed ||
    node.callee.property.type !== 'Identifier' ||
    node.callee.property.name !== 'writeHead'
  ) {
    return null;
  }
  const block = node.arguments.find(
    (arg): arg is TSESTree.ObjectExpression => arg.type === 'ObjectExpression',
  );
  return block ?? null;
}

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
      !p.computed &&
      p.key.type === 'Identifier' &&
      (p.key.name === 'status' || p.key.name === 'statusText'),
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
    !callee.computed &&
    callee.property.type === 'Identifier' &&
    callee.object.type === 'Identifier'
  ) {
    return (
      RESPONSE_FACTORIES.has(callee.property.name) &&
      (callee.object.name === 'Response' || callee.object.name === 'NextResponse')
    );
  }
  return false;
}


export const noMissingSecurityHeaders = createRule<RuleOptions, MessageIds>({
  name: 'no-missing-security-headers',
  meta: {
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
            default: DEFAULT_REQUIRED_HEADERS, description: 'Security headers a response must set'
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
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const {
requiredHeaders = DEFAULT_REQUIRED_HEADERS,
      ignoreInTests = true,
    
}: Options = options || {};

    const filename = context.filename;
    const isTestFile = ignoreInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (isTestFile) {
      return {};
    }

    const reportedScopes = new Set<string>();

    /**
     * Get a unique key for the current scope
     */
    function getScopeKey(node: TSESTree.CallExpression): string {
      // Find the function that contains this call
      let current: TSESTree.Node | null = node;
      while (current) {
        if (current.type === 'FunctionDeclaration' ||
            current.type === 'FunctionExpression' ||
            current.type === 'ArrowFunctionExpression') {
          return `${current.range?.[0]}-${current.range?.[1]}`;
        }
        current = (current as TSESTree.Node & { parent?: TSESTree.Node }).parent ?? null;
      }
      // If no function found, use program scope
      return 'program';
    }

    /**
     * Check for response header setting
     */
    function checkCallExpression(node: TSESTree.CallExpression) {
      // res.setHeader / res.header always; res.set only when it names a header
      // — see isHeaderSet.
      if (!isHeaderSet(node, requiredHeaders, context.sourceCode)) {
        return;
      }

      const scopeKey = getScopeKey(node);

      // Only check once per scope
      if (reportedScopes.has(scopeKey)) {
        return;
      }

      const missing = checkFunctionForSecurityHeaders(node, requiredHeaders, context);

      // Mark as checked either way
      reportedScopes.add(scopeKey);

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
          : staticStringValue(block.contentType, context.sourceCode, 0);
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

