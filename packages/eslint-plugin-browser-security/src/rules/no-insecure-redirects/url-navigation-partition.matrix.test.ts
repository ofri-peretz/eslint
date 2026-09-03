/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The URL-navigation family partition, asserted as a MATRIX.
 *
 * Four rules look at a URL that decides where a user ends up. A `RuleTester`
 * runs exactly ONE rule, so no rule's own suite can see a double — and none of
 * them can see a HOLE either, which is what this family actually had:
 *
 * ```js
 * top.location.href = location.hash;                          // reported by NOBODY
 * window['location'].href = location.hash;                    // reported by NOBODY
 * window.location.href = new URLSearchParams(location.search).get('next');  // NOBODY
 * ```
 *
 * The old line ran between `window.location.href = x` (no-insecure-redirects)
 * and `location.href = x` (require-url-validation) — the same defect under two
 * rule IDs, decided by the spelling of the receiver. Closing the holes forced
 * the ownership question, because widening either rule to "any `Location`"
 * makes both fire on `location.href = x`.
 *
 * The partition now runs along the API, not the spelling:
 *
 * - **no-insecure-redirects** — anything that navigates THIS document: a write
 *   to a `Location` or its `.href`, `location.assign/replace(x)`, `.redirect(x)`.
 * - **require-url-validation** — navigation that goes somewhere else:
 *   `window.open(x)`, and `router.push/replace(x)` on a resolved router.
 * - **no-unvalidated-deeplinks** — the URL leaves the app: `Linking.openURL(x)`,
 *   `navigation.navigate(x)`.
 * - **no-password-in-url** — COMPLEMENTARY, not partitioned. It reports the
 *   credential inside the string, not where the string sends you.
 *
 * Two invariants, both load-bearing:
 *
 * 1. **No shape reports twice.** That is the user-visible defect.
 * 2. **No shape reports zero times.** A deferral whose owner does not cover
 *    the shape is a coverage hole wearing a deduplication's clothes.
 *
 * Re-run this whenever any of the four touches a sink list or
 * `utils/navigation-targets.ts`.
 */
import { Linter } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import { describe, expect, it } from 'vitest';

import { noInsecureRedirects } from './index';
import { requireUrlValidation } from '../require-url-validation';
import { noUnvalidatedDeeplinks } from '../no-unvalidated-deeplinks';
import { noPasswordInUrl } from '../no-password-in-url';

const FAMILY = {
  'no-insecure-redirects': noInsecureRedirects,
  'require-url-validation': requireUrlValidation,
  'no-unvalidated-deeplinks': noUnvalidatedDeeplinks,
  'no-password-in-url': noPasswordInUrl,
} as const;

type RuleName = keyof typeof FAMILY;

const linter = new Linter();

/** Which of the four rules report on this snippet, and did any of them crash? */
function reportingRules(code: string, filename = 'component.tsx'): RuleName[] {
  const messages = linter.verify(
    code,
    {
      files: ['**/*.tsx'],
      languageOptions: {
        parser: tsParser as never,
        sourceType: 'module',
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
  // "nobody reported" would turn a crash into a passing partition assertion.
  const crashes = messages.filter((message) => message.ruleId === null);
  expect(crashes.map((message) => message.message)).toEqual([]);

  return [
    ...new Set(
      messages.map((message) => (message.ruleId as string).replace('family/', '') as RuleName),
    ),
  ].sort() as RuleName[];
}

const NEXT_ROUTER = 'import { useRouter } from "next/navigation";\n';

/**
 * One shape, one owner. A `[]` here would mean the shape is uncovered; two
 * entries would mean the user sees the same fact twice.
 */
const MATRIX: ReadonlyArray<{ shape: string; code: string; owner: RuleName[] }> = [
  // --- Location writes — every spelling of the holder ---------------------
  {
    shape: 'bare location.href write',
    code: 'location.href = location.search;',
    owner: ['no-insecure-redirects'],
  },
  {
    shape: 'window.location.href write',
    code: 'window.location.href = location.search;',
    owner: ['no-insecure-redirects'],
  },
  {
    shape: 'top.location.href write — framebusting',
    code: 'top.location.href = location.hash;',
    owner: ['no-insecure-redirects'],
  },
  {
    shape: 'document.location.href write',
    code: 'document.location.href = document.referrer;',
    owner: ['no-insecure-redirects'],
  },
  {
    shape: 'computed holder — window["location"].href',
    code: 'window["location"].href = location.hash;',
    owner: ['no-insecure-redirects'],
  },
  {
    shape: 'whole-Location replacement',
    code: 'window.location = location.hash;',
    owner: ['no-insecure-redirects'],
  },

  // --- Location method calls ----------------------------------------------
  {
    shape: 'location.assign()',
    code: 'location.assign(location.hash);',
    owner: ['no-insecure-redirects'],
  },
  {
    shape: 'window.location.replace()',
    code: 'window.location.replace(location.search);',
    owner: ['no-insecure-redirects'],
  },
  {
    shape: 'server-side res.redirect()',
    code: 'res.redirect(req.query.next);',
    owner: ['no-insecure-redirects'],
  },

  // --- the query-string reader, reaching each owner's sink -----------------
  {
    shape: 'URLSearchParams.get() into a Location write',
    code: 'window.location.href = new URLSearchParams(location.search).get("next");',
    owner: ['no-insecure-redirects'],
  },
  {
    shape: 'URL.searchParams.get() into window.open',
    code: 'const p = new URL(window.location.href).searchParams; window.open(p.get("popup"));',
    owner: ['require-url-validation'],
  },

  // --- new browsing context ------------------------------------------------
  {
    shape: 'window.open()',
    code: 'window.open(document.referrer);',
    owner: ['require-url-validation'],
  },
  {
    shape: 'framework router push',
    code: `${NEXT_ROUTER}const router = useRouter(); router.push(location.hash);`,
    owner: ['require-url-validation'],
  },
  {
    shape: 'framework router push, optional chained',
    code: `${NEXT_ROUTER}const router = useRouter(); router?.push(location.hash);`,
    owner: ['require-url-validation'],
  },

  // --- out of the app ------------------------------------------------------
  {
    shape: 'Linking.openURL() with a web source',
    code: 'Linking.openURL(location.search);',
    owner: ['no-unvalidated-deeplinks'],
  },
  {
    shape: 'React Navigation navigate() with a steerable target',
    code: 'navigation.navigate(document.location.search);',
    owner: ['no-unvalidated-deeplinks'],
  },

  // --- the credential in the string ---------------------------------------
  {
    shape: 'userinfo password in a fetch URL',
    code: 'fetch("https://svc:hunter2@api.acme-corp.io/v1");',
    owner: ['no-password-in-url'],
  },
];

describe('URL navigation family — partition matrix', () => {
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
 * `no-password-in-url` is COMPLEMENTARY, not partitioned.
 *
 * One line, two findings, two different remediations: stop letting the user
 * choose the destination, AND get the password out of the string. Suppressing
 * either would lose a real defect, so this is the one shape in the family that
 * is allowed to draw two reports — asserted explicitly so a future
 * "deduplication" cannot delete one of them by accident.
 */
describe('URL navigation family — the deliberate overlap', () => {
  it('a steerable redirect to a credentialled URL is TWO findings', () => {
    expect(
      reportingRules(
        'location.assign(location.hash || "https://svc:hunter2@api.acme-corp.io/");',
      ),
    ).toEqual(['no-insecure-redirects', 'no-password-in-url']);
  });
});

/**
 * The shapes that must stay silent.
 *
 * A partition that quietened everything would satisfy "no doubles" perfectly,
 * so the matrix above is only meaningful next to snippets that were ALREADY
 * quiet and must remain so.
 */
const SILENT: ReadonlyArray<{ shape: string; code: string }> = [
  { shape: 'hardcoded destination', code: 'window.location.href = "/dashboard";' },
  {
    shape: 'destination held in a const',
    code: 'const SUPPORT = "https://help.example.com"; window.open(SUPPORT);',
  },
  {
    shape: 'origin fixed by the leading operand',
    code: 'location.href = "https://example.com/go?next=" + location.search;',
  },
  {
    shape: 'location.origin is the CURRENT origin',
    code: 'window.location.href = location.origin + "/dashboard";',
  },
  {
    shape: 'a plain object property named location',
    code: 'myapp.location.href = req.query.next;',
  },
  {
    shape: 'hash write does not leave the origin',
    code: 'window.location.hash = req.query.next;',
  },
  { shape: 'Array.prototype.push', code: 'queue.push(location.hash);' },
  {
    shape: 'a local function wearing the hook name',
    code: 'function useRouter() { return { push(x) { log(x); } }; } const router = useRouter(); router.push(location.hash);',
  },
  {
    shape: 'port plus an @ later in the path is not userinfo',
    code: 'const u = "https://example.com:8080/threads/a@b";',
  },
  {
    shape: 'the relative-path-only remediation',
    code: 'const next = new URLSearchParams(location.search).get("next"); location.assign(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");',
  },
];

describe('URL navigation family — shapes that must stay silent', () => {
  it.each(SILENT)('$shape', ({ code }) => {
    expect(reportingRules(code)).toEqual([]);
  });
});
