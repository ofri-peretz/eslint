/**
 * Engine-portability messaging lock — enforces that the user-facing docs
 * pages introduce Oxlint + Biome + TSC native (Go) alongside ESLint, with
 * the status labels declared in INTEROP_PHILOSOPHY.md §"Runtime support
 * matrix" (floor / automated peer / reserved peer / watching).
 *
 * Why this lock exists:
 *
 *   - "Rules portable, runtimes commodity" is the strategic position
 *     declared in INTEROP_PHILOSOPHY.md. The homepage's runtime strip and
 *     "Runtime Portability" card are already locked by homepage-lock.test.tsx.
 *     This file extends the same contract to the two docs pages that a
 *     buyer is most likely to hit when evaluating compatibility:
 *
 *       /docs/getting-started/concepts/compatibility  — the "will this work
 *                                                       in my repo?" page
 *       /docs/getting-started/concepts/compare        — the vs-CodeQL /
 *                                                       Semgrep / Snyk matrix
 *
 *   - The homepage hero-adjacency message dies if these pages don't carry
 *     it through. A reader clicking "Compatibility" and finding only ESLint
 *     majors would reasonably conclude the portability claim is hand-wavy.
 *
 * What this lock enforces:
 *
 *   - compatibility.mdx introduces an engine axis (not just ESLint majors)
 *     and names ESLint, Oxlint, Biome, and TSC native with their canonical
 *     status labels.
 *   - compare.mdx includes engine portability as a comparison dimension —
 *     the row where every competitor scores ❌ and we score ✅ is the
 *     entire reason to surface this differentiator on the compare page.
 *   - Neither page promises "TSC 7 compatible" — the canonical status is
 *     "watching", not "compatible." Wording drift here is a credibility
 *     bug, not a UX nit.
 *   - The TSC native host is named as Go-based (the engine layer most
 *     readers conflate with the Rust-based linters — Oxlint, Biome, swc).
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

// Use __dirname so this works regardless of whether vitest is invoked from the
// repo root (npx vitest run apps/docs/…) or from apps/docs (turbo run test).
const APP_ROOT = resolve(__dirname, '../..');

const CONCEPTS_ROOT = join(
  APP_ROOT,
  'content/docs/getting-started/concepts',
);

const COMPATIBILITY_PATH = join(CONCEPTS_ROOT, 'compatibility.mdx');
const COMPARE_PATH = join(CONCEPTS_ROOT, 'compare.mdx');

describe('compatibility.mdx: engine-portability messaging lock', () => {
  let src: string;

  beforeAll(() => {
    expect(existsSync(COMPATIBILITY_PATH)).toBe(true);
    src = readFileSync(COMPATIBILITY_PATH, 'utf-8');
  });

  it('introduces the engine axis (not just ESLint majors)', () => {
    // The intro must signal that compatibility spans engines, not just
    // ESLint majors. A reader landing on this page from the homepage
    // strip should immediately recognize the same vocabulary.
    expect(src).toMatch(/which lint engine|engine compatibility|engine axis/i);
  });

  it('names ESLint as the floor engine', () => {
    expect(src).toMatch(/ESLint[\s\S]{0,80}floor/i);
  });

  it('names Oxlint as an automated peer (canonical status from INTEROP_PHILOSOPHY.md)', () => {
    expect(src).toMatch(/Oxlint[\s\S]{0,160}automated peer/i);
  });

  it('names Biome as a reserved peer (canonical status from INTEROP_PHILOSOPHY.md)', () => {
    // Looser distance because the engine matrix table sits in between
    // status labels — Biome's row may carry an extra cell or two before
    // the label lands.
    expect(src).toMatch(/Biome[\s\S]{0,200}reserved peer/i);
  });

  it('names TSC native plugin host as Go-based (NOT Rust — Oxlint/Biome are the Rust engines)', () => {
    expect(src).toContain('TSC native');
    // The host language must be named explicitly somewhere on the page.
    // "Go" inside parentheses next to "TSC native" is the canonical form
    // used by the homepage strip.
    expect(src).toMatch(/TSC native[\s\S]{0,80}Go/);
  });

  it('TSC native carries the "watching" status, not "compatible"', () => {
    expect(src).toMatch(/watching/i);
    // Negative lock — must NOT promise TSC 7 compatibility. The status is
    // "watching" per INTEROP_PHILOSOPHY.md until the native host ships
    // stable. Over-claiming here is a credibility bug.
    expect(src).not.toMatch(/compatible[\s\S]{0,40}TSC\s*7/i);
    expect(src).not.toMatch(/TSC\s*7[\s\S]{0,40}compatible/i);
  });

  it('cross-links to the runtime-portability concept page (the parity-contract deep dive)', () => {
    expect(src).toContain('/docs/getting-started/concepts/runtime-portability');
  });
});

describe('compare.mdx: engine-portability row lock', () => {
  let src: string;

  beforeAll(() => {
    expect(existsSync(COMPARE_PATH)).toBe(true);
    src = readFileSync(COMPARE_PATH, 'utf-8');
  });

  it('contains an "Engine portability" row in the comparison matrix', () => {
    // The row's label is the contract; the wording around it can drift.
    // Pinning the label keeps the dimension present even after editorial
    // passes on neighbouring rows.
    expect(src).toMatch(/\|\s*\*\*Engine portability\*\*/);
  });

  it('engine-portability row names Oxlint as a CI-gated peer (the verifiable part of the claim)', () => {
    const matrixSection = src.slice(
      src.indexOf('detailed comparison matrix'),
    );
    expect(matrixSection).toMatch(/Engine portability[\s\S]{0,400}Oxlint/i);
    expect(matrixSection).toMatch(/Engine portability[\s\S]{0,400}CI-gated|CI-enforced/i);
  });

  it('engine-portability row marks every competitor as engine-locked (❌)', () => {
    // The dimension is the one place where the answer is uniformly
    // "Interlace yes, every competitor no." If a future editor softens
    // these cells (e.g. to "limited" or "partial"), the row stops being
    // the binary differentiator it's meant to be — and the lock catches it.
    const matrixSection = src.slice(
      src.indexOf('detailed comparison matrix'),
    );
    const row = matrixSection.match(/\|\s*\*\*Engine portability\*\*[^\n]+/);
    expect(row, 'engine-portability row not found in matrix').toBeTruthy();
    const cells = row![0].split('|').map((s) => s.trim());
    // Skip the leading empty cell and the row label; the remaining three
    // cells are the competitor scores. They must all be ❌.
    const competitorCells = cells.slice(3, 6);
    expect(competitorCells).toHaveLength(3);
    for (const cell of competitorCells) {
      expect(cell, `competitor cell should be ❌, got "${cell}"`).toMatch(/❌/);
    }
  });

  it('compare page does NOT claim TSC 7 compatibility (status is "watching", not "compatible")', () => {
    // Same negative-lock as compatibility.mdx — wording must stay
    // honest about the canonical INTEROP_PHILOSOPHY.md status.
    expect(src).not.toMatch(/compatible[\s\S]{0,40}TSC\s*7/i);
    expect(src).not.toMatch(/TSC\s*7[\s\S]{0,40}compatible/i);
  });
});
