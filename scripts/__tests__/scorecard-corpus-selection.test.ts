/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Lock: the scorecard reads each bench from the corpus its SLO was set against.
 *
 * `ilb-wild.ts` writes both corpora into `benchmark-results/<date>/`, tagged by
 * `fpCorpusMode`. The Wild corpus is broad popular OSS; the Edge corpus is five
 * adversarial-real repos chosen to provoke false positives. They answer
 * different questions.
 *
 * The scorecard used to take the newest dated directory whatever it contained.
 * When the 2026-08-03 Edge run landed, ILB-Wild, ILB-Perf and ILB-Cov silently
 * started reporting from it:
 *
 *   Perf  5.4 → 35.2 ms/file  against a ≤15 SLO set on Wild
 *   Cov   39/208 rules over 11 plugins → 25/111 over 3
 *   Wild  3.48 → 7.37 findings/kLoC from code selected to produce findings
 *
 * Nothing failed. The table looked authoritative and the trend sparkline drew
 * the two corpora as one series, so a corpus swap read as a performance
 * regression — a number that is worse than no number, because it invites a fix
 * for a problem that does not exist.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SOURCE = readFileSync(
  resolve(__dirname, '..', 'ilb-scorecard.ts'),
  'utf-8',
);

describe('scorecard corpus selection', () => {
  it('selects runs by corpus, not only by date', () => {
    expect(SOURCE).toContain('function latestSummaryOfCorpus(');
    // `data?.` or `data.` — the optional chain stopped being needed once an
    // unreadable summary was skipped outright (below). Pinning the punctuation
    // rather than the comparison made this lock fail on a strictly better
    // implementation, which is the wrong thing for a lock to do.
    expect(SOURCE).toMatch(/Boolean\(data\??\.fpCorpusMode\) !== fpCorpus/);
  });

  it('an unreadable summary matches no corpus', () => {
    /*
     * `readJson` returns null on invalid JSON, and `Boolean(null?.fpCorpusMode)`
     * is `false` — which is exactly the WILD predicate. So a corrupt
     * `summary.json` was returned as the latest Wild run, and ILB-Wild,
     * ILB-Perf and ILB-Cov all reported missing data instead of falling
     * through to the newest run that actually parses.
     *
     * The guard has to come BEFORE the corpus comparison, or null takes the
     * Wild branch again.
     */
    const guardThenCompare =
      /if \(data === null\) continue;[\s\S]{0,200}?Boolean\(data\??\.fpCorpusMode\) !== fpCorpus/;
    expect(guardThenCompare.test(SOURCE)).toBe(true);
  });

  it('Wild, Perf and Cov read the Wild corpus', () => {
    expect(SOURCE).toMatch(
      /function latestWildSummary\(\)[^{]*\{\s*return latestSummaryOfCorpus\(false\);/,
    );
  });

  it('Edge reads the Edge corpus', () => {
    expect(SOURCE).toMatch(
      /function latestEdgeSummary\(\)[^{]*\{\s*return latestSummaryOfCorpus\(true\);/,
    );
    // readEdge must not be fed whatever ILB-Wild loaded — that coupling is the
    // bug. It resolves its own corpus.
    expect(SOURCE).toMatch(
      /function readEdge\([^)]*\)[^{]*\{[\s\S]{0,400}latestEdgeSummary\(\)/,
    );
  });

  it('no bench reads a bare newest-directory summary any more', () => {
    // The original shape: walk dated dirs, return the first summary.json found,
    // with no corpus check. Its absence is the fix.
    const bareWalk =
      /readdirSync\(WILD_RESULTS\)[\s\S]{0,400}?summary\.json[\s\S]{0,200}?return \{ path: p, date: d, data: readJson/;
    expect(bareWalk.test(SOURCE)).toBe(false);
  });
});
