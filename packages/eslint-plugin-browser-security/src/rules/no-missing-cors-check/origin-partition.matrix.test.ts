/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * PARTITION MATRIX — the CWE-346 family: `no-missing-cors-check`,
 * `no-postmessage-wildcard-origin` and `require-postmessage-origin-check`.
 *
 * The rule ledger's `duplicate-coverage` check flags `no-missing-cors-check`
 * against both postMessage rules: all three declare CWE-346 (Origin Validation
 * Error) and all three visit `CallExpression`. That check is keyed on CWE plus
 * visitor keys, which is a proxy for overlap, not evidence of it — so this
 * matrix runs its probe: every rule enabled at once, one snippet per shape,
 * and the exact set of findings asserted.
 *
 * The three rules own three different origin decisions, on three different
 * channels:
 *
 * | Question | Owner |
 * |---|---|
 * | Does a SERVER grant cross-origin reads to every origin (CORS)? | **no-missing-cors-check** |
 * | Does a window SEND a message to whichever origin is listening? | `no-postmessage-wildcard-origin` |
 * | Does a window ACT on a message without checking who sent it? | `require-postmessage-origin-check` |
 *
 * A CORS decision is made by the `cors` package or an
 * `Access-Control-Allow-Origin` header; a postMessage decision is made by the
 * `targetOrigin` argument or by an `event.origin` test. No sink is visible to
 * more than one rule, so no deferral was added.
 *
 * Every row asserts the exact set of (rule, messageId) pairs, so a future change
 * that makes one rule start reporting another's defect fails here.
 */
import { Linter } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import { describe, expect, it } from 'vitest';

import { noMissingCorsCheck } from './index';
import { noPostmessageWildcardOrigin } from '../no-postmessage-wildcard-origin/index';
import { requirePostmessageOriginCheck } from '../require-postmessage-origin-check/index';

const linter = new Linter();

const RULES = {
  'no-missing-cors-check': noMissingCorsCheck,
  'no-postmessage-wildcard-origin': noPostmessageWildcardOrigin,
  'require-postmessage-origin-check': requirePostmessageOriginCheck,
} as unknown as Linter.Plugin['rules'];

/**
 * The `rule:messageId` pairs all three rules produce on this snippet, with
 * every rule enabled at once.
 */
function findings(code: string): string[] {
  const messages = linter.verify(
    code,
    {
      files: ['**/*.ts'],
      languageOptions: { parser: tsParser as never },
      plugins: { p: { rules: RULES } },
      rules: {
        'p/no-missing-cors-check': 'error',
        'p/no-postmessage-wildcard-origin': 'error',
        'p/require-postmessage-origin-check': 'error',
      },
    },
    'handler.ts',
  );
  const crashes = messages.filter((m) => !m.ruleId);
  if (crashes.length > 0) {
    throw new Error(`rule crashed: ${crashes[0].message}`);
  }
  return messages
    .map((m) => `${m.ruleId as string}:${m.messageId as string}`)
    .sort();
}

describe('partition: no-missing-cors-check vs the postMessage rules (CWE-346)', () => {
  it('a wildcard cors() origin is owned by no-missing-cors-check alone', () => {
    expect(findings("app.use(cors({ origin: '*' }));")).toEqual([
      'p/no-missing-cors-check:missingCorsCheck',
    ]);
  });

  it('cors() with no origin option is owned by no-missing-cors-check alone', () => {
    expect(findings('app.use(cors());')).toEqual([
      'p/no-missing-cors-check:missingCorsCheck',
    ]);
  });

  it('a wildcard Access-Control-Allow-Origin header is owned by no-missing-cors-check alone', () => {
    expect(
      findings("res.setHeader('Access-Control-Allow-Origin', '*');"),
    ).toEqual(['p/no-missing-cors-check:missingCorsCheck']);
  });

  it('an unchecked reflected Origin header is owned by no-missing-cors-check alone', () => {
    const code = `function handler(req, res) {
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
    }`;
    expect(findings(code)).toEqual([
      'p/no-missing-cors-check:missingCorsCheck',
    ]);
  });

  it('a wildcard postMessage target is owned by no-postmessage-wildcard-origin alone', () => {
    expect(findings("window.parent.postMessage(data, '*');")).toEqual([
      'p/no-postmessage-wildcard-origin:wildcardOrigin',
    ]);
  });

  it('a message listener with no origin check is owned by require-postmessage-origin-check alone', () => {
    expect(
      findings("window.addEventListener('message', (e) => render(e.data));"),
    ).toEqual(['p/require-postmessage-origin-check:missingOriginCheck']);
  });

  it('an origin: "*" key inside a postMessage payload is not a CORS finding', () => {
    // The payload object carries a key the CORS rule reads in `cors({...})`.
    // Outside the cors factory it configures nothing, so only the wildcard
    // TARGET of the postMessage is a finding.
    expect(
      findings("window.parent.postMessage({ origin: '*' }, '*');"),
    ).toEqual(['p/no-postmessage-wildcard-origin:wildcardOrigin']);
  });

  it('a safe shape in each channel produces nothing', () => {
    const code = `
      app.use(cors({ origin: ['https://app.example.com'] }));
      window.parent.postMessage(data, 'https://app.example.com');
      window.addEventListener('message', (e) => {
        if (e.origin !== 'https://app.example.com') return;
        render(e.data);
      });`;
    expect(findings(code)).toEqual([]);
  });

  it('two channels on one handler are two defects, one report each', () => {
    // A CORS header and a postMessage listener in the same function. Two
    // reports, but two distinct weaknesses with two distinct fixes — neither
    // rule may defer to the other without dropping a real finding.
    const code = `function handler(req, res) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      window.addEventListener('message', (e) => render(e.data));
    }`;
    expect(findings(code)).toEqual([
      'p/no-missing-cors-check:missingCorsCheck',
      'p/require-postmessage-origin-check:missingOriginCheck',
    ]);
  });
});
