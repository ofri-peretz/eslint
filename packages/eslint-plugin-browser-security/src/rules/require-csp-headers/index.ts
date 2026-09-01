/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Require Content Security Policy
 *
 * ## Rule partition
 *
 * `Content-Security-Policy` is demanded by TWO rules in this package, and on
 * one realistic Express handler both fired for the same reason:
 *
 * ```js
 * app.get('/', (req, res) => {
 *   res.setHeader('X-Frame-Options', 'DENY');
 *   res.send('<html>…</html>');
 *   //  no-missing-security-headers: "Missing security headers:
 *   //                                Content-Security-Policy, …"   CWE-693
 *   //  require-csp-headers:         "HTML response without
 *   //                                Content-Security-Policy header" CWE-1021
 * });
 * ```
 *
 * Two CWEs, one defect, so the package's own duplicate detector — which is
 * CWE-keyed — could not see it. The partition:
 *
 * - **`no-missing-security-headers`** owns any scope that explicitly SETS
 *   response headers and omits a required one. CSP is one of the three it
 *   demands, so it has already answered the question there.
 * - **this rule** owns a document emitted where NO response header is set at
 *   all — the case the other rule structurally cannot see, because it has no
 *   call to trigger on.
 *
 * The deferral is structural (`scopeSetsResponseHeaders`), not a name test,
 * and is pinned by the partition matrix in `require-csp-headers.test.ts`.
 *
 * Note also what this rule does NOT own: whether a policy that IS present is
 * a good one. `'unsafe-eval'` inside a present CSP belongs to
 * `no-unsafe-eval-csp`, and missing frame protection to `no-clickjacking`.
 * Those are complementary defects on the same line, not duplicates.
 */

import {
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES } from '@interlace/eslint-devkit';
import { resolveInitializer } from '../../utils/resolve-binding';

/**
 * Methods that emit a response body the browser may parse as a document.
 *
 * @protocol-constant The Express / `http.ServerResponse` emission API, not
 * English words standing in for evidence — and the list does not decide the
 * finding on its own. What decides it is `mayHoldDocument(body)`, which reads
 * the markup; this only selects which call is a response emission. A consumer
 * given control of it could silently exclude `res.send`, the method this rule
 * exists to cover, and adding names to it would make any `x.foo(html)` a
 * finding on a receiver that emits nothing.
 */
/**
 * @vocabulary `http-equiv` is the HTML attribute, `httpEquiv` its React DOM
 * spelling, and `require` is CommonJS. Response and filesystem method names
 * are Express's and Node's. None is a name a consumer picked.
 *
 * @see https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-http-equiv
 * @see https://react.dev/reference/react-dom/components/common
 */
const EMIT_METHODS: ReadonlySet<string> = new Set([
  'send',
  'end',
  'write',
  'render',
]);

/**
 * Methods that serve a document off disk. The markup never appears in this
 * file, so the evidence is the PATH — `res.sendFile(… 'index.html')` is the
 * single-page-app catch-all route every React deployment ends with, and it
 * ships a document with whatever policy the server did not set.
 */
const FILE_METHODS: ReadonlySet<string> = new Set(['sendFile']);

/** Extensions the browser parses as a document. */
const DOCUMENT_EXTENSIONS: ReadonlySet<string> = new Set(['.html', '.htm']);

/**
 * Methods that set a response header. Closed API surface: Node's
 * `setHeader`/`writeHead`, Express's `set`/`header`.
 *
 * @protocol-constant The complete call signature for setting a response header
 * in Node and Express. This list does two load-bearing jobs and a consumer
 * could break both: it recognises a call that ESTABLISHES a CSP, so deleting an
 * entry makes the rule report a response that is already protected; and it
 * drives the partition deferral to `no-missing-security-headers`, so deleting
 * an entry makes one handler draw the same missing-CSP finding twice under two
 * CWEs. Neither is a vocabulary judgement — no domain adds a fifth way to set
 * a header.
 */
const HEADER_METHODS: ReadonlySet<string> = new Set([
  'setHeader',
  'writeHead',
  'header',
  'set',
]);

const CSP_HEADER = 'content-security-policy';

/** helmet, or one of its subpath entry points. */
const HELMET_MODULE = /^helmet(\/|$)/;

/** Is this value an AST node rather than a location, a range or a raw string? */
function isNode(value: unknown): value is TSESTree.Node {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { type?: unknown }).type === 'string'
  );
}

/**
 * The string this expression is KNOWN to be, folded through scope.
 *
 * A document is very rarely written inline at the point it is sent: it comes
 * out of a constant, out of a page table, or out of a builder. Folding is what
 * separates "the rule cannot see the markup" from "there is no markup".
 */
function staticString(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
  depth: number,
): string | null {
  if (depth > 5) return null;

  if (node.type === 'Literal') {
    return typeof node.value === 'string' ? node.value : null;
  }
  if (node.type === 'TemplateLiteral') {
    // Literal chunks only — an interpolation's SOURCE text is not its value.
    // `value` is read defensively: a tagged template with an invalid escape
    // has no cooked value, and a synthetic node may carry no `value` at all.
    return node.quasis.map((q) => q.value?.raw ?? '').join(' ');
  }
  if (node.type === 'Identifier') {
    const init = resolveInitializer(node, sourceCode);
    return init === undefined
      ? null
      : staticString(init, sourceCode, depth + 1);
  }
  if (node.type === 'MemberExpression' && node.computed) {
    const index = node.property;
    if (index.type !== 'Literal' || typeof index.value !== 'number')
      return null;
    const array = foldToArray(node.object, sourceCode, depth + 1);
    const element = array?.elements[index.value];
    return element == null
      ? null
      : staticString(element, sourceCode, depth + 1);
  }
  // A local builder: `res.send(page(body))`. What the builder RETURNS is what
  // the browser receives.
  if (node.type === 'CallExpression' && node.callee.type === 'Identifier') {
    const fn = resolveLocalFunction(node.callee, sourceCode);
    if (fn === null) return null;
    return returnedString(fn, sourceCode, depth + 1);
  }
  return null;
}

function foldToArray(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
  depth: number,
): TSESTree.ArrayExpression | null {
  if (depth > 5) return null;
  if (node.type === 'ArrayExpression') return node;
  if (node.type === 'Identifier') {
    const init = resolveInitializer(node, sourceCode);
    return init === undefined ? null : foldToArray(init, sourceCode, depth + 1);
  }
  // A nested table — `PAGES[0][1]`, one row per locale.
  if (node.type === 'MemberExpression' && node.computed) {
    const index = node.property;
    if (index.type !== 'Literal' || typeof index.value !== 'number')
      return null;
    const outer = foldToArray(node.object, sourceCode, depth + 1);
    const element = outer?.elements[index.value];
    return element == null ? null : foldToArray(element, sourceCode, depth + 1);
  }
  return null;
}

/** The function a callee name resolves to, when it is declared in this file. */
function resolveLocalFunction(
  callee: TSESTree.Identifier,
  sourceCode: TSESLint.SourceCode,
): TSESTree.Node | null {
  for (
    let scope: TSESLint.Scope.Scope | null = sourceCode.getScope(callee);
    scope !== null;
    scope = scope.upper
  ) {
    const variable = scope.variables.find((v) => v.name === callee.name);
    if (variable === undefined) continue;
    if (variable.defs.length !== 1) return null;
    const def = variable.defs[0];
    if (def.type === 'FunctionName') return def.node;
    if (def.type === 'Variable') {
      const init = def.node.init;
      return init?.type === 'ArrowFunctionExpression' ||
        init?.type === 'FunctionExpression'
        ? init
        : null;
    }
    return null;
  }
  return null;
}

/** Every string a function is known to return, concatenated. */
function returnedString(
  fn: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
  depth: number,
): string | null {
  if (
    (fn.type === 'ArrowFunctionExpression' ||
      fn.type === 'FunctionExpression' ||
      fn.type === 'FunctionDeclaration') &&
    fn.body.type !== 'BlockStatement'
  ) {
    return staticString(fn.body, sourceCode, depth);
  }
  const parts: string[] = [];
  walk(fn, (child) => {
    if (child.type !== 'ReturnStatement' || child.argument === null) return;
    const value = staticString(child.argument, sourceCode, depth);
    if (value !== null) parts.push(value);
  });
  return parts.length > 0 ? parts.join(' ') : null;
}

/** Depth-first walk over every child node. */
function walk(node: TSESTree.Node, visit: (node: TSESTree.Node) => void): void {
  visit(node);
  for (const key of Object.keys(node)) {
    if (key === 'parent') continue;
    const child = (node as unknown as Record<string, unknown>)[key];
    if (Array.isArray(child)) {
      for (const item of child) if (isNode(item)) walk(item, visit);
    } else if (isNode(child)) {
      walk(child, visit);
    }
  }
}

/**
 * Does this text open a DOCUMENT?
 *
 * The doctype or an `<html>` tag. Not any markup at all — `res.send('<p>ok</p>')`
 * is a fragment for an existing page, and the policy that governs it was
 * established by whatever served that page.
 */
function isHtmlDocument(text: string): boolean {
  const lower = text.toLowerCase();
  return lower.includes('<!doctype') || lower.includes('<html');
}

/**
 * Could this expression EVER hold a document?
 *
 * A may-analysis, deliberately. `staticString` needs one knowable value, and a
 * page accumulated across statements has none:
 *
 * ```js
 * let page = '<!DOCTYPE html><html>…';
 * page += renderRows(range);          // unknowable
 * res.send(page);
 * ```
 *
 * Which is how every hand-rolled server-side renderer builds a page. The
 * binding is re-assigned, so resolving it to a single value correctly refuses
 * — but the question here is not "what is this" and never was. It is "does a
 * document reach the browser", and one write carrying a doctype settles that.
 */
function mayHoldDocument(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): boolean {
  const folded = staticString(node, sourceCode, 0);
  if (folded !== null && isHtmlDocument(folded)) return true;
  if (node.type !== 'Identifier') return false;

  const variable = sourceCode
    .getScope(node)
    .references.find((ref) => ref.identifier === node)?.resolved;
  // `resolved` is NULL for an unresolved global, not undefined — a strict
  // check for only one of the two crashed the lint run on `res.send(payload)`.
  if (variable == null) return false;

  for (const def of variable.defs) {
    if (def.type !== 'Variable' || def.node.init == null) continue;
    const value = staticString(def.node.init, sourceCode, 0);
    if (value !== null && isHtmlDocument(value)) return true;
  }
  for (const reference of variable.references) {
    if (!reference.isWrite()) continue;
    // `writeExpr` is typed nullable, and is absent for a write that has no
    // expression of its own — the binding of a `for…of`, for instance.
    const written = reference.writeExpr;
    if (written == null) continue;
    const value = staticString(written, sourceCode, 0);
    if (value !== null && isHtmlDocument(value)) return true;
  }
  return false;
}

/**
 * Does this argument name a file the browser parses as a document?
 *
 * Folded through `path.join(…)`, since nobody writes a bare relative path in a
 * route handler. Compared by EXTENSION against a closed set — never a
 * substring search for the word "html", which matches `htmlSanitizer.js`.
 */
function namesDocumentFile(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): boolean {
  const candidates: string[] = [];
  const direct = staticString(node, sourceCode, 0);
  if (direct !== null) candidates.push(direct);

  // `path.join(__dirname, 'public', 'index.html')` — the last static segment
  // is the filename.
  if (node.type === 'CallExpression') {
    for (const arg of node.arguments) {
      const value = staticString(arg, sourceCode, 0);
      if (value !== null) candidates.push(value);
    }
  }

  return candidates.some((candidate) => {
    const dot = candidate.lastIndexOf('.');
    return (
      dot !== -1 && DOCUMENT_EXTENSIONS.has(candidate.slice(dot).toLowerCase())
    );
  });
}

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {
  /**
   * Identifiers that name a response object, so `<name>.render(view)` emits a
   * response rather than returning a string.
   *
   * Default: `['res', 'response', 'reply']`. A house convention that calls it
   * something else — `httpRes`, `koaResponse` — adds it here rather than
   * losing the finding. Matched case-insensitively, as a whole identifier, and
   * one member deep so `this.res` and `ctx.res` resolve.
   */
  responseReceivers?: string[];
}

type RuleOptions = [Options?];

export const requireCspHeaders = createRule<RuleOptions, MessageIds>({
  name: 'require-csp-headers',
  // A test that renders a template to assert on its markup is not a route
  // that serves a document. Twenty-nine of the findings on
  // hmpps-arns-assessment-platform-ui were in `*.test.ts`.
  skipTestFiles: true,
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/require-csp-headers.md',
      description: 'Require Content Security Policy headers',
      cwe: 'CWE-1021',
      cvss: 6.5,
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing CSP',
        cwe: 'CWE-1021',
        description: 'HTML response without Content-Security-Policy header',
        severity: 'MEDIUM',
        fix: 'Use helmet.contentSecurityPolicy() or set CSP header manually',
        documentationLink: 'https://cwe.mitre.org/data/definitions/1021.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          responseReceivers: {
            type: 'array',
            items: { type: 'string' },
            default: ['res', 'response', 'reply'],
            description:
              'Identifiers that name a response object, so `<name>.render(view)` emits a response rather than returning a string. Anything unlisted is treated as a template engine.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  // The default list lives HERE and nowhere else. As a module const it was a
  // baked-in vocabulary the rule-audit ratchet reports (and rightly: a word
  // list no option can reach); as a `??` fallback beside a named default it
  // was an unreachable branch. One home, reachable and overridable.
  defaultOptions: [{ responseReceivers: ['res', 'response', 'reply'] }],
  create(context, [options]) {
    // `defaultOptions` supplies this and ESLint merges before `create` runs,
    // so there is nothing to fall back to.
    const responseReceivers = new Set(
      (options as Required<Options>).responseReceivers.map((name) =>
        name.toLowerCase(),
      ),
    );

    function report(node: TSESTree.Node) {
      context.report({ node, messageId: 'violationDetected' });
    }

    /**
     * Is a CSP established anywhere in this file, by any of the mechanisms that
     * actually establish one?
     *
     * Answered as a WHOLE-PROGRAM QUERY, memoised, rather than accumulated
     * across visitors. That is what the question actually is: a policy set by
     * app-level middleware may be declared AFTER the route that relies on it,
     * so a rule that decides from the events it has seen so far is deciding on
     * statement order rather than on the program.
     *
     * Answering it this way also lets the rule key on `CallExpression` ALONE —
     * "a document is emitted here", which is the only thing this rule means.
     * It previously also visited `Program`, `ImportDeclaration`, `Literal`,
     * `JSXAttribute` and `Program:exit`, so it paid a visit on every string in
     * every file to ask a question about four specific positions, and shared
     * visitor keys with `no-clickjacking` under the same CWE. The scan below
     * runs at most once per file, and only when a document is actually emitted
     * — on the overwhelming majority of files, never.
     *
     * The rule previously checked ONLY for a helmet binding, and only for
     * `res.render`. So a handler that set `Content-Security-Policy` on the line
     * above `res.send(html)` was still told "HTML response without
     * Content-Security-Policy header" — the rule reporting its own remediation
     * on the file that had applied it.
     */
    let cspEstablished: boolean | undefined;

    function fileEstablishesCsp(): boolean {
      if (cspEstablished !== undefined) return cspEstablished;
      let found = false;
      walk(context.sourceCode.ast, (node) => {
        if (found || !establishesCsp(node)) return;
        found = true;
      });
      cspEstablished = found;
      return found;
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const method = calleeMethodOf(node);
        if (method === null) return;

        if (FILE_METHODS.has(method)) {
          const target = node.arguments[0];
          if (
            target === undefined ||
            !namesDocumentFile(target, context.sourceCode)
          ) {
            return;
          }
        } else {
          if (!EMIT_METHODS.has(method)) return;

          // WHOSE `render` is this? `res.render(view)` emits a response.
          // `nunjucksEnv.render(template, data)` RETURNS A STRING, and so do
          // marked, mustache, handlebars, ejs and ReactDOMServer.
          //
          // Matching the method name alone made the rule report 31 times on
          // ministryofjustice/hmpps-arns-assessment-platform-ui — every
          // Nunjucks component module and every component TEST — in a
          // repository that sets a nonce-based CSP in middleware. Asking a
          // template helper to set HTTP headers is asking for something it
          // cannot do.
          if (method === 'render' && !receiverLooksLikeResponse(node)) return;

          // `render` always emits a document — the markup lives in a template
          // file this rule will never see. The body methods need proof that
          // what they are emitting IS a document; a fragment or a JSON string
          // is not.
          if (method !== 'render') {
            const body = node.arguments[0];
            if (body === undefined) return;
            if (!mayHoldDocument(body, context.sourceCode)) return;
          }
        }

        if (fileEstablishesCsp()) return;
        // PARTITION — see the note at the top of this file. A scope that sets
        // response headers is no-missing-security-headers' finding.
        if (scopeSetsResponseHeaders(node)) return;
        report(node);
      },
    };

    /** The method this member call invokes, resolving a computed key. */
    /**
     * Names an Express-style response object carries in the wild.
     *
     * A name test, which this file otherwise avoids — but the alternative is
     * type information the rule does not have, and the receiver of `.render`
     * is the only thing that distinguishes emitting a response from building
     * a string. Kept deliberately tight: `res`, `response`, and the `this.res`
     * / `ctx.res` forms. Anything else is assumed to be a template engine,
     * which is the safe direction — a missed `myResponse.render()` is one
     * finding, while matching every `.render` is thirty-one.
     */
    function receiverLooksLikeResponse(node: TSESTree.CallExpression): boolean {
      // Reached only after `calleeMethodOf` returned a name, which it does
      // only for a MemberExpression callee. A runtime guard here would be
      // unreachable, and an unreachable guard reads as a check that runs.
      const callee = node.callee as TSESTree.MemberExpression;

      // EVIDENCE FIRST. If the receiver resolves to something declared in this
      // file, believe the declaration over the name — `const res =
      // nunjucksEnv; res.render('index')` renders a string however it is
      // spelled. Only when the identifier resolves to nothing local does the
      // name decide, which is the case that matters: `(req, res) => …` binds
      // `res` as a PARAMETER, and a parameter has no initialiser to inspect.
      if (callee.object.type === AST_NODE_TYPES.Identifier) {
        const initializer = resolveInitializer(
          callee.object,
          context.sourceCode,
        );
        if (initializer !== undefined) {
          // Resolved. A response object is produced by a framework, never
          // declared as a local alias of something else, so anything with a
          // visible initialiser here is a renderer being given a short name.
          return false;
        }
      }

      let object: TSESTree.Node = callee.object;
      // `this.res.render(…)` / `ctx.res.render(…)` — take the last segment.
      if (object.type === 'MemberExpression' && !object.computed) {
        object = object.property;
      }
      return (
        object.type === 'Identifier' &&
        responseReceivers.has(object.name.toLowerCase())
      );
    }

    function calleeMethodOf(node: TSESTree.CallExpression): string | null {
      if (node.callee.type !== 'MemberExpression') return null;
      const property = node.callee.property;
      // A non-computed member's property is always an Identifier.
      return node.callee.computed
        ? staticString(property, context.sourceCode, 0)
        : (property as TSESTree.Identifier).name;
    }

    /**
     * Does the scope containing this emission set any response header?
     *
     * Read as an AST shape — a member call whose method is one of the four
     * header APIs — never from the receiver's spelling.
     */
    function scopeSetsResponseHeaders(node: TSESTree.Node): boolean {
      let scope: TSESTree.Node = context.sourceCode.ast;
      for (
        let current: TSESTree.Node | null | undefined = node.parent;
        current != null;
        current = current.parent
      ) {
        if (
          current.type === 'FunctionDeclaration' ||
          current.type === 'FunctionExpression' ||
          current.type === 'ArrowFunctionExpression'
        ) {
          scope = current;
          break;
        }
      }

      let found = false;
      walk(scope, (child) => {
        if (
          child.type === 'CallExpression' &&
          child.callee.type === 'MemberExpression' &&
          !child.callee.computed &&
          child.callee.property.type === 'Identifier' &&
          HEADER_METHODS.has(child.callee.property.name)
        ) {
          found = true;
        }
      });
      return found;
    }
  },
});

/**
 * Does this single node establish a Content-Security-Policy?
 *
 * The four mechanisms that actually establish one, each proven from the AST:
 * a helmet binding (helmet sets CSP by default, so it IS this rule's own
 * prescribed fix), the header name in a header-NAME position, and a
 * `<meta http-equiv>`. A mention in prose is none of them — an audit table
 * listing `{ header: 'Content-Security-Policy', owner: 'platform' }`
 * establishes nothing.
 */
function establishesCsp(node: TSESTree.Node): boolean {
  if (node.type === 'ImportDeclaration') {
    return (
      typeof node.source.value === 'string' &&
      HELMET_MODULE.test(node.source.value)
    );
  }
  if (node.type === 'CallExpression') {
    const arg = node.arguments[0];
    return (
      node.callee.type === 'Identifier' &&
      node.callee.name === 'require' &&
      arg?.type === 'Literal' &&
      typeof arg.value === 'string' &&
      HELMET_MODULE.test(arg.value)
    );
  }
  if (node.type === 'Literal') {
    return (
      typeof node.value === 'string' &&
      node.value.toLowerCase() === CSP_HEADER &&
      isHeaderNamePosition(node)
    );
  }
  if (node.type === 'JSXAttribute') {
    return (
      node.name.type === 'JSXIdentifier' &&
      (node.name.name === 'httpEquiv' || node.name.name === 'http-equiv') &&
      node.value?.type === 'Literal' &&
      typeof node.value.value === 'string' &&
      node.value.value.toLowerCase() === CSP_HEADER
    );
  }
  return false;
}

/**
 * Is this string sitting where an HTTP header NAME belongs?
 *
 * Four positions, all closed: the first argument of a header-setting call, an
 * object key, the `key` of a `{ key, value }` config entry, and a `headers`
 * object's property name.
 */
function isHeaderNamePosition(node: TSESTree.Literal): boolean {
  // A Literal always has a parent — it cannot be the root of a program.
  const parent = node.parent;

  if (
    parent.type === 'CallExpression' &&
    parent.arguments[0] === node &&
    parent.callee.type === 'MemberExpression' &&
    !parent.callee.computed &&
    parent.callee.property.type === 'Identifier' &&
    HEADER_METHODS.has(parent.callee.property.name)
  ) {
    return true;
  }

  if (parent.type === 'Property' && !parent.computed) {
    // `{ 'Content-Security-Policy': "default-src 'self'" }`
    if (parent.key === node) return true;
    // `{ key: 'Content-Security-Policy', value: … }` — the Next.js shape.
    if (
      parent.value === node &&
      parent.key.type === 'Identifier' &&
      parent.key.name === 'key'
    ) {
      return true;
    }
  }

  return false;
}
