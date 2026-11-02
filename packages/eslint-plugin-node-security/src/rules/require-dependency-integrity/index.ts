/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Require integrity hashes for external resources
 */

import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

import { resolveConstantString } from '../../utils/const-value';

type MessageIds = 'violationDetected';

/**
 * The `<script …>` / `<link …>` opening tags in a chunk of HTML-bearing text.
 *
 * The body crosses newlines on purpose — these tags are routinely written one
 * attribute per line — and it steps OVER quoted attribute values, because HTML
 * ends a tag at the first `>` that is not inside one. The previous `[^>]*`
 * split `<script onerror="if (retries > 0) …" src="https://cdn…">` in two at
 * the `>` in the handler, so the `src` landed in the second half and the tag
 * scanned as having no URL at all — an unprotected CDN script that could be
 * hidden behind any attribute containing a comparison.
 *
 * The three alternatives start with different characters, so no input can be
 * matched two ways and the scan stays linear: an alternation that could
 * consume a quote either way is the classic exponential-backtracking shape,
 * and this regex runs over every string literal in a user's codebase.
 */
const RESOURCE_TAG = /<(script|link)\b(?:"[^"]*"|'[^']*'|[^>"'])*>/gi;

/** `name="value"`, `name='value'` or `name=value` inside one tag. */
const TAG_ATTRIBUTE =
  /[\s/]([a-z][a-z0-9-]*)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;

/** Host fragments that mark a URL as third-party-delivered. */
const CDN_HOSTS = ['cdn.', 'cdnjs.', 'unpkg.', 'jsdelivr.'] as const;

/**
 * `rel` values SRI actually covers.
 *
 * The spec defines integrity metadata for script and style destinations only.
 * A browser ignores `integrity` on `preconnect`, `dns-prefetch`, `icon`,
 * `manifest`, `canonical` and `alternate` — so demanding a hash on those asks
 * the reader for markup that verifies nothing, with no remediation available.
 * Every one of those relations is standard advice in a performance guide, and
 * the rule reported all of them.
 */
const SRI_LINK_RELS = new Set(['stylesheet', 'modulepreload']);

/** `<link rel="preload">` carries integrity only for these destinations. */
const SRI_PRELOAD_DESTINATIONS = new Set(['style', 'script']);

/** Every attribute of one tag, lower-cased name to unquoted value. */
function attributesOf(tag: string): Map<string, string> {
  const attributes = new Map<string, string>();
  for (const match of tag.matchAll(TAG_ATTRIBUTE)) {
    const raw = match[2];
    const quoted = raw.startsWith('"') || raw.startsWith("'");
    attributes.set(match[1].toLowerCase(), quoted ? raw.slice(1, -1) : raw);
  }
  return attributes;
}

/**
 * The host this URL fetches from, or `undefined` when it names no host.
 *
 * Only an absolute or protocol-relative URL reaches a third party. Testing the
 * CDN fragments against the whole TAG instead made `/assets/cdn.fallback.js`
 * and `/js/app.js?variant=cdn.disabled` — same-origin files this application
 * serves itself — read as CDN-delivered. There is no third party in either
 * request and no hash a reader could add that would mean anything.
 */
function hostOf(url: string): string | undefined {
  const match = /^\s*(?:[a-z][a-z0-9+.-]*:)?\/\/([^/?#]*)/i.exec(url);
  return match?.[1].toLowerCase();
}

/**
 * Does a `<link>` with these attributes take an integrity hash at all?
 *
 * Deliberately asymmetric. A relation the spec excludes is positive evidence
 * that no hash belongs here, so the rule abstains. A MISSING `rel` is no
 * evidence at all, and treating absence as exclusion would let one omitted
 * attribute suppress the finding — so an unlabelled link is still judged.
 */
function linkTakesIntegrity(attributes: ReadonlyMap<string, string>): boolean {
  // `rel` is a space-separated token list; no token at all (absent, empty or
  // only whitespace) is the unlabelled case.
  const relations = (attributes.get('rel') ?? '').toLowerCase().match(/\S+/g);
  if (relations === null) return true;
  if (relations.some((value) => SRI_LINK_RELS.has(value))) return true;
  if (!relations.includes('preload')) return false;
  return SRI_PRELOAD_DESTINATIONS.has(
    (attributes.get('as') ?? '').toLowerCase(),
  );
}

/**
 * Does this text contain a CDN-served resource tag with no integrity hash?
 *
 * The check is PER TAG. Asking whether `integrity=` appears anywhere in the
 * template made one protected tag vouch for every other tag beside it, which
 * is a suppression, not a check — and it was concealing exactly the class of
 * defect this rule exists to catch. In Shopify/cli
 * `packages/cli-kit/src/public/node/graphiql/templates/graphiql.tsx` the two
 * React bundles carry `integrity="sha512-…"`, and their presence silenced the
 * unprotected `graphiql.min.js`, `graphiql.min.css` and Polaris `styles.css`
 * tags in the same template. The rule reported nothing on that file.
 *
 * Within a tag the decision is made from parsed ATTRIBUTES rather than from
 * substrings of the tag text. `tag.includes('integrity=')` was satisfied by
 * `data-integrity="…"` — a build-pipeline bookkeeping attribute the browser
 * ignores completely — so a half-finished SRI migration silenced the very
 * finding that would have flagged it as half-finished.
 */
function hasUnprotectedCdnTag(text: string): boolean {
  for (const match of text.matchAll(RESOURCE_TAG)) {
    const isScript = match[1].toLowerCase() === 'script';
    if (isUnprotectedCdnResource(isScript, attributesOf(match[0]))) return true;
  }
  return false;
}

/**
 * One `<script>` / `<link>` tag, by its attributes: does it load a CDN
 * resource that takes an integrity hash, without one?
 *
 * Shared by the string scan and the JSX visitor, so `<script src=…>` written
 * in a template and written as JSX are judged by one definition.
 */
function isUnprotectedCdnResource(
  isScript: boolean,
  attributes: ReadonlyMap<string, string>,
): boolean {
  const url = attributes.get(isScript ? 'src' : 'href');
  // No URL: an inline `<script>` or `<style>` fetches nothing, so there are
  // no bytes for a hash to describe.
  if (url === undefined) return false;

  const host = hostOf(url);
  if (host === undefined) return false;
  if (!CDN_HOSTS.some((fragment) => host.includes(fragment))) return false;

  if (!isScript && !linkTakesIntegrity(attributes)) return false;
  return !attributes.has('integrity');
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const requireDependencyIntegrity = createRule<RuleOptions, MessageIds>({
  name: 'require-dependency-integrity',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/require-dependency-integrity.md',
      description: 'Require SRI (Subresource Integrity) for CDN resources',
      cwe: 'CWE-494',
      cvss: 8.1,
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing SRI',
        cwe: 'CWE-494',
        description:
          'External resource loaded without integrity hash - supply chain risk',
        severity: 'HIGH',
        fix: 'Add integrity="sha384-..." and crossorigin="anonymous" attributes',
        documentationLink: 'https://cwe.mitre.org/data/definitions/494.html',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  createOnce(context) {
    function report(node: TSESTree.Node) {
      context.report({ node, messageId: 'violationDetected' });
    }

    /**
     * The markup a template literal actually produces, as far as it is knowable.
     *
     * Reading the template's SOURCE text meant a host hoisted to a module
     * constant — `` `<script src="${CDN_BASE}/chart.js"></script>` ``, which is
     * how every real template writes a CDN base URL — scanned as the literal
     * characters `${CDN_BASE}` and matched no known host. The emitted markup was
     * byte-for-byte the reported case; only the spelling differed.
     *
     * An expression that cannot be resolved becomes NUL, a character no URL,
     * host or attribute name can contain, so an unknown segment can never
     * complete a match by accident — it can only prevent one.
     */
    const renderTemplate = (node: TSESTree.TemplateLiteral): string => {
      // `cooked` is null for an invalid escape as of @typescript-eslint
      // 8.68.0; 8.54.0 handed back the raw text. This is a bare
      // `TemplateLiteral` visitor, so a TAGGED template reaches it and a
      // truncated render would let an unprotected CDN tag through.
      let text = node.quasis[0].value.cooked ?? node.quasis[0].value.raw;
      for (const [index, expression] of node.expressions.entries()) {
        const resolved = resolveConstantString(context.sourceCode, expression);
        text += resolved === null ? '\u0000' : resolved.value;
        text +=
          node.quasis[index + 1].value.cooked ??
          node.quasis[index + 1].value.raw;
      }
      return text;
    };

    /** A JSX attribute's static string value; `''` for a bare flag. */
    const jsxAttributeValue = (
      value: TSESTree.JSXAttribute['value'],
    ): string | null => {
      if (value === null) return '';
      // A quoted JSX attribute is always a string literal.
      if (value.type === AST_NODE_TYPES.Literal) return String(value.value);
      // `src={}` holds a JSXEmptyExpression, which resolves to no constant
      // below and so comes back null like any other unknown.
      if (value.type !== AST_NODE_TYPES.JSXExpressionContainer) return null;
      const expression = value.expression;
      if (expression.type === AST_NODE_TYPES.TemplateLiteral) {
        const rendered = renderTemplate(expression);
        return rendered.includes('\u0000') ? null : rendered;
      }
      return (
        resolveConstantString(context.sourceCode, expression)?.value ?? null
      );
    };

    return {
      Literal(node: TSESTree.Literal) {
        // The unescaped value, not the printed source: `'\x3Cscript …'` is a
        // script tag to the browser and must be to us too.
        if (typeof node.value !== 'string') return;
        if (hasUnprotectedCdnTag(node.value)) report(node);
      },

      TemplateLiteral(node: TSESTree.TemplateLiteral) {
        if (hasUnprotectedCdnTag(renderTemplate(node))) report(node);
      },

      /**
       * `<script src="https://cdnjs…/jquery.min.js" />` written as JSX — the
       * same tag a server-rendered React head emits, which the string scan
       * never sees because JSX is not a string.
       *
       * A spread (`{...props}`) may carry `integrity`, and an unresolvable
       * `rel` may exclude it, so either makes the element unknowable and the
       * rule abstains rather than guess.
       */
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        if (node.name.type !== AST_NODE_TYPES.JSXIdentifier) return;
        const tag = node.name.name;
        if (tag !== 'script' && tag !== 'link') return;
        const attributes = new Map<string, string>();
        for (const attribute of node.attributes) {
          if (
            attribute.type !== AST_NODE_TYPES.JSXAttribute ||
            attribute.name.type !== AST_NODE_TYPES.JSXIdentifier
          ) {
            return;
          }
          const name = attribute.name.name.toLowerCase();
          const value = jsxAttributeValue(attribute.value);
          // An unknown value is kept as `''`, the reading that never reports:
          // an empty URL has no CDN host, an empty `as` is no SRI destination,
          // and `integrity={sri}` is present whatever it holds. `nonce={n}`
          // says nothing about integrity at all. Only `rel` reads the other
          // way — empty means unlabelled, which IS judged — so an unknown
          // `rel` (it may be `icon`) makes the element unknowable.
          if (value === null && name === 'rel') return;
          attributes.set(name, value ?? '');
        }
        if (isUnprotectedCdnResource(tag === 'script', attributes)) {
          report(node);
        }
      },
    };
  },
});
