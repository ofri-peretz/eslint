/**
 * Tailwind-emitted CSS lock.
 *
 * Regression guard for the silent failure mode where a misconfigured
 * `@source` directive in `.storybook/preview.css` (or a missing CSS
 * import like `tw-animate-css`) causes Tailwind v4 to drop every
 * utility class referenced only from `packages/ui/src/**`. The build
 * succeeds; the emitted CSS is a tiny subset; primitives render as
 * unstyled DOM.
 *
 * The bug that triggered this lock (May 2026): `@source` pointed to
 * `../../../../packages/ui/src` (4 `..`) when 3 was correct from
 * `.storybook/preview.css`. Avatar rendered as a 500px purple SVG
 * fallback because `size-8`, `shrink-0`, `aspect-square`, `size-full`,
 * etc. were missing. Dialog overlay was transparent because
 * `bg-black/50` was missing. No transitions because `tw-animate-css`
 * was never imported.
 *
 * Run: `npm run build-storybook` first, then `npm test` in this
 * workspace. The lock reads the single emitted iframe stylesheet.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const STATIC_DIR = join(__dirname, '../../storybook-static/assets');

const REQUIRED_UTILITIES = [
  // Sizing — Avatar root + image + fallback, Button icon sizes
  'size-8',
  'size-9',
  'size-10',
  'size-full',
  'shrink-0',
  'aspect-square',
  // Overlay + Dialog positioning (Base UI portals)
  'fixed',
  'inset-0',
  'z-50',
  // Backdrop (escaped slash in CSS)
  'bg-black\\/50',
  // tw-animate-css data-state animations (Dialog / Popover / DropdownMenu)
  'animate-in',
  'animate-out',
  'fade-in-0',
  'fade-out-0',
  'zoom-in-95',
  'zoom-out-95',
];

const MIN_CSS_BYTES = 120_000;

const findIframeCss = (): string => {
  const files = readdirSync(STATIC_DIR).filter(
    (f) => f.startsWith('iframe-') && f.endsWith('.css'),
  );
  if (files.length !== 1) {
    throw new Error(
      `expected exactly one iframe-*.css in ${STATIC_DIR}, found ${files.length}: ${files.join(', ')}`,
    );
  }
  return join(STATIC_DIR, files[0]);
};

describe('Storybook Tailwind-emitted CSS', () => {
  it('emits a stylesheet large enough to contain the primitive utility surface', () => {
    const path = findIframeCss();
    const { size } = statSync(path);
    expect(size).toBeGreaterThan(MIN_CSS_BYTES);
  });

  it.each(REQUIRED_UTILITIES)(
    'emits the `%s` utility referenced by @interlace/ui primitives',
    (utility) => {
      const css = readFileSync(findIframeCss(), 'utf8');
      // Tailwind v4 emits utilities either as bare selectors (`.size-8{...}`)
      // or as variant-prefixed selectors (`.data-\[open\]\:zoom-in-95[data-...]{...}`).
      // Match the literal class-name token in a selector context.
      const escaped = utility.replace(/[\\[\](){}.+?^$|*]/g, '\\$&');
      const pattern = new RegExp(`[\\\\:.]${escaped}(?:[\\s,{:>~+\\[]|\\\\)`);
      expect(css, `missing \`${utility}\` in emitted CSS`).toMatch(pattern);
    },
  );
});
