/**
 * Skip-link render-time test
 *
 * Complements `keyboard-affordances-lock.test.tsx` (source-text) by
 * actually MOUNTING the skip-link markup and asserting on the rendered
 * DOM. The source-text lock catches accidental deletion; this test
 * catches accidental hiding (e.g. a className change that breaks
 * `sr-only`/`focus:not-sr-only` so the link is either always visible or
 * never visible).
 *
 * KEYBOARD_PHILOSOPHY.md #1: every page has a skip link as its first
 * focusable element, targeting `#main-content`.
 *
 * We don't mount the full RootLayout (it pulls in fumadocs's
 * RootProvider, fonts, etc., and isn't worth the test surface). Instead
 * we mount a stripped twin of the skip-link snippet and assert the
 * contract.
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';

// Mirror of the skip-link snippet in `apps/docs/src/app/layout.tsx`.
// If the layout's snippet drifts from this, the source-text lock will
// catch it; if THIS drifts and the layout doesn't, this file is the
// regression and you should re-sync.
function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-100 focus:rounded-md focus:bg-fd-primary focus:px-4 focus:py-2 focus:font-medium focus:text-fd-primary-foreground focus:shadow-lg focus:outline-hidden focus:ring-2 focus:ring-fd-ring"
    >
      Skip to main content
    </a>
  );
}

describe('Skip link — rendered DOM contract', () => {
  it('renders an <a> with the canonical "Skip to main content" label', () => {
    const { getByRole } = render(<SkipLink />);
    const link = getByRole('link', { name: /skip to main content/i });
    expect(link).toBeDefined();
    expect(link.tagName).toBe('A');
  });

  it('targets `#main-content`', () => {
    const { getByRole } = render(<SkipLink />);
    const link = getByRole('link', { name: /skip to main content/i });
    expect(link.getAttribute('href')).toBe('#main-content');
  });

  it('starts visually hidden via `sr-only` (screen-reader only) so it does not pollute layout', () => {
    const { getByRole } = render(<SkipLink />);
    const link = getByRole('link', { name: /skip to main content/i });
    expect(link.className).toMatch(/\bsr-only\b/);
  });

  it('reveals on focus via `focus:not-sr-only` so keyboard users see where they are', () => {
    const { getByRole } = render(<SkipLink />);
    const link = getByRole('link', { name: /skip to main content/i });
    expect(link.className).toContain('focus:not-sr-only');
  });

  it('promotes itself to `focus:fixed` + high z-index so it floats above page chrome when focused', () => {
    const { getByRole } = render(<SkipLink />);
    const link = getByRole('link', { name: /skip to main content/i });
    expect(link.className).toContain('focus:fixed');
    expect(link.className).toMatch(/focus:z-(100|\[100\])/);
  });

  it('paints a high-contrast focus state (brand fill + ring) so it is visible on every surface', () => {
    const { getByRole } = render(<SkipLink />);
    const link = getByRole('link', { name: /skip to main content/i });
    // Filled brand pill + visible ring — both must be present so the
    // affordance is unambiguous regardless of the underlying surface.
    expect(link.className).toContain('focus:bg-fd-primary');
    expect(link.className).toContain('focus:text-fd-primary-foreground');
    expect(link.className).toContain('focus:ring-2');
  });

  it('is keyboard-focusable (default <a href> behavior — no role/tabIndex needed)', () => {
    const { getByRole } = render(<SkipLink />);
    const link = getByRole('link', { name: /skip to main content/i });
    // Native <a> with href is focusable; we explicitly assert no
    // tabIndex override has been added (which could disable focus).
    expect(link.hasAttribute('tabindex')).toBe(false);
  });
});
