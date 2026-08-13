/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import type { TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES } from '@interlace/eslint-devkit';

/**
 * Is this `http://` string an XML namespace / schema IDENTIFIER rather than a
 * URL anything will ever fetch?
 *
 * `xmlns="http://www.w3.org/2000/svg"` is the single largest false-positive
 * shape in the corpus: 29 occurrences in `okta/okta-signin-widget` alone,
 * reported by BOTH `no-http-urls` and `detect-mixed-content`, so 58 findings
 * from one misunderstanding.
 *
 * A namespace URI is an opaque identifier that is compared byte-for-byte. It is
 * never dereferenced, so it carries no transport risk — and "fixing" it to
 * `https://` **breaks the document**, because the string no longer matches the
 * namespace the parser expects. Advising that would be actively harmful, which
 * is what makes this worse than ordinary noise.
 *
 * Two independent signals, either sufficient:
 *
 * 1. The host is a registered namespace authority. These domains exist to mint
 *    identifiers; nobody loads a resource from them at runtime.
 * 2. The value sits in an `xmlns` / `xmlns:*` attribute or property, whatever
 *    the host. That is the XML spec's own declaration syntax, so the value is
 *    an identifier by position regardless of who minted it.
 */

/**
 * Hosts whose `http://` URIs are identifiers by convention.
 *
 * Deliberately a host allowlist, not a substring match: `http://www.w3.org/...`
 * is a namespace, but a URL merely *containing* `w3.org` in a path or query is
 * still a real request.
 */
const NAMESPACE_AUTHORITY_HOSTS: ReadonlySet<string> = new Set([
  'www.w3.org',
  'schemas.xmlsoap.org',
  'schemas.openid.net',
  'schemas.microsoft.com',
  'schemas.android.com',
  'purl.org',
  'ns.adobe.com',
  'sodipodi.sourceforge.net',
  'www.inkscape.org',
  'xml.apache.org',
  'xmlns.com',
  'docbook.org',
  'java.sun.com',
  'www.opengis.net',
  'iptc.org',
]);

/** Attribute / property names that declare an XML namespace. */
function isNamespaceDeclarationName(name: string): boolean {
  // JSX spells the XLink namespace `xmlnsXlink`; XML spells it `xmlns:xlink`.
  return name === 'xmlns' || name.startsWith('xmlns:') || name.startsWith('xmlnsX');
}

/**
 * True when `value` is an XML namespace identifier.
 *
 * `declaredAs` is the attribute or property name the value was written under,
 * when the caller knows it — `xmlns` alone settles it without consulting the
 * host list.
 */
export function isXmlNamespaceUri(value: string, declaredAs?: string): boolean {
  if (declaredAs !== undefined && isNamespaceDeclarationName(declaredAs)) {
    return true;
  }
  let host: string;
  try {
    host = new URL(value).hostname;
  } catch {
    return false;
  }
  return NAMESPACE_AUTHORITY_HOSTS.has(host);
}

/** Parts of a URL that carry nothing from its origin. */
const ORIGIN_INDEPENDENT_URL_PARTS: ReadonlySet<string> = new Set([
  'pathname', 'search', 'searchParams', 'hash',
]);

/**
 * Is this `http://` literal a parsing base whose origin is provably thrown away?
 *
 * `new URL(relative, base)` is the standard way to parse a relative path, and
 * the base is a required frame rather than a destination. When the result is
 * destructured on the spot into origin-independent parts, the scheme cannot
 * reach any network call — there is no URL object left to fetch.
 *
 * Shopify/cli
 * `packages/theme/src/cli/utilities/theme-environment/server-utils.ts:4` is the
 * shape: `const {pathname, search, searchParams} = new URL(event.path, 'http://e.c')`.
 * `e.c` is not a host anything resolves; it exists to satisfy the constructor.
 *
 * Deliberately narrow. It is NOT enough that the literal sits in the base
 * position: `fetch(new URL('/api', 'http://prod.example.com'))` transmits in
 * cleartext and must keep reporting. The destructuring is what proves the
 * origin is discarded, and you cannot fetch a value you destructured into path
 * components.
 */
export function isDiscardedUrlBase(node: TSESTree.Node): boolean {
  const parent = node.parent;
  if (
    parent?.type !== AST_NODE_TYPES.NewExpression ||
    parent.callee.type !== AST_NODE_TYPES.Identifier ||
    parent.callee.name !== 'URL' ||
    parent.arguments[1] !== node
  ) {
    return false;
  }
  const declarator = parent.parent;
  if (
    declarator?.type !== AST_NODE_TYPES.VariableDeclarator ||
    declarator.init !== parent ||
    declarator.id.type !== AST_NODE_TYPES.ObjectPattern
  ) {
    return false;
  }
  // Every destructured part must be origin-independent. A rest element, a
  // computed key, or a read of `origin`/`href`/`host` keeps the scheme alive.
  return declarator.id.properties.every(
    (property) =>
      property.type === AST_NODE_TYPES.Property &&
      !property.computed &&
      property.key.type === AST_NODE_TYPES.Identifier &&
      ORIGIN_INDEPENDENT_URL_PARTS.has(property.key.name),
  );
}

/**
 * Hosts the Secure Contexts spec designates *potentially trustworthy* even over
 * plain HTTP, so no browser treats them as mixed content.
 *
 * @see https://w3c.github.io/webappsec-secure-contexts/#is-origin-trustworthy
 */
const TRUSTWORTHY_LOCAL_HOSTS: ReadonlySet<string> = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  '[::1]',
  '0.0.0.0',
]);

/**
 * Is this `http://` URL exempt from mixed-content blocking?
 *
 * Not a style preference: a browser loading `http://localhost:3000` from an
 * HTTPS page does **not** flag or block it, because the origin is potentially
 * trustworthy per the Secure Contexts spec. Reporting it as mixed content
 * describes behaviour that does not happen — and the corpus hits are all
 * webpack dev-server and end-to-end fixture config, where there is no HTTPS
 * page in the picture at all.
 */
export function isTrustworthyLocalUrl(value: string): boolean {
  let host: string;
  try {
    host = new URL(value).hostname;
  } catch {
    return false;
  }
  // `*.localhost` is reserved for loopback by RFC 6761 and treated as
  // trustworthy alongside the bare name.
  return TRUSTWORTHY_LOCAL_HOSTS.has(host) || host.endsWith('.localhost');
}
