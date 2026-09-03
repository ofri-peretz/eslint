/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The cleartext-transport family partition, asserted as a MATRIX.
 *
 * Six rules match `http://` or `ws://` in a string. Each rule's own test file
 * can only prove that rule fires; none of them can see a DOUBLE, because a
 * `RuleTester` runs exactly one rule. That blind spot is how
 * `fetch("http://api.acme-corp.io")` came to draw four reports at three
 * severities under two CWEs while every rule's suite stayed green.
 *
 * So this file lints one snippet with all six rules enabled at once and asserts
 * the exact SET of rules that reported. Two invariants, both load-bearing:
 *
 * 1. **No shape reports twice.** That is the user-visible defect.
 * 2. **No shape reports zero times.** A partition is only sound if the owner
 *    covers the shape totally — otherwise "deferring" is a coverage hole
 *    wearing a deduplication's clothes. That failure mode has already happened
 *    in this package: widening one rule's sink list silently uncovered shapes
 *    its sibling had owned.
 *
 * Re-run this whenever any of the six touches a scheme list, a sink list, or
 * `utils/transport-ownership.ts`.
 */
import { Linter } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import { describe, expect, it } from 'vitest';

import { requireHttpsOnly } from './index';
import { noHttpUrls } from '../no-http-urls';
import { noUnencryptedTransmission } from '../no-unencrypted-transmission';
import { detectMixedContent } from '../detect-mixed-content';
import { noInsecureWebsocket } from '../no-insecure-websocket';
import { requireWebsocketWss } from '../require-websocket-wss';

const FAMILY = {
  'require-https-only': requireHttpsOnly,
  'no-http-urls': noHttpUrls,
  'no-unencrypted-transmission': noUnencryptedTransmission,
  'detect-mixed-content': detectMixedContent,
  'no-insecure-websocket': noInsecureWebsocket,
  'require-websocket-wss': requireWebsocketWss,
} as const;

type RuleName = keyof typeof FAMILY;

const linter = new Linter();

/** Which of the six rules report on this snippet, and did any of them crash? */
function reportingRules(code: string, filename = 'component.tsx'): RuleName[] {
  const messages = linter.verify(
    code,
    {
      files: ['**/*.tsx'],
      languageOptions: {
        parser: tsParser as never,
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
      plugins: { family: { rules: FAMILY as never } },
      rules: Object.fromEntries(
        Object.keys(FAMILY).map((name) => [`family/${name}`, 'error']),
      ) as never,
    },
    filename,
  );

  // A rule that throws surfaces as a message with no `ruleId`. Counting it as
  // "nobody reported" would turn a crash into a passing partition assertion —
  // the exact silent failure this repo keeps getting bitten by.
  const crashes = messages.filter((message) => message.ruleId === null);
  expect(crashes.map((message) => message.message)).toEqual([]);

  return [
    ...new Set(
      messages.map((message) => (message.ruleId as string).replace('family/', '') as RuleName),
    ),
  ].sort() as RuleName[];
}

/**
 * One shape, one owner. The `owner` column is the whole contract: a `[]` here
 * would mean the shape is uncovered, and two entries would mean the user sees
 * the same fact twice.
 */
const MATRIX: ReadonlyArray<{ shape: string; code: string; owner: RuleName[] }> = [
  // --- http://, by role ---------------------------------------------------
  {
    shape: 'fetch() URL argument',
    code: 'fetch("http://api.acme-corp.io/v1/users");',
    owner: ['require-https-only'],
  },
  {
    shape: 'axios verb URL argument',
    code: 'axios.get("http://api.acme-corp.io/v1");',
    owner: ['require-https-only'],
  },
  {
    shape: 'fetch() with interpolated authority',
    code: 'fetch(`http://${host}/api`);',
    owner: ['require-https-only'],
  },
  {
    shape: 'fetch() URL built by concatenation',
    code: 'fetch("http://api.acme-corp.io" + path);',
    owner: ['require-https-only'],
  },
  {
    shape: 'window.fetch URL argument',
    code: 'window.fetch("http://metrics.acme-corp.io/collect");',
    owner: ['require-https-only'],
  },
  {
    shape: 'worker self.fetch URL argument',
    code: 'self.fetch("http://api.acme-corp.io/v1/jobs");',
    owner: ['require-https-only'],
  },
  {
    shape: 'axios bound under a renamed import',
    code: 'import http from "axios"; http.get("http://api.acme-corp.io/v1");',
    owner: ['require-https-only'],
  },
  {
    // `parent` names a DIFFERENT window, so this is not the document's Fetch
    // API and the residual owner must keep it. The row exists because widening
    // the fetch sink is exactly the change that could have swallowed it.
    shape: 'parent.fetch — a different window, not the global',
    code: 'parent.fetch("http://api.acme-corp.io/v1/session");',
    owner: ['no-http-urls'],
  },
  {
    shape: 'hardcoded config constant',
    code: 'const API_BASE = "http://api.acme-corp.io";',
    owner: ['no-http-urls'],
  },
  {
    shape: 'object property endpoint',
    code: 'const config = { proxy: "http://proxy.acme-corp.io:8080" };',
    owner: ['no-http-urls'],
  },
  {
    shape: 'anchor href — a navigation, NOT a subresource',
    code: 'export const Docs = () => <a href="http://docs.acme-corp.io">docs</a>;',
    owner: ['no-http-urls'],
  },
  {
    shape: 'JSX img src — subresource',
    code: 'export const Logo = () => <img src="http://cdn.acme-corp.io/logo.png" alt="" />;',
    owner: ['detect-mixed-content'],
  },
  {
    shape: 'JSX script src — subresource',
    code: 'export const Tag = () => <script src="http://cdn.acme-corp.io/a.js" />;',
    owner: ['detect-mixed-content'],
  },
  {
    shape: 'JSX link stylesheet — subresource',
    code: 'export const T = () => <link rel="stylesheet" href="http://cdn.acme-corp.io/t.css" />;',
    owner: ['detect-mixed-content'],
  },
  {
    // `rel="canonical"` issues NO request, so it is not mixed content — but it
    // is still a hardcoded cleartext URL, and the residual owner must pick it
    // up. This row is the one that proves the `rel` gate created a deferral
    // hand-off rather than a coverage hole.
    shape: 'JSX link canonical — metadata, not a load',
    code: 'export const H = () => <link rel="canonical" href="http://acme-corp.io/page" />;',
    owner: ['no-http-urls'],
  },
  {
    shape: 'uppercase scheme in a subresource',
    code: 'el.src = "HTTP://cdn.acme-corp.io/lib.js";',
    owner: ['detect-mixed-content'],
  },
  {
    shape: 'JSX form action — mixed form submission',
    code: 'export const F = () => <form action="http://forms.acme-corp.io/subscribe" />;',
    owner: ['detect-mixed-content'],
  },
  {
    shape: 'JSX subresource with interpolated path',
    code: 'export const A = ({ id }) => <img src={`http://cdn.acme-corp.io/${id}.png`} alt="" />;',
    owner: ['detect-mixed-content'],
  },
  {
    shape: 'DOM .src assignment — subresource',
    code: 'el.src = "http://cdn.acme-corp.io/analytics.js";',
    owner: ['detect-mixed-content'],
  },
  {
    shape: 'setAttribute("src", …) — subresource',
    code: 'el.setAttribute("src", "http://cdn.acme-corp.io/a.js");',
    owner: ['detect-mixed-content'],
  },
  {
    shape: 'service-worker importScripts — subresource',
    code: 'importScripts("http://cdn.acme-corp.io/sw-helper.js");',
    owner: ['detect-mixed-content'],
  },

  // --- ws://, by role -----------------------------------------------------
  {
    shape: 'WebSocket constructor argument',
    code: 'new WebSocket("ws://live.acme-corp.io");',
    owner: ['require-websocket-wss'],
  },
  {
    shape: 'WebSocket constructor with interpolated path',
    code: 'new WebSocket(`ws://live.acme-corp.io/${room}`);',
    owner: ['require-websocket-wss'],
  },
  {
    shape: 'ws:// endpoint in a config map',
    code: 'const SOCKETS = { live: "ws://live.acme-corp.io" };',
    owner: ['no-insecure-websocket'],
  },

  // --- the non-web protocols, owned by nobody else -------------------------
  {
    shape: 'mongodb:// connection string',
    code: 'mongoose.connect("mongodb://u:p@db.acme-corp.io:27017");',
    owner: ['no-unencrypted-transmission'],
  },
  {
    shape: 'redis:// connection string',
    code: 'const client = createClient({ url: "redis://cache.acme-corp.io:6379" });',
    owner: ['no-unencrypted-transmission'],
  },
  {
    shape: 'ftp:// endpoint',
    code: 'const DROP = "ftp://files.acme-corp.io/incoming";',
    owner: ['no-unencrypted-transmission'],
  },
];

describe('cleartext transport family — partition matrix', () => {
  it.each(MATRIX)('$shape → $owner', ({ code, owner }) => {
    expect(reportingRules(code)).toEqual([...owner].sort());
  });

  it('every shape draws exactly one report — no doubles, no holes', () => {
    const offenders = MATRIX.filter(({ code }) => reportingRules(code).length !== 1).map(
      ({ shape, code }) => `${shape}: ${reportingRules(code).join(' + ') || '(NOBODY)'}`,
    );
    expect(offenders).toEqual([]);
  });
});

/**
 * The shapes that must stay silent.
 *
 * A partition that quietened everything would satisfy "no doubles" perfectly,
 * so the matrix above is only meaningful next to a set of snippets that were
 * ALREADY quiet and must remain so — and next to the positive controls above,
 * which prove each rule can still fire at all.
 */
const SILENT: ReadonlyArray<{ shape: string; code: string }> = [
  { shape: 'https fetch', code: 'fetch("https://api.acme-corp.io/v1");' },
  { shape: 'wss constructor', code: 'new WebSocket("wss://live.acme-corp.io");' },
  { shape: 'loopback dev server', code: 'fetch("http://localhost:3000/api");' },
  { shape: 'RFC 2606 reserved host', code: 'fetch("http://example.com");' },
  {
    shape: 'XML namespace identifier',
    code: 'const NS = "http://www.w3.org/2000/svg";',
  },
  {
    shape: 'protocol inspection guard',
    code: 'if (url.startsWith("http://")) { upgrade(url); }',
  },
  {
    shape: 'discarded URL parsing base',
    code: 'const { pathname, search } = new URL(event.path, "http://e.c");',
  },
  {
    shape: 'relative subresource — the correct remediation',
    code: 'export const Logo = () => <img src="/static/logo.png" alt="" />;',
  },
];

describe('cleartext transport family — shapes that must stay silent', () => {
  it.each(SILENT)('$shape', ({ code }) => {
    expect(reportingRules(code)).toEqual([]);
  });
});

/*
 * ── The same shapes, under the WHOLE `recommended` preset ────────────────────
 *
 * The matrix above enables six rules. That proves the family does not disagree
 * with itself, but it cannot see a seventh rule outside the family piling onto
 * the same line — and the change that put `detect-mixed-content` back into
 * `recommended` is exactly the kind that could introduce one.
 *
 * So the transport shapes are linted again with the preset a real user gets.
 * Scoped deliberately to those shapes: this file owns the transport partition,
 * not the other families' (storage, CSP, eval each lock their own).
 */
import plugin, { configs } from '../../index';

const RECOMMENDED = configs.recommended.rules ?? {};

function presetReports(code: string): string[] {
  const messages = linter.verify(
    code,
    {
      files: ['**/*.tsx'],
      languageOptions: {
        parser: tsParser as never,
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
      plugins: { 'browser-security': plugin as never },
      rules: RECOMMENDED as never,
    },
    'component.tsx',
  );
  const crashes = messages.filter((message) => message.ruleId === null);
  expect(crashes.map((message) => message.message)).toEqual([]);
  return [...new Set(messages.map((message) => message.ruleId as string))];
}

describe('transport shapes under the full recommended preset', () => {
  it.each(MATRIX.filter((row) => row.owner.length === 1))(
    '$shape draws exactly one preset finding',
    ({ code }) => {
      expect(presetReports(code)).toHaveLength(1);
    },
  );

  it.each(SILENT)('$shape stays silent under the preset', ({ code }) => {
    expect(presetReports(code)).toEqual([]);
  });
});
