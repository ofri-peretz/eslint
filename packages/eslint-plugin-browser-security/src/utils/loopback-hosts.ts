/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Is this URL pointed at the local machine, or at a domain reserved for documentation?
 *
 * `http://localhost:3000` never leaves the host, so there is no unencrypted transmission
 * to intercept and no CWE-319 exposure to report. `http://example.com` is reserved by
 * RFC 2606 precisely so that nobody treats it as a real endpoint. Both shapes are
 * everywhere in dev servers, test clients, fixtures and the standard
 * `new URL(req.url, 'http://localhost')` idiom for parsing a relative request URL — which
 * is not a destination at all.
 *
 * Measured: these two shapes were the single largest false-positive source in
 * `no-http-urls`, our highest-volume rule.
 *
 * Matched on the AUTHORITY only, so `http://localhost.evil.test` and
 * `http://example.com.attacker.io` — both real remote hosts — are still reported.
 *
 * Scheme-gated on purpose: `mongodb://user:pass@localhost:27017` and
 * `redis://localhost:6379` stay reported, because the defect there is plaintext
 * credentials in an unencrypted database protocol, which loopback does not make safe —
 * those connection strings get copied to staging with the host swapped and the
 * credentials intact.
 */
const LOOPBACK_HOSTS: ReadonlySet<string> = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '[::1]',
  '::1',
]);

/** Reserved by RFC 2606 / RFC 6761 — guaranteed never to resolve to a real service. */
const RESERVED_HOSTS: ReadonlySet<string> = new Set([
  'example.com',
  'example.org',
  'example.net',
  'example.edu',
]);

const RESERVED_TLDS: readonly string[] = ['.example', '.invalid', '.localhost', '.test'];

/** Schemes where "it never leaves the machine" actually removes the risk. */
const WEB_SCHEMES: ReadonlySet<string> = new Set(['http:', 'ws:']);

/** Extract the bare host from a URL string, or null if it does not parse as one. */
export function hostOf(value: string): string | null {
  const match = /^([a-z][a-z0-9+.-]*:)\/\/([^/?#]*)/i.exec(value);
  if (!match) return null;
  const authority = match[2];
  // Strip userinfo and port: `user:pass@localhost:3000` -> `localhost`
  return authority.slice(authority.lastIndexOf('@') + 1).replace(/:\d+$/, '').toLowerCase();
}

/** Is this a loopback address on a scheme where loopback removes the risk? */
export function isLoopbackUrl(value: string): boolean {
  const match = /^([a-z][a-z0-9+.-]*:)\/\//i.exec(value);
  if (!match || !WEB_SCHEMES.has(match[1].toLowerCase())) return false;
  const host = hostOf(value);
  return host !== null && LOOPBACK_HOSTS.has(host);
}

/**
 * Is this URL's host a loopback address, on ANY scheme?
 *
 * Separate from {@link isLoopbackUrl}, which is web-scheme-gated on purpose —
 * see the note above. This is for callers with their own reason to trust a
 * non-web loopback, such as a test-file carve-out, and it deliberately does not
 * decide by itself whether that reason is good enough.
 */
export function isLoopbackHost(value: string): boolean {
  const host = hostOf(value);
  return host !== null && LOOPBACK_HOSTS.has(host);
}

/** Is this a domain reserved for documentation and examples? */
export function isReservedExampleUrl(value: string): boolean {
  const host = hostOf(value);
  if (host === null) return false;
  return RESERVED_HOSTS.has(host) || RESERVED_TLDS.some((tld) => host.endsWith(tld));
}

/** Either of the above — the check a transport rule wants. */
export function isNonTransmittingUrl(value: string): boolean {
  return isLoopbackUrl(value) || isReservedExampleUrl(value);
}
