/**
 * Copyright (c) 2026 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Workspace lock — the Stage 1 / Stage 2 artifacts keep their shape, in one place.
 *
 * `docs/intents/<slug>/intent.md` and its `design.md` are the handoff between the
 * stages of AI_NATIVE_SDLC.md, under the convention CLAUDE.md documents. They are
 * only worth anything if they are uniform: a control-band breach writes one
 * automatically, a person writes the next by hand, and both have to be readable by
 * the agent that picks the work up.
 *
 * Two rules are load-bearing.
 *
 * An `approved` intent with no `design.md` beside it means somebody liked an idea and
 * called that a design — exactly the handoff this stage exists to prevent, and silent
 * because a missing file looks like nothing at all.
 *
 * And an intent written *somewhere else* is worse than no intent, because the index
 * still looks complete. This repo carried two conventions at once — `intent/` and
 * `docs/intents/` — and every check passed the whole time, because each only ever
 * looked at its own directory. `noStrayArtifacts` is why that cannot recur.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';

const REPO_ROOT = resolve(__dirname, '../..');
const INTENT_DIR = join(REPO_ROOT, 'docs/intents');

/** Headings every intent in the repo already carries. Uniform or worthless. */
const INTENT_SECTIONS = ['## What is wanted', '## Why now', '## Constraints'];

/**
 * The "how the loop closes" section, under either spelling in use. Stage 6 measures
 * against this, so its absence is what makes an intent unfinishable.
 */
const SUCCESS_SECTIONS = ['## Success criteria', '## How we will know it worked'];

/**
 * CLAUDE.md rule 3: record what you rejected. Accepts every form the reference
 * intents use — a rejected option and a declared non-goal are the same artifact,
 * and `ci-speed/design.md` files its under the latter.
 */
const REJECTION_HEADINGS =
  /^## (Rejected\b|Explicit non-goals|Non-goals|Out of scope|Risks and rejected)/m;

const STATUSES = ['draft', 'review', 'approved', 'shipped', 'dropped'] as const;
/** Statuses that assert the work has been designed, not merely wanted. */
const NEEDS_DESIGN = new Set(['approved', 'shipped']);

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.turbo',
  '.vercel', '.output', '.cache', 'fixtures', '__fixtures__',
]);

function slugs(): string[] {
  if (!existsSync(INTENT_DIR)) return [];
  return readdirSync(INTENT_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== '_template')
    .map((e) => e.name)
    .sort();
}

/** Every `intent.md` in the repo that is not under `docs/intents/`. */
function strayIntents(dir: string, found: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      const abs = join(dir, e.name);
      if (abs === INTENT_DIR) continue;
      strayIntents(abs, found);
    } else if (e.name === 'intent.md') {
      found.push(relative(REPO_ROOT, join(dir, e.name)));
    }
  }
  return found;
}

describe('intent artifacts', () => {
  it('ships the templates the flow and the control-band watcher both write from', () => {
    for (const f of ['README.md', '_template/intent.md', '_template/design.md']) {
      expect(existsSync(join(INTENT_DIR, f)), `docs/intents/${f} is missing`).toBe(true);
    }
  });

  it('the intent template carries every required section', () => {
    const tpl = readFileSync(join(INTENT_DIR, '_template/intent.md'), 'utf-8');
    for (const s of [...INTENT_SECTIONS, SUCCESS_SECTIONS[0]]) {
      expect(tpl, `template lacks ${s}`).toContain(s);
    }
  });

  it('the design template carries requirements, verification and a rejection record', () => {
    const tpl = readFileSync(join(INTENT_DIR, '_template/design.md'), 'utf-8');
    for (const s of ['## Requirements', '## Design', '## Verification']) {
      expect(tpl, `template lacks ${s}`).toContain(s);
    }
    expect(REJECTION_HEADINGS.test(tpl), 'template records nothing rejected').toBe(true);
  });

  it('every intent lives under docs/intents — one convention, not two', () => {
    expect(
      strayIntents(REPO_ROOT),
      'intent artifacts outside docs/intents/ are invisible to this lock and to ' +
        'CLAUDE.md — move them, do not start a second convention',
    ).toEqual([]);
  });

  const found = slugs();

  it('the repo has at least one intent to check', () => {
    expect(found.length).toBeGreaterThan(0);
  });

  it.each(found)('docs/intents/%s is well-formed', (slug) => {
    const dir = join(INTENT_DIR, slug);
    const intentPath = join(dir, 'intent.md');
    expect(existsSync(intentPath), `docs/intents/${slug}/intent.md is missing`).toBe(true);

    const intent = readFileSync(intentPath, 'utf-8');
    expect(intent, 'first line must be `# Intent — <title>`').toMatch(/^# Intent — \S/m);

    const status = intent.match(/^\*\*Status:\*\*\s*([a-z]+)/m)?.[1];
    expect(STATUSES, `unknown or missing status "${status}"`).toContain(status);

    for (const s of INTENT_SECTIONS) {
      expect(intent, `docs/intents/${slug}/intent.md lacks ${s}`).toContain(s);
    }
    expect(
      SUCCESS_SECTIONS.some((s) => intent.includes(s)),
      `docs/intents/${slug}/intent.md has no "${SUCCESS_SECTIONS[0]}" — Stage 6 has ` +
        'nothing to measure the loop closing against',
    ).toBe(true);

    const designPath = join(dir, 'design.md');
    if (NEEDS_DESIGN.has(status!)) {
      expect(
        existsSync(designPath),
        `docs/intents/${slug} is "${status}" but has no design.md — approving an ` +
          'intent means it has been designed, not that somebody liked it',
      ).toBe(true);
    }

    if (existsSync(designPath)) {
      const design = readFileSync(designPath, 'utf-8');
      expect(
        REJECTION_HEADINGS.test(design),
        `docs/intents/${slug}/design.md records nothing rejected — CLAUDE.md rule 3`,
      ).toBe(true);
    }
  });
});
