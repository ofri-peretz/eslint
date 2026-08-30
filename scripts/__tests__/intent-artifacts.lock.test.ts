/**
 * Copyright (c) 2026 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Workspace lock — the Stage 1 / Stage 2 artifacts keep their shape.
 *
 * `intent/<slug>/intent.md` and its `spec.md` are the handoff between the stages of
 * AI_NATIVE_SDLC.md. They are only worth anything if they are uniform: a control-band
 * breach writes one automatically, a person writes the next by hand, and both have to
 * be readable by the agent that picks the work up.
 *
 * The load-bearing rule is the last one. An `approved` intent with no `spec.md` beside
 * it means somebody liked an idea and called that a design — which is exactly the
 * handoff this stage exists to prevent, and the failure mode is silent because a
 * missing file looks like nothing at all.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '../..');
const INTENT_DIR = join(REPO_ROOT, 'intent');

const INTENT_SECTIONS = [
  '## Problem',
  '## Proposed outcome',
  '## Affected users and systems',
  '## Constraints',
  '## Open questions',
];
const SPEC_SECTIONS = ['## Requirements', '## Design', '## Verification'];
const STATUSES = ['draft', 'review', 'approved', 'shipped', 'dropped'] as const;
/** Statuses that assert the work has been designed, not merely wanted. */
const NEEDS_SPEC = new Set(['approved', 'shipped']);

function slugs(): string[] {
  if (!existsSync(INTENT_DIR)) return [];
  return readdirSync(INTENT_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== '_template')
    .map((e) => e.name)
    .sort();
}

describe('intent artifacts', () => {
  it('ships the templates the flow and the control-band watcher both write from', () => {
    for (const f of ['README.md', '_template/intent.md', '_template/spec.md']) {
      expect(existsSync(join(INTENT_DIR, f)), `intent/${f} is missing`).toBe(true);
    }
  });

  it('the intent template carries every required section', () => {
    const tpl = readFileSync(join(INTENT_DIR, '_template/intent.md'), 'utf-8');
    for (const s of INTENT_SECTIONS) expect(tpl, `template lacks ${s}`).toContain(s);
  });

  it('the spec template carries every required section', () => {
    const tpl = readFileSync(join(INTENT_DIR, '_template/spec.md'), 'utf-8');
    for (const s of SPEC_SECTIONS) expect(tpl, `template lacks ${s}`).toContain(s);
  });

  const found = slugs();

  it.runIf(found.length > 0).each(found)('intent/%s is well-formed', (slug) => {
    const dir = join(INTENT_DIR, slug);
    const intentPath = join(dir, 'intent.md');
    expect(existsSync(intentPath), `intent/${slug}/intent.md is missing`).toBe(true);

    const intent = readFileSync(intentPath, 'utf-8');
    expect(intent, 'first line must be `# Intent: <title>`').toMatch(/^# Intent: \S/m);

    const status = intent.match(/^Author:.*?Status:\s*([a-z]+)/m)?.[1];
    expect(STATUSES, `unknown status "${status}"`).toContain(status);

    for (const s of INTENT_SECTIONS) {
      expect(intent, `intent/${slug}/intent.md lacks ${s}`).toContain(s);
    }

    if (NEEDS_SPEC.has(status!)) {
      expect(
        existsSync(join(dir, 'spec.md')),
        `intent/${slug} is "${status}" but has no spec.md — approving an intent means ` +
          'it has been designed, not that somebody liked it',
      ).toBe(true);
    }

    if (existsSync(join(dir, 'spec.md'))) {
      const spec = readFileSync(join(dir, 'spec.md'), 'utf-8');
      for (const s of SPEC_SECTIONS) {
        expect(spec, `intent/${slug}/spec.md lacks ${s}`).toContain(s);
      }
    }
  });
});
