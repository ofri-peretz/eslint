/**
 * Homepage plain-language lock.
 *
 * The owner's rule for the top of eslint.interlace.tools (2026-10-11): say what
 * it is in one plain sentence, show one measured number, one install command,
 * one button. No LinkedIn/startup slogans.
 *
 * The live page had drifted to "Enterprise-Grade Security for JavaScript",
 * "Secure your code, your style.", "Two Pillars of Excellence" and "Ready to
 * Level Up?", and headed a DEV Community post "Trusted by developers" — a
 * heading that implied a user base the section never showed.
 *
 * This lock fails if any of those phrases come back on the home page. It reads
 * the RAW source, comments included, on purpose: a slogan parked in a comment
 * is one uncomment away from shipping, and the phrases have no legitimate use
 * in these files.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const APP_ROOT = resolve(__dirname, '../..');

/** Every file whose text renders on `/` or in its <head>. */
const HOME_SURFACES = [
  'src/app/(home)/page.tsx',
  'src/components/home/hero-section.tsx',
  'src/app/layout.tsx',
] as const;

const BANNED_PHRASES = [
  'Enterprise-Grade',
  'Level Up',
  'Pillars of Excellence',
  'your style',
  'Trusted by developers',
] as const;

const read = (rel: string) => readFileSync(join(APP_ROOT, rel), 'utf-8');

describe('Homepage: plain language, no slogans', () => {
  for (const surface of HOME_SURFACES) {
    for (const phrase of BANNED_PHRASES) {
      it(`${surface} does not contain "${phrase}"`, () => {
        const source = read(surface).toLowerCase();
        expect(
          source.includes(phrase.toLowerCase()),
          `"${phrase}" is back in ${surface}. The home page uses plain language — say what the plugins do instead.`,
        ).toBe(false);
      });
    }
  }

  it('hero says what it is in one plain sentence', () => {
    const hero = read('src/components/home/hero-section.tsx');
    expect(hero).toContain(
      'ESLint plugins that find security bugs in JavaScript and TypeScript',
    );
    expect(hero).toContain('Including the bugs AI coding tools write.');
    expect(hero).toContain('Free and open source.');
  });

  it('hero carries no eyebrow badge', () => {
    const hero = read('src/components/home/hero-section.tsx');
    expect(hero).not.toMatch(/\beyebrow=\{/);
  });

  it('the plugin and rule counts stay rendered from the stats loader', () => {
    const page = read('src/app/(home)/page.tsx');
    expect(page).toContain(
      '<StatCard value={stats.plugins} label="Plugins" />',
    );
    expect(page).toContain(
      '<StatCard value={stats.rules} label="Rules" suffix="+" />',
    );
  });
});
