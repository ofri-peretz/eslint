/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The ReDoS detector must not itself be a ReDoS.
 *
 * `looksCatastrophic` decides whether a user-supplied rule option is safe to
 * compile. Its own three probes ran against that same untrusted string — and on
 * 2026-08-20 CodeQL flagged two of them, which `recheck` confirmed as 2nd-degree
 * polynomial. Our own `no-redos-vulnerable-regex` reported them too. A detector
 * carrying the defect it detects is the fault this file exists to police, so the
 * check is pinned rather than left to the next reviewer to notice.
 *
 * This reads the SOURCE rather than a copied list, so a probe added later is
 * gated automatically instead of silently escaping the guarantee.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { checkSync } from 'recheck';
import { describe, expect, it } from 'vitest';

const source = readFileSync(fileURLToPath(new URL('./user-regex.ts', import.meta.url)), 'utf8');

/**
 * A regex literal: `/body/flags`. Each alternative owns its first character
 * (`\`, `[`, anything else), so the extractor cannot itself backtrack
 * exponentially on a `[]`- or `\`-heavy line — the first version could, and
 * CodeQL `js/redos` flagged it.
 */
const REGEX_LITERAL = /\/((?:\\.|\[(?:\\.|[^\]\\])*\]|[^/\\[])+)\/([gimsuy]*)/;

/** Every regex literal that is run against a user-supplied pattern string. */
const probes = source
  .split('\n')
  .filter((line) => line.includes('.test(pattern)'))
  .map((line) => REGEX_LITERAL.exec(line))
  .filter((match): match is RegExpExecArray => match !== null)
  .map((match) => ({ source: match[1], flags: match[2] }));

describe('user-regex probes', () => {
  it('finds the probes it means to check', () => {
    // Without this the suite passes vacuously if the extraction ever breaks.
    expect(probes.length).toBe(3);
  });

  it('the probe extractor is not itself an exponential ReDoS', () => {
    const verdict = checkSync(REGEX_LITERAL.source, REGEX_LITERAL.flags);
    expect(verdict.status).not.toBe('unknown');
    expect(verdict.complexity?.type).not.toBe('exponential');
  });

  it.each(probes)('/$source/ is not vulnerable to backtracking', ({ source: pattern, flags }) => {
    const verdict = checkSync(pattern, flags);
    expect(verdict.status).toBe('safe');
  });
});
