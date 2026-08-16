/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * PARTITION MATRIX — `require-csp-headers` vs `no-clickjacking`.
 *
 * The rule ledger's `duplicate-coverage` check flags this pair: both declare
 * CWE-1021 and both visit `Literal` and `Program:exit`. That check is keyed on
 * CWE plus visitor keys, which is a proxy for overlap, not evidence of it — so
 * it was PROBED before anything was changed, and the probe cleared the pair.
 *
 * What the probe showed, each rule enabled alone and then together:
 *
 * ```
 * $ probe-rule require-csp-headers no-clickjacking -- "res.send('<html><body>Hello</body></html>')"
 * 1 report(s):
 *    require-csp-headers [violationDetected] 1:1 — HTML response without Content-Security-Policy header
 *
 * $ probe-rule no-clickjacking require-csp-headers --file doc.tsx      # <html><head/><body/></html>
 * 1 report(s):
 *    no-clickjacking [missingFrameBusting] 1:1 — No frame-busting code to prevent clickjacking
 * ```
 *
 * The two rules do not answer the same question and cannot both answer it about
 * the same defect:
 *
 * | Question | Owner |
 * |---|---|
 * | Is a document emitted with no Content-Security-Policy? | **require-csp-headers** |
 * | Can the document this file builds be framed, or does it hide a frame? | `no-clickjacking` |
 *
 * They do not even see the same evidence. `require-csp-headers` keys on a
 * response EMISSION (`res.send` / `render` / `sendFile`); `no-clickjacking`'s
 * `Program:exit` finding keys on a JSX document SHELL (`<html>`, `<head>`,
 * `<body>`), and its `Literal` finding keys on parsed CSS declarations. Neither
 * sink is visible to the other rule.
 *
 * So NO deferral was added. A deferral here would have opened a hole: the
 * shapes below where both rules fire are two DIFFERENT defects with two
 * different remediations on one line, and silencing either loses a real
 * finding. That case is locked explicitly in `complementary, not duplicate`.
 *
 * Every row asserts the exact set of (rule, messageId) pairs, so a future
 * change that makes one rule start reporting the other's defect fails here.
 */
import { Linter } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import { describe, expect, it } from 'vitest';

import { requireCspHeaders } from './index';
import { noClickjacking } from '../no-clickjacking/index';

const linter = new Linter();

const RULES = {
  'require-csp-headers': requireCspHeaders,
  'no-clickjacking': noClickjacking,
} as unknown as Linter.Plugin['rules'];

/**
 * The `rule:messageId` pairs both rules produce on this snippet, with both
 * enabled at once.
 *
 * The messageId is part of the key deliberately. Counting reports alone cannot
 * tell "two rules naming one defect twice" — the thing `duplicate-coverage`
 * warns about — apart from "two rules naming two defects", which is the thing
 * this pair actually does.
 */
function findings(code: string, filename = 'handler.tsx'): string[] {
  const messages = linter.verify(
    code,
    {
      files: ['**/*.tsx'],
      languageOptions: {
        parser: tsParser as never,
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
      plugins: { p: { rules: RULES } },
      rules: {
        'p/require-csp-headers': 'error',
        'p/no-clickjacking': 'error',
      },
    },
    filename,
  );
  const crashes = messages.filter((m) => !m.ruleId);
  if (crashes.length > 0) {
    throw new Error(`rule crashed: ${crashes[0].message}`);
  }
  return messages.map((m) => `${m.ruleId as string}:${m.messageId as string}`).sort();
}

describe('partition: require-csp-headers vs no-clickjacking (CWE-1021)', () => {
  it('an HTML response with no CSP is owned by require-csp-headers alone', () => {
    expect(findings("res.send('<html><body>Hello</body></html>');")).toEqual([
      'p/require-csp-headers:violationDetected',
    ]);
  });

  it('a template render with no CSP is owned by require-csp-headers alone', () => {
    expect(findings("res.render('index');")).toEqual([
      'p/require-csp-headers:violationDetected',
    ]);
  });

  it('a JSX document shell is owned by no-clickjacking alone', () => {
    const code = `export default function Document() {
      return (
        <html>
          <head />
          <body />
        </html>
      );
    }`;
    expect(findings(code)).toEqual(['p/no-clickjacking:missingFrameBusting']);
  });

  it('a transparent overlay is owned by no-clickjacking alone', () => {
    const code = "el.style.cssText = 'position: absolute; opacity: 0; z-index: 9999;';";
    expect(findings(code)).toEqual(['p/no-clickjacking:transparentFrameOverlay']);
  });

  it('complementary, not duplicate: one line, two DIFFERENT defects', () => {
    // The worst case the CWE-keyed check is warning about — a single string
    // literal that is both the emitted document (no CSP) and a transparent
    // overlay. Two reports, but two distinct weaknesses with two distinct
    // fixes: set a policy, and stop hiding the element. Neither rule may be
    // made to defer, because doing so drops a real finding.
    const code =
      'res.send(\'<html><body style="position:absolute;opacity:0;z-index:9999"></body></html>\');';
    expect(findings(code)).toEqual([
      'p/no-clickjacking:transparentFrameOverlay',
      'p/require-csp-headers:violationDetected',
    ]);
  });

  it('a JSX shell plus an uncovered render is two defects, one each', () => {
    const code = `export function Document() {
      return <html><head /><body /></html>;
    }
    export function handler(req, res) {
      res.render('index');
    }`;
    expect(findings(code)).toEqual([
      'p/no-clickjacking:missingFrameBusting',
      'p/require-csp-headers:violationDetected',
    ]);
  });

  it('one CSP carrying frame-ancestors silences BOTH rules', () => {
    // The shared remediation, and the strongest evidence the pair is not a
    // duplicate in the harmful direction: the fix each rule asks for is the
    // same header, and applying it once clears both.
    const code = `res.setHeader('Content-Security-Policy', "default-src 'self'; frame-ancestors 'none'");
    res.send('<html><body></body></html>');`;
    expect(findings(code)).toEqual([]);
  });
});
