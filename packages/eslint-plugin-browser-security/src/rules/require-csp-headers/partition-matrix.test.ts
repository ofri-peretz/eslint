/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * PARTITION MATRIX — the "missing Content-Security-Policy" verdict, and who
 * owns it.
 *
 * `require-csp-headers` (CWE-1021) and `no-missing-security-headers` (CWE-693)
 * both answered "this response has no CSP". On one realistic Express handler
 * they both fired, at CVSS 6.5 and 7.5, for the identical defect. The
 * package's duplicate detector is CWE-keyed and could not see it: the CWEs
 * differ, so the pair never registered as a duplicate at all.
 *
 * The partition, documented in both rules' file headers:
 *
 * - `no-missing-security-headers` owns any scope that explicitly SETS response
 *   headers and omits a required one.
 * - `require-csp-headers` owns a document emitted where NO response header is
 *   set at all — the case the other rule structurally cannot see.
 *
 * Every row below asserts EXACTLY ONE report across both rules. A row that
 * scores 2 is a duplicate; a row that scores 0 is a shape that fell through
 * the partition, which is the failure mode a partition most easily introduces.
 */
import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

import { requireCspHeaders } from './index';
import { noMissingSecurityHeaders } from '../no-missing-security-headers/index';

const linter = new Linter();

const RULES = {
  'require-csp-headers': requireCspHeaders,
  'no-missing-security-headers': noMissingSecurityHeaders,
} as unknown as Linter.Plugin['rules'];

/** Which rules report on this snippet, with both enabled at once. */
function reportingRules(code: string): string[] {
  const messages = linter.verify(
    code,
    {
      files: ['**/*.js'],
      languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
      plugins: { p: { rules: RULES } },
      rules: {
        'p/require-csp-headers': 'error',
        'p/no-missing-security-headers': 'error',
      },
    },
    'handler.js',
  );
  const crashes = messages.filter((m) => !m.ruleId);
  if (crashes.length > 0) {
    throw new Error(`rule crashed: ${crashes[0].message}`);
  }
  // Distinct rules, not distinct reports: one rule reporting a shape twice is
  // a different (and lesser) problem than two rules reporting it once each.
  return [...new Set(messages.map((m) => m.ruleId as string))].sort();
}

const SHAPES: ReadonlyArray<{
  readonly name: string;
  readonly code: string;
  readonly owner: string;
}> = [
  {
    name: 'sets a header, omits CSP, sends a document',
    owner: 'p/no-missing-security-headers',
    code: `app.get('/', (req, res) => {
      res.setHeader('X-Frame-Options', 'DENY');
      res.send('<html><body>hi</body></html>');
    });`,
  },
  {
    name: 'sets a header, omits CSP, renders a template',
    owner: 'p/no-missing-security-headers',
    code: `app.get('/', (req, res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.render('index');
    });`,
  },
  {
    name: 'declares a header block, omits CSP',
    owner: 'p/no-missing-security-headers',
    code: `export function GET() {
      return new Response('<!DOCTYPE html><html></html>', {
        headers: { 'Content-Type': 'text/html', 'X-Frame-Options': 'DENY' },
      });
    }`,
  },
  {
    name: 'sends a document, sets no header at all',
    owner: 'p/require-csp-headers',
    code: `app.get('/', (req, res) => { res.send('<html><body>hi</body></html>'); });`,
  },
  {
    name: 'renders a template, sets no header at all',
    owner: 'p/require-csp-headers',
    code: `app.get('/', (req, res) => { res.render('index'); });`,
  },
  {
    name: 'streams a document, sets no header at all',
    owner: 'p/require-csp-headers',
    code: `app.get('/', (req, res) => {
      res.write('<!DOCTYPE html><html><body>');
      res.end('</body></html>');
    });`,
  },
];

describe('partition: who owns "this response has no CSP"', () => {
  it.each(SHAPES)('$name -> exactly one report', ({ code, owner }) => {
    expect(reportingRules(code)).toEqual([owner]);
  });

  it('the pre-partition shape reported twice, and now reports once', () => {
    // The exact handler that exposed the duplicate.
    const code = `app.get('/', (req, res) => {
      res.setHeader('X-Frame-Options', 'DENY');
      res.send('<html><body>hi</body></html>');
    });`;
    expect(reportingRules(code)).toHaveLength(1);
  });

  it('a fully protected handler is silent under both rules', () => {
    const code = `app.get('/', (req, res) => {
      res.setHeader('Content-Security-Policy', "default-src 'self'");
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.send('<html><body>hi</body></html>');
    });`;
    expect(reportingRules(code)).toEqual([]);
  });
});
