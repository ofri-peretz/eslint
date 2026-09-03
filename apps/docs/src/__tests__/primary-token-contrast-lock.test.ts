/**
 * AAA contrast lock for the light-mode primary token.
 *
 * `--color-fd-primary` was chosen for its contrast **on white**, and the
 * comment beside it said so — 8.8:1, correct, and the wrong background. The
 * token is also painted as text on a tint of itself: fumadocs 16.14.5
 * restyled the active sidebar link that way, and `color-contrast-enhanced`
 * measured 6.57:1 there. AAA wants 7. The token missed by four hundredths on
 * a background nobody had checked it against.
 *
 * The Playwright axe run catches this, but only after a full build, and only
 * on a page that happens to render an active sidebar link. This pins the same
 * invariant as a unit test so a token edit fails in seconds.
 *
 * ON THE TINT CONSTANT: #e5deda is the composite axe REPORTED, not one this
 * test derives. Compositing 10% of the primary over white gives #f2… — the
 * real value is darker, so more than one layer contributes and the exact
 * stack is fumadocs'. Pinning the measured value keeps the lock honest: it
 * guards the token against the background we have actually observed, and if
 * fumadocs restacks those layers the axe run is what catches it.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const GLOBAL_CSS = join(__dirname, '..', 'app', 'global.css');

/** WCAG 2 AAA, normal-size text. */
const AAA = 7;

const WHITE: RGB = [255, 255, 255];
/** The active sidebar link's background, as measured by axe. */
const ACTIVE_LINK_TINT: RGB = [0xe5, 0xde, 0xda];

type RGB = [number, number, number];

function hslToRgb(h: number, s: number, l: number): RGB {
  const sN = s / 100;
  const lN = l / 100;
  const a = sN * Math.min(lN, 1 - lN);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return lN - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
  };
  return [f(0), f(8), f(4)].map((x) => Math.round(x * 255)) as RGB;
}

/** WCAG relative luminance. */
function luminance([r, g, b]: RGB): number {
  const [rl, gl, bl] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

function contrast(a: RGB, b: RGB): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Read a token from the `:root` block only. Dark mode redefines the same
 * names further down the file with a light value that is correct there and
 * would sail through these assertions if it leaked in.
 */
function lightModeToken(css: string, name: string): RGB {
  const root = /:root\s*\{([\s\S]*?)\}/.exec(css);
  expect(root, ':root block not found in global.css').toBeTruthy();
  const decl = new RegExp(
    `${name}:\\s*hsl\\(\\s*([\\d.]+)\\s*,\\s*([\\d.]+)%\\s*,\\s*([\\d.]+)%\\s*\\)`,
  ).exec(root![1]);
  expect(decl, `${name} not found as an hsl() literal in :root`).toBeTruthy();
  return hslToRgb(Number(decl![1]), Number(decl![2]), Number(decl![3]));
}

describe('light-mode primary token clears AAA on both its backgrounds', () => {
  const css = readFileSync(GLOBAL_CSS, 'utf8');

  for (const name of ['--color-fd-primary', '--primary']) {
    describe(name, () => {
      it('clears AAA as text on white', () => {
        expect(contrast(lightModeToken(css, name), WHITE)).toBeGreaterThanOrEqual(AAA);
      });

      it('clears AAA as text on the active sidebar link tint', () => {
        expect(
          contrast(lightModeToken(css, name), ACTIVE_LINK_TINT),
        ).toBeGreaterThanOrEqual(AAA);
      });
    });
  }

  it('keeps the two primary tokens identical, as their comments claim', () => {
    expect(lightModeToken(css, '--primary')).toEqual(
      lightModeToken(css, '--color-fd-primary'),
    );
  });
});

describe('the contrast maths itself', () => {
  it('agrees with the reference ratio for black on white', () => {
    expect(contrast([0, 0, 0], WHITE)).toBeCloseTo(21, 5);
  });

  it('scores an identical pair as 1:1', () => {
    expect(contrast(WHITE, WHITE)).toBeCloseTo(1, 5);
  });

  it('fails the pre-fix token, so this lock would have caught the regression', () => {
    // hsl(22 82% 27%) — what shipped before, and what axe measured at 6.57.
    expect(contrast(hslToRgb(22, 82, 27), ACTIVE_LINK_TINT)).toBeLessThan(AAA);
  });
});
