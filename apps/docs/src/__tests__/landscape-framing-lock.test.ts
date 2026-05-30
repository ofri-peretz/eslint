/**
 * Landscape framing lock — enforces ecosystem / specialization vocabulary
 * on the public-facing landscape and compare docs.
 *
 * Rule (per `memory/feedback_landscape_not_threats.md` and
 * `distribution/COMPETITOR_LANDSCAPE.md` retirement note):
 *
 *   - Interlace describes the JS / TS lint ecosystem as a LANDSCAPE
 *     we find our path through, NOT a battle board with threats.
 *   - Engines (Oxlint, Biome, TSC native) are runtimes we ship to,
 *     not adversaries.
 *   - Forbidden vocabulary in landscape / compare docs:
 *     "threat level", "biggest competitive advantage", "most beatable",
 *     "moat", "beat them all", "coexistence strategy", "speed demon".
 *
 * This lock catches the obvious regressions on the docs under
 * `apps/docs/content/`. The repo-root `distribution/*.md` files
 * (which carry the long-form landscape content) rely on review,
 * because they're contributor-facing and may contain measured
 * historical-quotation context.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

// Use __dirname so this works regardless of whether vitest is invoked from the
// repo root (npx vitest run apps/docs/…) or from apps/docs (turbo run test).
const APP_ROOT = resolve(__dirname, '../..');
const CONTENT_ROOT = join(APP_ROOT, 'content/docs/getting-started/concepts');

const LANDSCAPE_DOCS = [
  'ecosystem.mdx',
  'compare.mdx',
  'compatibility.mdx',
  'runtime-portability.mdx',
] as const;

// Phrases that signal the OLD adversarial framing. If any of these appears
// in a landscape doc the writer has reverted to the pre-2026-05 framing
// and needs to re-read `feedback_landscape_not_threats.md`.
//
// Each entry pairs the forbidden phrase (case-insensitive) with the
// recommended replacement so a failing test message tells the next
// reader what to do, not just what was wrong.
const FORBIDDEN_PHRASES: Array<{
  phrase: RegExp;
  recommendation: string;
}> = [
  {
    phrase: /\bthreat level\b/i,
    recommendation: 'Describe the neighborhood (open / sparse / crowded / dominant peer) instead.',
  },
  {
    phrase: /\bbiggest competitive advantage\b/i,
    recommendation: 'Reframe as "where we specialize" or "the path where we lead the community".',
  },
  {
    phrase: /\bmost beatable\b/i,
    recommendation: 'Reframe as "an open neighborhood" or "where we add depth on top of generic peers".',
  },
  {
    phrase: /\bbeat them all\b/i,
    recommendation: 'Reframe as "be the trusted specialist" or "lead the community on these axes".',
  },
  {
    phrase: /\bcoexistence strategy\b/i,
    recommendation: 'Engines are runtimes we ship to. Describe what runs under what; do not pose us against an engine.',
  },
  {
    phrase: /\bspeed demon\b/i,
    recommendation: 'Describe Oxlint as a Rust-based engine and a target runtime, not a "speed demon" rival.',
  },
];

describe('Landscape framing lock — docs must use ecosystem vocabulary', () => {
  // Sanity: every doc this lock claims to guard must exist. A missing
  // file is also a regression — silent landscape removal would erase
  // the very content the framing rules apply to.
  describe.each(LANDSCAPE_DOCS)('%s exists and is non-empty', (filename) => {
    const path = join(CONTENT_ROOT, filename);

    it('file exists', () => {
      expect(existsSync(path)).toBe(true);
    });

    let source: string;
    beforeAll(() => {
      source = readFileSync(path, 'utf-8');
    });

    it('is non-empty', () => {
      expect(source.length).toBeGreaterThan(100);
    });

    it.each(FORBIDDEN_PHRASES)(
      'does not contain forbidden phrase: $phrase',
      ({ phrase, recommendation }) => {
        const matches = source.match(phrase);
        if (matches) {
          throw new Error(
            `${filename} contains "${matches[0]}" — landscape-framing violation. ${recommendation} ` +
              `See memory/feedback_landscape_not_threats.md for the full framing rules.`,
          );
        }
      },
    );
  });

  // Required cross-links — the three concept pages that span the
  // landscape story should reference each other so a reader can
  // navigate the trinity in one click. Drift here means a docs
  // refactor broke the navigation graph.
  describe('Cross-link trinity (compare ↔ ecosystem ↔ runtime-portability)', () => {
    it('ecosystem.mdx links to compare', () => {
      const src = readFileSync(join(CONTENT_ROOT, 'ecosystem.mdx'), 'utf-8');
      expect(src).toContain('/docs/getting-started/concepts/compare');
    });

    it('ecosystem.mdx links to runtime-portability', () => {
      const src = readFileSync(join(CONTENT_ROOT, 'ecosystem.mdx'), 'utf-8');
      expect(src).toContain('/docs/getting-started/concepts/runtime-portability');
    });

    it('compare.mdx links to ecosystem', () => {
      const src = readFileSync(join(CONTENT_ROOT, 'compare.mdx'), 'utf-8');
      expect(src).toContain('/docs/getting-started/concepts/ecosystem');
    });

    it('runtime-portability.mdx links to ecosystem', () => {
      const src = readFileSync(join(CONTENT_ROOT, 'runtime-portability.mdx'), 'utf-8');
      expect(src).toContain('/docs/getting-started/concepts/ecosystem');
    });
  });

  // Required vocabulary positively — the ecosystem page should
  // actually USE the landscape vocabulary so the framing rule isn't
  // just enforced by absence.
  describe('Positive framing — ecosystem.mdx uses landscape vocabulary', () => {
    let src: string;
    beforeAll(() => {
      src = readFileSync(join(CONTENT_ROOT, 'ecosystem.mdx'), 'utf-8').toLowerCase();
    });

    it('uses "landscape"', () => {
      expect(src).toContain('landscape');
    });

    it('uses "specialize" or "specialization"', () => {
      expect(src).toMatch(/specializ/);
    });

    it('uses "community" (we are aiming for community leadership)', () => {
      expect(src).toContain('community');
    });

    it('uses "neighbor" (we describe peers as neighbors in the landscape)', () => {
      expect(src).toContain('neighbor');
    });
  });
});
