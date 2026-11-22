/**
 * Growth conversion lock — CI guardrail for the npm→GitHub conversion funnel.
 *
 * The ecosystem runs at ~29K downloads/month against a handful of GitHub stars
 * (see agents-repo metrics/surge-analysis-2026-05.md). The conversion funnel —
 * npm README → GitHub star → Dev.to follow — is the highest-leverage growth
 * surface, and per CLAUDE.md a CTA that isn't asserted by a test silently
 * regresses the next time a baseline sync or refactor runs.
 *
 * This lock pins the funnel's load-bearing markers on the surfaces THIS repo owns:
 *   - the root README carries the star/follow CTA + a live GitHub-stars badge,
 *   - every published eslint-plugin-* README carries the INTERLACE:STAR_CTA block,
 *     which is ONE short `## Support` paragraph at the end, and no star banner
 *     above the first heading (README audit 2026-11-20: an ask made before the
 *     reader had installed anything, beside a counter reading 20).
 *
 * The growth strategy itself (the "why") lives in the agents repo at
 * footprint/strategy/growth-philosophy.md — not here.
 */

import { describe, it, expect } from 'vitest';
import { resolve, join } from 'node:path';
import { readFileSync, existsSync, readdirSync } from 'node:fs';

const MONOREPO_ROOT = resolve(__dirname, '..', '..', '..', '..');
const STAR_CTA_MARKER = '<!-- INTERLACE:STAR_CTA:START -->';

function pluginReadmes(): string[] {
  const packagesDir = join(MONOREPO_ROOT, 'packages');
  return readdirSync(packagesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith('eslint-plugin-'))
    .map((d) => join(packagesDir, d.name, 'README.md'))
    .filter((p) => existsSync(p));
}

describe('growth conversion lock', () => {
  describe('root README conversion surface', () => {
    let readme: string;
    it('root README exists', () => {
      const p = join(MONOREPO_ROOT, 'README.md');
      expect(existsSync(p)).toBe(true);
      readme = readFileSync(p, 'utf-8');
    });

    it('carries the growth CTA block', () => {
      expect(readme).toContain('<!-- INTERLACE:GROWTH_CTA -->');
      expect(readme).toContain('Star the repo');
      expect(readme).toContain('Follow the writeups');
    });

    it('shows a live GitHub-stars badge (social proof)', () => {
      expect(readme).toContain(
        'img.shields.io/github/stars/ofri-peretz/eslint',
      );
    });

    // The CTA's owned-property links point at the ecosystem site, not the
    // personal-brand domain. ofriperetz.dev has no /articles route at all and
    // its /stats is a different (personal) surface — a reader clicking
    // "Live metrics" from an ESLint README expects THIS ecosystem's numbers.
    it('routes the growth CTA to eslint.interlace.tools, not ofriperetz.dev', () => {
      const cta =
        readme.split('<!-- INTERLACE:GROWTH_CTA -->')[1]?.split('---')[0] ?? '';
      expect(cta).toContain('https://eslint.interlace.tools/articles');
      expect(cta).toContain('https://eslint.interlace.tools/stats');
      expect(cta).not.toContain('ofriperetz.dev');
    });
  });

  describe('every eslint-plugin-* README carries one star line, at the end', () => {
    const readmes = pluginReadmes();

    it('discovers the plugin READMEs', () => {
      expect(readmes.length).toBeGreaterThan(15);
    });

    it.each(readmes.map((p) => [p.split('/packages/')[1], p] as const))(
      '%s has the INTERLACE:STAR_CTA block, as a short Support paragraph',
      (_label, path) => {
        const text = readFileSync(path, 'utf-8');
        expect(text).toContain(STAR_CTA_MARKER);
        const block =
          text
            .split(STAR_CTA_MARKER)[1]
            ?.split('<!-- INTERLACE:STAR_CTA:END -->')[0] ?? '';
        expect(block).toContain('## Support');
        expect(block).toContain('/issues');
        expect(block).toMatch(/star/i);
        // One ask: no counter badge, no second call to action.
        expect(block).not.toContain('img.shields.io/github/stars');
        expect(block).not.toContain('dev.to');
      },
    );

    it.each(readmes.map((p) => [p.split('/packages/')[1], p] as const))(
      '%s has no star banner above its first heading',
      (_label, path) => {
        const text = readFileSync(path, 'utf-8');
        const firstHeading = text.search(/^## /m);
        expect(text.slice(0, firstHeading)).not.toMatch(/star the repo/i);
        expect(text).not.toMatch(/^> ⭐/m);
      },
    );
  });
});
