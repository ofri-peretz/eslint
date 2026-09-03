/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Metadata beside data must never read as data.
 *
 * Some artefacts here are FLAT: their records sit at the top level rather than
 * nested under a key. `.agent/plugin-rule-manifest.json` keys plugins
 * directly. The artefacts-name-their-method lock then requires every artefact
 * to carry `command` — so a string landed beside those records, and three
 * readers iterating `Object.entries` read it as one of them:
 *
 *     ✗ 48 rule(s) with no case:   command/0   command/1   command/2 …
 *     ✗ 56 debt entries covered:   command → n   command → p   command → x
 *
 * Two CI gates went red on a repository with nothing wrong with it, and the
 * failures named rules and debt entries that have never existed. That is worse
 * than a gate that simply breaks: it produced specific, plausible, actionable
 * findings that were entirely fictional.
 *
 * The fix is `flatEntries` in scripts/lib/read-baseline.ts — a record is an
 * object, metadata is not — and this pins it, because the next reader to open
 * one of these files by hand will make the same assumption.
 */

import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { flatEntries } from '../lib/read-baseline.ts';

const REPO_ROOT = resolve(__dirname, '../..');
const DIRS = ['.agent', 'benchmarks/budgets'];

/** Artefacts whose records sit at the top level, beside their metadata. */
function flatArtefacts(): { rel: string; json: Record<string, unknown> }[] {
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
        continue;
      }
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        Array.isArray(parsed)
      )
        continue;
      const json = parsed as Record<string, unknown>;
      const records = Object.values(json).filter(
        (v) => typeof v === 'object' && v !== null,
      );
      // A handful of records at the top level is the flat shape. Artefacts
      // that nest everything under `rules` have one, and are not at risk.
      if (records.length > 3) out.push({ rel: `${dir}/${file}`, json });
    }
  }
  return out;
}

describe('a flat artefact never reads its metadata as a record', () => {
  const found = flatArtefacts();

  it('finds flat artefacts to check', () => {
    // Without this the suite passes just as happily on an empty list, which is
    // the failure mode this repository has shipped before.
    expect(found.length).toBeGreaterThan(0);
  });

  it.each(found.map((a) => a.rel))('%s', (rel) => {
    const { json } = found.find((a) => a.rel === rel)!;
    const entries = flatEntries(json);

    for (const [key, value] of Object.entries(json)) {
      if (typeof value === 'object' && value !== null) {
        expect(entries, `${rel}: record \`${key}\` was dropped`).toHaveProperty(
          key,
        );
      } else {
        expect(
          Object.keys(entries),
          `${rel}: metadata \`${key}\` (a ${typeof value}) survived into the ` +
            'records. A reader iterating these entries will treat it as one, ' +
            "and — if it is a string — its characters as that record's " +
            'contents.',
        ).not.toContain(key);
      }
    }
  });
});
