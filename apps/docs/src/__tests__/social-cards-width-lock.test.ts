/**
 * Width lock for the homepage social-proof cards + a ban on the
 * spacing-shadowed max-w-* utilities that collapsed them.
 *
 * Regression 2026-07-31: the DS foundation (`@interlace/ui/styles/
 * foundation.css`) defines `--spacing-sm/md/lg/xl/2xl`. In Tailwind v4
 * a spacing token named `lg` SHADOWS `--container-lg`, so `max-w-lg`
 * silently became 40px (= --spacing-lg) instead of 32rem — the homepage
 * tweet card rendered ~50px wide and thousands of px tall in
 * production. `max-w-md` → 24px, `max-w-xl` → 64px, `max-w-2xl` → 96px.
 *
 * Fix: every rendered surface uses explicit arbitrary values
 * (`max-w-[32rem]`) instead of the shadowed names, and the card outer
 * wrappers carry `w-full` so they can't shrink-wrap inside flex cells.
 */
import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const APP_ROOT = path.resolve(__dirname, '../..');
const MARKETING = path.join(APP_ROOT, '.interlace/components/marketing');

function read(file: string): string {
  return fs.readFileSync(path.join(MARKETING, file), 'utf-8');
}

function tsxFilesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...tsxFilesUnder(full));
    else if (entry.name.endsWith('.tsx')) out.push(full);
  }
  return out;
}

describe('social-proof card width lock', () => {
  it('TweetCard outer wrapper keeps w-full + an explicit max width', () => {
    const src = read('tweet-card.tsx');
    expect(src).toMatch(
      /className="block group cursor-pointer w-full max-w-\[32rem\]"/,
    );
  });

  it('DevToCard outer anchor keeps w-full + an explicit max width', () => {
    const src = read('devto-card.tsx');
    expect(src).toMatch(
      /className="group block h-full w-full max-w-\[32rem\]"/,
    );
  });

  it('DevToCardSkeleton keeps w-full + an explicit max width', () => {
    const src = read('devto-card.tsx');
    expect(src).toMatch(/w-full max-w-\[32rem\] animate-pulse/);
  });
});

describe('spacing-shadowed max-w-* utilities are banned', () => {
  // These resolve to --spacing-* (24px–96px), not container widths, as
  // long as the DS foundation names spacing steps sm/md/lg/xl/2xl.
  // Use max-w-[24rem|28rem|32rem|36rem|42rem] instead.
  const BANNED = /max-w-(?:sm|md|lg|xl|2xl)(?![-\w[])/;

  const dirs = [
    path.join(APP_ROOT, 'src/components'),
    path.join(APP_ROOT, 'src/app'),
    path.join(APP_ROOT, '.interlace/components'),
  ];

  for (const dir of dirs) {
    it(`${path.relative(APP_ROOT, dir)} has no shadowed max-w-* names`, () => {
      const offenders: string[] = [];
      for (const file of tsxFilesUnder(dir)) {
        const src = fs.readFileSync(file, 'utf-8');
        if (BANNED.test(src)) {
          offenders.push(path.relative(APP_ROOT, file));
        }
      }
      expect(
        offenders,
        `shadowed max-w-* found (renders as 24-96px, not a container width): ${offenders.join(', ')}`,
      ).toHaveLength(0);
    });
  }
});
