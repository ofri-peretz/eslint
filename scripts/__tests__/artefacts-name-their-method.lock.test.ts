/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Every machine artefact says how it was made.
 *
 * Five numbers published by this repository turned out to be wrong or
 * unreproducible in a single quarter:
 *
 *   real-source inventory   "270 rules catch nothing"   -> 84, no configHash
 *   API-surface manifest    "node-security 70% of 47"   -> ≤55% of 199, typed
 *   default-on-rules-fire   "327 rules enabled"         -> 287, no method
 *   codecov-components      "eleven uncovered"          -> re-checked as eight
 *                                                          by subtracting
 *                                                          totals, still eleven
 *   corpus scan             "every target failed"       -> 6,200 findings
 *
 * The common property is not that they were wrong. It is that none of them
 * said how it was obtained, so nobody could tell. The corpus figure was wrong
 * for weeks; the inventory figure was wrong by a factor of three and was
 * quoted as a product fact.
 *
 * So: an artefact under `.agent/` or `benchmarks/budgets/` carries `command` —
 * the thing a reader runs to get the same number.
 *
 * `command: null` is NOT the same as absent, and the difference is the whole
 * point. Absent means nobody considered it, which is how the API-surface
 * manifest came to hold ten typed percentages that read as measurements for
 * months. `null` plus `maintainedBy` is an explicit claim that a human decides
 * this file — something a reviewer can disagree with.
 *
 * See docs/intents/a-surface-figure-must-name-its-method/.
 */

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '../..');
const DIRS = ['.agent', 'benchmarks/budgets'];

/** Object-shaped JSON artefacts. A top-level array carries no room to say. */
function artefacts(): { rel: string; json: Record<string, unknown> }[] {
  const out: { rel: string; json: Record<string, unknown> }[] = [];
  for (const dir of DIRS) {
    const abs = join(REPO_ROOT, dir);
    if (!existsSync(abs)) continue;
    for (const file of readdirSync(abs)) {
      if (!file.endsWith('.json')) continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(readFileSync(join(abs, file), 'utf-8'));
      } catch {
        continue; // not our concern; other gates check JSON validity
      }
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        Array.isArray(parsed)
      )
        continue;
      out.push({
        rel: `${dir}/${file}`,
        json: parsed as Record<string, unknown>,
      });
    }
  }
  return out;
}

describe('machine artefacts name their method', () => {
  const found = artefacts();

  it('finds artefacts to check', () => {
    // A lock that silently matches nothing passes forever. This repository has
    // shipped that mistake before — a scan-and-assert-empty check pointed at
    // the wrong directory reads exactly like a clean bill.
    expect(found.length).toBeGreaterThan(20);
  });

  it.each(found.map((a) => a.rel))('%s says how it was made', (rel) => {
    const { json } = found.find((a) => a.rel === rel)!;

    expect(
      'command' in json,
      `${rel} has no \`command\`. Add the command that regenerates it, or ` +
        '`"command": null` with `"maintainedBy"` saying who decides it and on ' +
        'what evidence. Absent is how a typed number comes to read as a ' +
        'measurement.',
    ).toBe(true);

    const command = json['command'];
    expect(
      command === null ||
        (typeof command === 'string' && command.trim() !== ''),
      `${rel} has a \`command\` that is neither a non-empty string nor null.`,
    ).toBe(true);

    if (command === null) {
      const by = json['maintainedBy'];
      expect(
        typeof by === 'string' && by.trim() !== '',
        `${rel} declares \`command: null\` without \`maintainedBy\`. A file no ` +
          'command produces needs a named owner and the evidence they use, or ' +
          'it is indistinguishable from one nobody thought about.',
      ).toBe(true);
    }
  });
});
