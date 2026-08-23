/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import type { TSESLint } from '@typescript-eslint/utils';

/**
 * The average line length above which a file is machine-packed rather than
 * written.
 *
 * AVERAGE, deliberately, and the first attempt at this used the MAXIMUM and was
 * wrong. Measured on the pinned corpus, 13 files had a line over 1,000
 * characters and only 8 of them were minified. The other five were ordinary
 * source with one long line — SVG icon components whose `d` attribute is a
 * single 1,600-character path, and a hand-written vendor recorder. Skipping
 * those would have been a silent recall loss in real application code.
 *
 * The average separates them with room to spare:
 *
 *   minified bundles       712 – 203,807 characters per line
 *   hand-written source     32 – 58
 *
 * There is no threshold to tune between those. 200 sits in the empty middle.
 */
const MINIFIED_AVERAGE_LINE_LENGTH = 200;

/**
 * The size below which the average says nothing.
 *
 * A short file can exceed the average without being packed — a single-line
 * barrel re-export, a one-line config, a test fixture. Those are not bundles,
 * and skipping them would be recall loss in the smallest files rather than the
 * largest. Caught by the conventions suite: six existing fixtures were one long
 * line each and went silent the moment the average alone decided.
 *
 * Every minified file on the pinned corpus is tens of kilobytes; the largest is
 * 407 KB on two lines. 2 KB is far below all of them and far above a one-liner.
 */
const MINIFIED_MINIMUM_BYTES = 2000;

/**
 * Is this file machine-packed output rather than something a person edits?
 *
 * Decided from the file's own shape — no path matching. `dist/`, `.min.js` and
 * `vendor/` are conventions a stranger's repository is free to ignore, and
 * `assets/speedscope/import.bcbb2033.js` announces nothing in its name; it was
 * still 1,973 of the corpus's `no-magic-numbers` findings on its own.
 *
 * Only for rules that give MAINTAINABILITY advice. A security rule must not use
 * this: a bundle ships and runs, so an injection inside one is a live
 * vulnerability no matter how the bytes got there — and a minified bundle is
 * exactly where a supply-chain problem would hide.
 */
export function isMinifiedFile(sourceCode: Readonly<TSESLint.SourceCode>): boolean {
  const lines = sourceCode.lines;
  // `lines` is never empty for a parsed file — ESLint yields [''] for an empty
  // one — so there is no zero-division branch to guard, and adding one would be
  // a branch no input can reach.
  let total = 0;
  for (const line of lines) total += line.length;
  if (total < MINIFIED_MINIMUM_BYTES) return false;
  return total / lines.length > MINIFIED_AVERAGE_LINE_LENGTH;
}
