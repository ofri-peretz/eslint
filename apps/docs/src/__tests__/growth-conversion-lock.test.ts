/**
 * Growth conversion lock — CI guardrail for GROWTH_PHILOSOPHY.md.
 *
 * The ecosystem runs at ~29K downloads/month against a handful of GitHub stars
 * (see agents-repo metrics/surge-analysis-2026-05.md). The conversion funnel —
 * npm README → GitHub star → Dev.to follow — is the highest-leverage growth
 * surface, and per CLAUDE.md a CTA that isn't asserted by a test silently
 * regresses the next time a baseline sync or refactor runs.
 *
 * This lock pins the funnel's load-bearing markers:
 *   - the root README carries the star/follow CTA + a live GitHub-stars badge,
 *   - every published eslint-plugin-* README carries the INTERLACE:STAR_CTA block,
 *   - GROWTH_PHILOSOPHY.md exists and states the North Star + the landscape-framing rule.
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
      expect(readme).toContain('img.shields.io/github/stars/ofri-peretz/eslint');
    });
  });

  describe('every eslint-plugin-* README carries the star/follow CTA', () => {
    const readmes = pluginReadmes();

    it('discovers the plugin READMEs', () => {
      expect(readmes.length).toBeGreaterThan(15);
    });

    it.each(readmes.map((p) => [p.split('/packages/')[1], p] as const))(
      '%s has the INTERLACE:STAR_CTA block',
      (_label, path) => {
        expect(readFileSync(path, 'utf-8')).toContain(STAR_CTA_MARKER);
      },
    );
  });

  describe('GROWTH_PHILOSOPHY.md is codified', () => {
    const p = join(MONOREPO_ROOT, 'distribution', 'GROWTH_PHILOSOPHY.md');

    it('exists', () => {
      expect(existsSync(p)).toBe(true);
    });

    it('states the North Star and the landscape-framing rule', () => {
      const src = readFileSync(p, 'utf-8');
      expect(src).toContain('Convert silent adoption into visible community leadership');
      expect(src).toContain('Landscape framing, never threat framing');
      expect(src).toContain('download-to-star ratio');
    });
  });
});
