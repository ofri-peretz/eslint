/**
 * Regression lock: the response-header contract in `next.config.mjs`.
 *
 * CLAUDE.md makes these headers part of the deploy contract — "don't loosen
 * them to make a feature work, find a different feature path". Nothing
 * enforced that. This lock reads the config as source text (the module can't
 * be imported here: it pulls in fumadocs' MDX plugin, which needs a real
 * build context) and asserts the parts that must not silently regress.
 *
 * Scope note: this pins the *policy*, not the delivery. That a header reaches
 * the browser is verified by the Playwright smoke gate against a real
 * deployment; this catches the edit that removes it long before then.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const CONFIG = readFileSync(join(__dirname, '../../next.config.mjs'), 'utf-8');

describe('security header contract', () => {
  it.each([
    ['X-Content-Type-Options', 'nosniff'],
    ['X-Frame-Options', 'DENY'],
    ['Referrer-Policy', 'strict-origin-when-cross-origin'],
    ['Strict-Transport-Security', 'includeSubDomains'],
  ])('sends %s', (header, value) => {
    expect(CONFIG).toContain(header);
    expect(CONFIG).toContain(value);
  });

  it('opts out of the Topics API with the live token, not withdrawn FLoC', () => {
    expect(CONFIG).toContain('browsing-topics=()');
    expect(CONFIG).not.toContain('interest-cohort=()');
  });

  it('keeps poweredByHeader off and compression on', () => {
    expect(CONFIG).toMatch(/poweredByHeader:\s*false/);
    expect(CONFIG).toMatch(/compress:\s*true/);
  });
});

describe('CSP directives that must never loosen', () => {
  it.each([
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "default-src 'self'",
    "form-action 'self'",
  ])('pins %s', (directive) => {
    expect(CONFIG).toContain(directive);
  });

  it("does not allow 'unsafe-eval' in the enforcing header", () => {
    // The report-only header carries it deliberately (see the TODO in the
    // config). Promoting the policy must not carry it across — this fails the
    // moment an enforcing `Content-Security-Policy` is added while the
    // eval escape hatch is still in the policy string.
    const enforcing = /key:\s*'Content-Security-Policy'/.test(CONFIG);
    if (enforcing) expect(CONFIG).not.toContain('unsafe-eval');
  });
});

describe('image and cache policy', () => {
  it('never wildcards a remote image host', () => {
    expect(CONFIG).not.toMatch(/hostname:\s*'\*/);
    expect(CONFIG).toMatch(/remotePatterns/);
  });

  it('serves immutable build output with a one-year max-age', () => {
    expect(CONFIG).toContain('public, max-age=31536000, immutable');
  });
});
